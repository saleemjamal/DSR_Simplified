const express = require('express')
const { supabase } = require('../config/supabase')
const { authenticateUser, requireRole } = require('../middleware/supabase')
const router = express.Router()

// =================================================================
// RETURNS (RRN) MANAGEMENT ROUTES
// =================================================================

// GET /api/v1/returns - Get all returns with filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { 
      customer_id,
      start_date,
      end_date,
      payment_method,
      page = 1,
      limit = 50,
      store_id
    } = req.query
    
    const offset = (page - 1) * limit

    let query = supabase
      .from('returns')
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
      .order('return_date', { ascending: false })

    // Apply filters
    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    if (payment_method) {
      query = query.eq('payment_method', payment_method)
    }

    if (start_date) {
      query = query.gte('return_date', start_date)
    }

    if (end_date) {
      query = query.lte('return_date', end_date)
    }

    // Store filtering for multi-store users
    if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      if (store_id) {
        query = query.eq('store_id', store_id)
      }
    } else {
      // Regular users only see their store's returns
      query = query.eq('store_id', req.user.store_id)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch returns' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching returns:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/returns/:id - Get specific return
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params

    let query = supabase
      .from('returns')
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
        return res.status(404).json({ error: 'Return not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch return' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching return:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/returns - Create new return (RRN)
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      customer_id,
      return_amount,
      return_reason,
      original_bill_reference,
      payment_method,
      notes,
      store_id
    } = req.body

    // Validation
    if (!return_amount || return_amount <= 0) {
      return res.status(400).json({ error: 'Valid return amount is required' })
    }

    if (!return_reason || return_reason.trim() === '') {
      return res.status(400).json({ error: 'Return reason is required' })
    }

    if (payment_method && !['cash', 'credit_card', 'upi', 'store_credit'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' })
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

    const returnData = {
      store_id: targetStoreId,
      return_date: new Date().toISOString().split('T')[0],
      customer_id: customer_id || null,
      return_amount: parseFloat(return_amount),
      return_reason: return_reason.trim(),
      original_bill_reference: original_bill_reference?.trim() || null,
      payment_method: payment_method || null,
      processed_by: req.user.id,
      notes: notes?.trim() || null
    }

    const { data, error } = await supabase
      .from('returns')
      .insert([returnData])
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
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to create return' })
    }

    // If customer is provided and payment method is store_credit, 
    // we could update customer's outstanding balance or create a credit note
    // This would be implemented based on business requirements

    res.status(201).json({
      message: 'Return created successfully',
      data
    })
  } catch (error) {
    console.error('Error creating return:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/returns/:id - Update return
router.patch('/:id', authenticateUser, requireRole(['store_manager', 'super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    delete updates.id
    delete updates.created_at
    delete updates.processed_by
    delete updates.store_id

    // Verify return exists and user has access
    let checkQuery = supabase
      .from('returns')
      .select('id, store_id')
      .eq('id', id)

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingReturn, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Return not found' })
      }
      return res.status(500).json({ error: 'Failed to verify return' })
    }

    // Validate return_amount if being updated
    if (updates.return_amount !== undefined && updates.return_amount <= 0) {
      return res.status(400).json({ error: 'Valid return amount is required' })
    }

    // Validate payment_method if being updated
    if (updates.payment_method && !['cash', 'credit_card', 'upi', 'store_credit'].includes(updates.payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' })
    }

    // Validate return_reason if being updated
    if (updates.return_reason !== undefined && (!updates.return_reason || updates.return_reason.trim() === '')) {
      return res.status(400).json({ error: 'Return reason is required' })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('returns')
      .update(updates)
      .eq('id', id)
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
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to update return' })
    }

    res.json({
      message: 'Return updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating return:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/v1/returns/:id - Delete return (admin only)
router.delete('/:id', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params

    // Verify return exists
    const { data: existingReturn, error: fetchError } = await supabase
      .from('returns')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Return not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch return' })
    }

    // Delete the return
    const { error } = await supabase
      .from('returns')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to delete return' })
    }

    res.json({
      message: 'Return deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting return:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/returns/stats/summary - Get returns summary
router.get('/stats/summary', authenticateUser, async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query

    let query = supabase
      .from('returns')
      .select('payment_method, return_amount')

    // Apply date filters
    if (start_date) {
      query = query.gte('return_date', start_date)
    }
    
    if (end_date) {
      query = query.lte('return_date', end_date)
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
      total_returns: data.length,
      total_amount: data.reduce((sum, r) => sum + r.return_amount, 0),
      by_payment_method: {
        cash: data.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + r.return_amount, 0),
        credit_card: data.filter(r => r.payment_method === 'credit_card').reduce((sum, r) => sum + r.return_amount, 0),
        upi: data.filter(r => r.payment_method === 'upi').reduce((sum, r) => sum + r.return_amount, 0),
        store_credit: data.filter(r => r.payment_method === 'store_credit').reduce((sum, r) => sum + r.return_amount, 0),
        other: data.filter(r => !r.payment_method || r.payment_method === '').reduce((sum, r) => sum + r.return_amount, 0)
      }
    }

    res.json(summary)
  } catch (error) {
    console.error('Error fetching returns summary:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/returns/daily-report - Get daily returns report for cash reconciliation
router.get('/daily-report', authenticateUser, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], store_id } = req.query

    let query = supabase
      .from('returns')
      .select(`
        id,
        return_amount,
        payment_method,
        return_reason,
        original_bill_reference,
        customers (
          customer_name,
          customer_phone
        )
      `)
      .eq('return_date', date)

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
      return res.status(500).json({ error: 'Failed to fetch daily returns report' })
    }

    // Group by payment method for cash reconciliation
    const report = {
      date,
      total_returns: data.length,
      total_amount: data.reduce((sum, r) => sum + r.return_amount, 0),
      cash_returns: data.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + r.return_amount, 0),
      card_returns: data.filter(r => r.payment_method === 'credit_card').reduce((sum, r) => sum + r.return_amount, 0),
      upi_returns: data.filter(r => r.payment_method === 'upi').reduce((sum, r) => sum + r.return_amount, 0),
      store_credit_returns: data.filter(r => r.payment_method === 'store_credit').reduce((sum, r) => sum + r.return_amount, 0),
      returns: data
    }

    res.json(report)
  } catch (error) {
    console.error('Error fetching daily returns report:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/returns/search/bill/:billRef - Search returns by original bill reference
router.get('/search/bill/:billRef', authenticateUser, async (req, res) => {
  try {
    const { billRef } = req.params

    let query = supabase
      .from('returns')
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
      .ilike('original_bill_reference', `%${billRef}%`)
      .order('return_date', { ascending: false })

    // Store filtering
    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      query = query.eq('store_id', req.user.store_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to search returns' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error searching returns:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router