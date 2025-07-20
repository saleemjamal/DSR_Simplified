const express = require('express')
const { supabase } = require('../config/supabase')
const { authenticateUser, requireRole } = require('../middleware/supabase')
const router = express.Router()

// =================================================================
// DEPOSITS MANAGEMENT ROUTES
// =================================================================

// GET /api/v1/deposits - Get all deposits with filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { 
      deposit_type = 'all',
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
      .from('deposits')
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
      .order('deposit_date', { ascending: false })

    // Apply filters
    if (deposit_type !== 'all') {
      query = query.eq('deposit_type', deposit_type)
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    if (payment_method) {
      query = query.eq('payment_method', payment_method)
    }

    if (start_date) {
      query = query.gte('deposit_date', start_date)
    }

    if (end_date) {
      query = query.lte('deposit_date', end_date)
    }

    // Store filtering for multi-store users
    if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      if (store_id) {
        query = query.eq('store_id', store_id)
      }
    } else {
      // Regular users only see their store's deposits
      query = query.eq('store_id', req.user.store_id)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch deposits' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching deposits:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/deposits/:id - Get specific deposit
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params

    let query = supabase
      .from('deposits')
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
        return res.status(404).json({ error: 'Deposit not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch deposit' })
    }

    // If deposit is linked to a sales order, get the order details
    if (data.reference_type === 'sales_order' && data.reference_id) {
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .select('order_number, total_estimated_amount, items_description, status')
        .eq('id', data.reference_id)
        .single()

      if (!orderError) {
        data.linked_sales_order = salesOrder
      }
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching deposit:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/deposits - Create new deposit
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      deposit_type,
      reference_id,
      reference_type,
      amount,
      payment_method,
      customer_id,
      notes,
      store_id
    } = req.body

    // Validation
    if (!deposit_type || !['sales_order', 'other'].includes(deposit_type)) {
      return res.status(400).json({ error: 'Valid deposit type is required (sales_order, other)' })
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    if (!payment_method || !['cash', 'credit_card', 'upi', 'bank_transfer'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment method is required' })
    }

    // For sales_order deposits, reference_id and customer_id are required
    if (deposit_type === 'sales_order') {
      if (!reference_id) {
        return res.status(400).json({ error: 'Reference ID is required for sales order deposits' })
      }
      if (!customer_id) {
        return res.status(400).json({ error: 'Customer is required for sales order deposits' })
      }
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

    // If linked to sales order, verify it exists and update advance_paid
    if (deposit_type === 'sales_order' && reference_id) {
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .select('id, advance_paid, total_estimated_amount, customer_id')
        .eq('id', reference_id)
        .single()

      if (orderError) {
        return res.status(400).json({ error: 'Invalid sales order reference' })
      }

      // Check if the new advance would exceed total estimated amount
      const newAdvanceTotal = salesOrder.advance_paid + parseFloat(amount)
      if (newAdvanceTotal > salesOrder.total_estimated_amount) {
        return res.status(400).json({ 
          error: `Total advance (${newAdvanceTotal}) would exceed order amount (${salesOrder.total_estimated_amount})` 
        })
      }

      // Ensure customer_id matches the sales order
      if (customer_id && customer_id !== salesOrder.customer_id) {
        return res.status(400).json({ error: 'Customer ID does not match sales order' })
      }
    }

    const depositData = {
      store_id: targetStoreId,
      deposit_date: new Date().toISOString().split('T')[0],
      deposit_type,
      reference_id: reference_id || null,
      reference_type: reference_type || null,
      amount: parseFloat(amount),
      payment_method,
      customer_id: customer_id || null,
      processed_by: req.user.id,
      notes: notes?.trim() || null
    }

    const { data, error } = await supabase
      .from('deposits')
      .insert([depositData])
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
      return res.status(500).json({ error: 'Failed to create deposit' })
    }

    // Update sales order advance_paid if applicable
    if (deposit_type === 'sales_order' && reference_id) {
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ 
          advance_paid: supabase.sql`advance_paid + ${parseFloat(amount)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', reference_id)

      if (updateError) {
        console.error('Error updating sales order advance:', updateError)
        // Don't fail the deposit creation, just log the error
      }
    }

    res.status(201).json({
      message: 'Deposit created successfully',
      data
    })
  } catch (error) {
    console.error('Error creating deposit:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/deposits/:id - Update deposit
router.patch('/:id', authenticateUser, requireRole(['store_manager', 'super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    delete updates.id
    delete updates.created_at
    delete updates.processed_by
    delete updates.store_id

    // Verify deposit exists and user has access
    let checkQuery = supabase
      .from('deposits')
      .select('id, store_id, amount, reference_id, reference_type, deposit_type')
      .eq('id', id)

    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      checkQuery = checkQuery.eq('store_id', req.user.store_id)
    }

    const { data: existingDeposit, error: checkError } = await checkQuery.single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Deposit not found' })
      }
      return res.status(500).json({ error: 'Failed to verify deposit' })
    }

    // Validate amount if being updated
    if (updates.amount !== undefined) {
      if (updates.amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' })
      }

      // If linked to sales order, check total advance doesn't exceed order amount
      if (existingDeposit.deposit_type === 'sales_order' && existingDeposit.reference_id) {
        const { data: salesOrder, error: orderError } = await supabase
          .from('sales_orders')
          .select('advance_paid, total_estimated_amount')
          .eq('id', existingDeposit.reference_id)
          .single()

        if (!orderError) {
          const otherAdvances = salesOrder.advance_paid - existingDeposit.amount
          const newAdvanceTotal = otherAdvances + parseFloat(updates.amount)
          
          if (newAdvanceTotal > salesOrder.total_estimated_amount) {
            return res.status(400).json({ 
              error: `Total advance (${newAdvanceTotal}) would exceed order amount (${salesOrder.total_estimated_amount})` 
            })
          }
        }
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('deposits')
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
      return res.status(500).json({ error: 'Failed to update deposit' })
    }

    // Update sales order advance_paid if amount changed and linked to sales order
    if (updates.amount !== undefined && existingDeposit.deposit_type === 'sales_order' && existingDeposit.reference_id) {
      const amountDifference = parseFloat(updates.amount) - existingDeposit.amount
      
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ 
          advance_paid: supabase.sql`advance_paid + ${amountDifference}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDeposit.reference_id)

      if (updateError) {
        console.error('Error updating sales order advance:', updateError)
        // Don't fail the deposit update, just log the error
      }
    }

    res.json({
      message: 'Deposit updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating deposit:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/v1/deposits/:id - Delete deposit (admin only)
router.delete('/:id', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params

    // Get deposit details before deletion
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('amount, reference_id, reference_type, deposit_type')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Deposit not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch deposit' })
    }

    // Delete the deposit
    const { error } = await supabase
      .from('deposits')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to delete deposit' })
    }

    // Update sales order advance_paid if applicable
    if (deposit.deposit_type === 'sales_order' && deposit.reference_id) {
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ 
          advance_paid: supabase.sql`advance_paid - ${deposit.amount}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', deposit.reference_id)

      if (updateError) {
        console.error('Error updating sales order advance:', updateError)
        // Don't fail the deletion, just log the error
      }
    }

    res.json({
      message: 'Deposit deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting deposit:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/deposits/stats/summary - Get deposits summary
router.get('/stats/summary', authenticateUser, async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query

    let query = supabase
      .from('deposits')
      .select('deposit_type, payment_method, amount')

    // Apply date filters
    if (start_date) {
      query = query.gte('deposit_date', start_date)
    }
    
    if (end_date) {
      query = query.lte('deposit_date', end_date)
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
      total_deposits: data.length,
      total_amount: data.reduce((sum, d) => sum + d.amount, 0),
      by_type: {
        sales_order: {
          count: data.filter(d => d.deposit_type === 'sales_order').length,
          amount: data.filter(d => d.deposit_type === 'sales_order').reduce((sum, d) => sum + d.amount, 0)
        },
        other: {
          count: data.filter(d => d.deposit_type === 'other').length,
          amount: data.filter(d => d.deposit_type === 'other').reduce((sum, d) => sum + d.amount, 0)
        }
      },
      by_payment_method: {
        cash: data.filter(d => d.payment_method === 'cash').reduce((sum, d) => sum + d.amount, 0),
        credit_card: data.filter(d => d.payment_method === 'credit_card').reduce((sum, d) => sum + d.amount, 0),
        upi: data.filter(d => d.payment_method === 'upi').reduce((sum, d) => sum + d.amount, 0),
        bank_transfer: data.filter(d => d.payment_method === 'bank_transfer').reduce((sum, d) => sum + d.amount, 0)
      }
    }

    res.json(summary)
  } catch (error) {
    console.error('Error fetching deposits summary:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router