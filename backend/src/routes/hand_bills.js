const express = require('express')
const { supabase } = require('../config/supabase')
const { authenticateUser, requireRole } = require('../middleware/supabase')
const router = express.Router()

// =================================================================
// HAND BILLS MANAGEMENT ROUTES
// =================================================================

// GET /api/v1/hand-bills - Get all hand bills with filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { 
      status = 'all',
      customer_id,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      store_id
    } = req.query
    
    const offset = (page - 1) * limit

    let query = supabase
      .from('hand_bills')
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email
        ),
        stores (
          store_code,
          store_name
        )
      `)
      .order('sale_date', { ascending: false })

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    if (start_date) {
      query = query.gte('sale_date', start_date)
    }

    if (end_date) {
      query = query.lte('sale_date', end_date)
    }

    // Store filtering for multi-store users
    if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      if (store_id) {
        query = query.eq('store_id', store_id)
      }
    } else {
      // Regular users only see their store's hand bills
      query = query.eq('store_id', req.user.store_id)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch hand bills' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching hand bills:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/hand-bills/:id - Get specific hand bill
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params

    let query = supabase
      .from('hand_bills')
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email,
          total_outstanding,
          credit_limit
        ),
        stores (
          store_code,
          store_name
        )
      `)
      .eq('id', id)

    // Store access control
    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      query = query.eq('store_id', req.user.store_id)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Hand bill not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch hand bill' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching hand bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/hand-bills - Create new hand bill
// Note: Only store managers and above can create hand bills (not accounts_incharge)
router.post('/', authenticateUser, requireRole(['store_manager', 'super_user', 'cashier']), async (req, res) => {
  try {
    const {
      customer_id,
      amount,
      items_description,
      original_image_url,
      notes,
      store_id
    } = req.body

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    // Determine store_id
    let targetStoreId = store_id
    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      targetStoreId = req.user.store_id
    } else if (!targetStoreId) {
      return res.status(400).json({ error: 'Store selection is required' })
    }

    // Verify customer exists if provided
    if (customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, customer_name')
        .eq('id', customer_id)
        .single()

      if (customerError) {
        return res.status(400).json({ error: 'Invalid customer' })
      }
    }

    // Generate hand bill number (HB-YYYYMMDD-XXXX format)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    
    // Get count of hand bills today for this store to generate sequence
    const { data: todayBills, error: countError } = await supabase
      .from('hand_bills')
      .select('id')
      .eq('store_id', targetStoreId)
      .gte('sale_date', new Date().toISOString().split('T')[0])

    if (countError) {
      console.error('Error counting today hand bills:', countError)
      return res.status(500).json({ error: 'Failed to generate hand bill number' })
    }

    const sequence = String(todayBills.length + 1).padStart(4, '0')
    const handBillNumber = `HB-${today}-${sequence}`

    const handBillData = {
      store_id: targetStoreId,
      hand_bill_number: handBillNumber,
      sale_date: new Date().toISOString().split('T')[0],
      customer_id: customer_id || null,
      amount: parseFloat(amount),
      items_description: items_description?.trim() || null,
      original_image_url: original_image_url?.trim() || null,
      status: 'pending',
      notes: notes?.trim() || null,
      created_by: req.user.id
    }

    const { data, error } = await supabase
      .from('hand_bills')
      .insert([handBillData])
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Hand bill number already exists' })
      }
      return res.status(500).json({ error: 'Failed to create hand bill' })
    }

    res.status(201).json({
      message: 'Hand bill created successfully',
      data
    })
  } catch (error) {
    console.error('Error creating hand bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/hand-bills/:id - Update hand bill
router.patch('/:id', authenticateUser, requireRole(['store_manager', 'super_user', 'cashier']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    delete updates.id
    delete updates.hand_bill_number
    delete updates.created_at
    delete updates.created_by
    delete updates.store_id

    // Verify hand bill exists and user has access
    let checkQuery = supabase
      .from('hand_bills')
      .select('id, status, store_id')
      .eq('id', id)

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingBill, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Hand bill not found' })
      }
      return res.status(500).json({ error: 'Failed to verify hand bill' })
    }

    // Don't allow updates to converted hand bills (except by authorized users)
    if (existingBill.status === 'converted' && req.user.role === 'cashier') {
      return res.status(403).json({ error: 'Cannot modify converted hand bills' })
    }

    // Validate amount if being updated
    if (updates.amount && updates.amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('hand_bills')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to update hand bill' })
    }

    res.json({
      message: 'Hand bill updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating hand bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/hand-bills/:id/convert - Mark hand bill as converted in ERP
router.patch('/:id/convert', authenticateUser, requireRole(['store_manager', 'super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const { erp_sale_bill_number, sale_bill_image_url, notes } = req.body

    if (!erp_sale_bill_number || erp_sale_bill_number.trim() === '') {
      return res.status(400).json({ error: 'ERP sale bill number is required' })
    }

    // Verify hand bill exists and is pending
    let checkQuery = supabase
      .from('hand_bills')
      .select('id, status, store_id, hand_bill_number')
      .eq('id', id)
      .eq('status', 'pending')

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingBill, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Hand bill not found or already converted' })
      }
      return res.status(500).json({ error: 'Failed to verify hand bill' })
    }

    const updateData = {
      status: 'converted',
      conversion_date: new Date().toISOString().split('T')[0],
      erp_sale_bill_number: erp_sale_bill_number.trim(),
      sale_bill_image_url: sale_bill_image_url?.trim() || null,
      converted_by: req.user.id,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('hand_bills')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to convert hand bill' })
    }

    res.json({
      message: 'Hand bill marked as converted successfully',
      data
    })
  } catch (error) {
    console.error('Error converting hand bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/hand-bills/:id/cancel - Cancel hand bill
router.patch('/:id/cancel', authenticateUser, requireRole(['store_manager', 'super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    // Verify hand bill exists and is pending
    let checkQuery = supabase
      .from('hand_bills')
      .select('id, status, store_id')
      .eq('id', id)
      .eq('status', 'pending')

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingBill, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Hand bill not found or cannot be cancelled' })
      }
      return res.status(500).json({ error: 'Failed to verify hand bill' })
    }

    const updateData = {
      status: 'cancelled',
      notes: reason?.trim() || 'Hand bill cancelled',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('hand_bills')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to cancel hand bill' })
    }

    res.json({
      message: 'Hand bill cancelled successfully',
      data
    })
  } catch (error) {
    console.error('Error cancelling hand bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/hand-bills/:id/upload-image - Upload image for hand bill
router.post('/:id/upload-image', authenticateUser, requireRole(['store_manager', 'super_user', 'cashier']), async (req, res) => {
  try {
    const { id } = req.params
    const { image_url, image_type = 'original' } = req.body

    if (!image_url || image_url.trim() === '') {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    if (!['original', 'sale_bill'].includes(image_type)) {
      return res.status(400).json({ error: 'Image type must be "original" or "sale_bill"' })
    }

    // Verify hand bill exists and user has access
    let checkQuery = supabase
      .from('hand_bills')
      .select('id, status, store_id')
      .eq('id', id)

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingBill, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Hand bill not found' })
      }
      return res.status(500).json({ error: 'Failed to verify hand bill' })
    }

    // Determine which field to update
    const updateField = image_type === 'original' ? 'original_image_url' : 'sale_bill_image_url'
    
    const updateData = {
      [updateField]: image_url.trim(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('hand_bills')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customers (
          customer_name,
          customer_phone,
          customer_email
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to upload image' })
    }

    res.json({
      message: `${image_type === 'original' ? 'Original' : 'Sale bill'} image uploaded successfully`,
      data
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/hand-bills/stats/summary - Get hand bills summary
router.get('/stats/summary', authenticateUser, async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query

    let query = supabase
      .from('hand_bills')
      .select('status, amount')

    // Apply date filters
    if (start_date) {
      query = query.gte('sale_date', start_date)
    }
    
    if (end_date) {
      query = query.lte('sale_date', end_date)
    }

    // Store filtering
    if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      if (store_id) {
        query = query.eq('store_id', store_id)
      }
    } else {
      query = query.eq('store_id', req.user.store_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch summary' })
    }

    // Calculate summary statistics
    const summary = {
      total_hand_bills: data.length,
      pending_hand_bills: data.filter(h => h.status === 'pending').length,
      converted_hand_bills: data.filter(h => h.status === 'converted').length,
      cancelled_hand_bills: data.filter(h => h.status === 'cancelled').length,
      total_amount: data.reduce((sum, h) => sum + h.amount, 0),
      pending_amount: data.filter(h => h.status === 'pending').reduce((sum, h) => sum + h.amount, 0),
      converted_amount: data.filter(h => h.status === 'converted').reduce((sum, h) => sum + h.amount, 0),
      cancelled_amount: data.filter(h => h.status === 'cancelled').reduce((sum, h) => sum + h.amount, 0)
    }

    res.json(summary)
  } catch (error) {
    console.error('Error fetching hand bills summary:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router