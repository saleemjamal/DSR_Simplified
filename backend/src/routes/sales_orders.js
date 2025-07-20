const express = require('express')
const { supabase } = require('../config/supabase')
const { authenticateUser, requireRole } = require('../middleware/supabase')
const router = express.Router()

// =================================================================
// SALES ORDERS MANAGEMENT ROUTES
// =================================================================

// GET /api/v1/sales-orders - Get all sales orders with filtering
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
      .from('sales_orders')
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
      .order('order_date', { ascending: false })

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    if (start_date) {
      query = query.gte('order_date', start_date)
    }

    if (end_date) {
      query = query.lte('order_date', end_date)
    }

    // Store filtering for multi-store users
    if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      if (store_id) {
        query = query.eq('store_id', store_id)
      }
    } else {
      // Regular users only see their store's orders
      query = query.eq('store_id', req.user.store_id)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch sales orders' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching sales orders:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/sales-orders/:id - Get specific sales order
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params

    let query = supabase
      .from('sales_orders')
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
        ),
        deposits!deposits_reference_id_fkey (
          id,
          deposit_date,
          amount,
          payment_method,
          notes
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
        return res.status(404).json({ error: 'Sales order not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch sales order' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching sales order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/sales-orders - Create new sales order
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      customer_id,
      items_description,
      total_estimated_amount,
      advance_paid = 0,
      notes,
      store_id
    } = req.body

    // Validation
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' })
    }

    if (!items_description || items_description.trim() === '') {
      return res.status(400).json({ error: 'Items description is required' })
    }

    if (!total_estimated_amount || total_estimated_amount <= 0) {
      return res.status(400).json({ error: 'Valid estimated amount is required' })
    }

    if (advance_paid < 0) {
      return res.status(400).json({ error: 'Advance amount cannot be negative' })
    }

    if (advance_paid > total_estimated_amount) {
      return res.status(400).json({ error: 'Advance cannot exceed total estimated amount' })
    }

    // Determine store_id
    let targetStoreId = store_id
    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      targetStoreId = req.user.store_id
    } else if (!targetStoreId) {
      return res.status(400).json({ error: 'Store selection is required' })
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, customer_name')
      .eq('id', customer_id)
      .single()

    if (customerError) {
      return res.status(400).json({ error: 'Invalid customer' })
    }

    // Generate order number (SO-YYYYMMDD-XXXX format)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    
    // Get count of orders today for this store to generate sequence
    const { data: todayOrders, error: countError } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('store_id', targetStoreId)
      .gte('order_date', new Date().toISOString().split('T')[0])

    if (countError) {
      console.error('Error counting today orders:', countError)
      return res.status(500).json({ error: 'Failed to generate order number' })
    }

    const sequence = String(todayOrders.length + 1).padStart(4, '0')
    const orderNumber = `SO-${today}-${sequence}`

    const orderData = {
      store_id: targetStoreId,
      order_number: orderNumber,
      customer_id,
      order_date: new Date().toISOString().split('T')[0],
      items_description: items_description.trim(),
      total_estimated_amount: parseFloat(total_estimated_amount),
      advance_paid: parseFloat(advance_paid) || 0,
      status: 'pending',
      notes: notes?.trim() || null,
      created_by: req.user.id
    }

    const { data, error } = await supabase
      .from('sales_orders')
      .insert([orderData])
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
        return res.status(400).json({ error: 'Order number already exists' })
      }
      return res.status(500).json({ error: 'Failed to create sales order' })
    }

    // If advance payment made, create deposit record
    if (advance_paid > 0) {
      const depositData = {
        store_id: targetStoreId,
        deposit_date: new Date().toISOString().split('T')[0],
        deposit_type: 'sales_order',
        reference_id: data.id,
        reference_type: 'sales_order',
        amount: advance_paid,
        payment_method: 'cash', // Default, can be updated later
        customer_id: customer_id,
        processed_by: req.user.id,
        notes: `Advance payment for order ${orderNumber}`
      }

      const { error: depositError } = await supabase
        .from('deposits')
        .insert([depositData])

      if (depositError) {
        console.error('Error creating deposit record:', depositError)
        // Don't fail the order creation, just log the error
      }
    }

    res.status(201).json({
      message: 'Sales order created successfully',
      data
    })
  } catch (error) {
    console.error('Error creating sales order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/sales-orders/:id - Update sales order
router.patch('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    delete updates.id
    delete updates.order_number
    delete updates.created_at
    delete updates.created_by
    delete updates.store_id

    // Verify order exists and user has access
    let checkQuery = supabase
      .from('sales_orders')
      .select('id, status, store_id')
      .eq('id', id)

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingOrder, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Sales order not found' })
      }
      return res.status(500).json({ error: 'Failed to verify order' })
    }

    // Don't allow updates to converted orders (except by authorized users)
    if (existingOrder.status === 'converted' && req.user.role === 'cashier') {
      return res.status(403).json({ error: 'Cannot modify converted orders' })
    }

    // Validate total_estimated_amount if being updated
    if (updates.total_estimated_amount && updates.total_estimated_amount <= 0) {
      return res.status(400).json({ error: 'Valid estimated amount is required' })
    }

    // Validate advance_paid if being updated
    if (updates.advance_paid !== undefined) {
      if (updates.advance_paid < 0) {
        return res.status(400).json({ error: 'Advance amount cannot be negative' })
      }
      
      if (updates.total_estimated_amount && updates.advance_paid > updates.total_estimated_amount) {
        return res.status(400).json({ error: 'Advance cannot exceed total estimated amount' })
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('sales_orders')
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
      return res.status(500).json({ error: 'Failed to update sales order' })
    }

    res.json({
      message: 'Sales order updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating sales order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/sales-orders/:id/convert - Mark order as converted in ERP
router.patch('/:id/convert', authenticateUser, requireRole(['store_manager', 'super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const { erp_sale_bill_number, notes } = req.body

    if (!erp_sale_bill_number || erp_sale_bill_number.trim() === '') {
      return res.status(400).json({ error: 'ERP sale bill number is required' })
    }

    // Verify order exists and is pending
    let checkQuery = supabase
      .from('sales_orders')
      .select('id, status, store_id, order_number')
      .eq('id', id)
      .eq('status', 'pending')

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingOrder, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Sales order not found or already converted' })
      }
      return res.status(500).json({ error: 'Failed to verify order' })
    }

    const updateData = {
      status: 'converted',
      erp_conversion_date: new Date().toISOString().split('T')[0],
      erp_sale_bill_number: erp_sale_bill_number.trim(),
      converted_by: req.user.id,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('sales_orders')
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
      return res.status(500).json({ error: 'Failed to convert sales order' })
    }

    res.json({
      message: 'Sales order marked as converted successfully',
      data
    })
  } catch (error) {
    console.error('Error converting sales order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/sales-orders/:id/cancel - Cancel sales order
router.patch('/:id/cancel', authenticateUser, requireRole(['store_manager', 'super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    // Verify order exists and is pending
    let checkQuery = supabase
      .from('sales_orders')
      .select('id, status, store_id, advance_paid')
      .eq('id', id)
      .eq('status', 'pending')

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingOrder, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Sales order not found or cannot be cancelled' })
      }
      return res.status(500).json({ error: 'Failed to verify order' })
    }

    const updateData = {
      status: 'cancelled',
      notes: reason?.trim() || 'Order cancelled',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('sales_orders')
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
      return res.status(500).json({ error: 'Failed to cancel sales order' })
    }

    // TODO: Handle advance payment refund logic if needed
    if (existingOrder.advance_paid > 0) {
      // This could create a return record or adjust customer credit
      console.log(`Note: Order ${id} had advance payment of ${existingOrder.advance_paid} that may need refund processing`)
    }

    res.json({
      message: 'Sales order cancelled successfully',
      data
    })
  } catch (error) {
    console.error('Error cancelling sales order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/sales-orders/stats/summary - Get sales orders summary
router.get('/stats/summary', authenticateUser, async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query

    let query = supabase
      .from('sales_orders')
      .select('status, total_estimated_amount, advance_paid')

    // Apply date filters
    if (start_date) {
      query = query.gte('order_date', start_date)
    }
    
    if (end_date) {
      query = query.lte('order_date', end_date)
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
      total_orders: data.length,
      pending_orders: data.filter(o => o.status === 'pending').length,
      converted_orders: data.filter(o => o.status === 'converted').length,
      cancelled_orders: data.filter(o => o.status === 'cancelled').length,
      total_estimated_value: data.reduce((sum, o) => sum + o.total_estimated_amount, 0),
      total_advances_received: data.reduce((sum, o) => sum + o.advance_paid, 0),
      pending_value: data.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total_estimated_amount, 0),
      converted_value: data.filter(o => o.status === 'converted').reduce((sum, o) => sum + o.total_estimated_amount, 0)
    }

    res.json(summary)
  } catch (error) {
    console.error('Error fetching sales orders summary:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router