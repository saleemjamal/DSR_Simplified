const express = require('express')
const { supabase } = require('../config/supabase')
const { authenticateUser, requireRole } = require('../middleware/supabase')
const router = express.Router()

// =================================================================
// CUSTOMERS MANAGEMENT ROUTES
// =================================================================

// GET /api/v1/customers - Get all customers with search and pagination
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = supabase
      .from('customers')
      .select('*')
      .order('customer_name', { ascending: true })

    // Add search functionality
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_email.ilike.%${search}%`)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch customers' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/customers/:id - Get customer by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch customer' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/customers - Create new customer
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      address,
      credit_limit = 0,
      notes
    } = req.body

    // Validation
    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    // Phone validation - must be unique if provided
    if (customer_phone) {
      const phoneRegex = /^[+]?[\d\s\-()]+$/
      if (!phoneRegex.test(customer_phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' })
      }

      // Check for existing phone number
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_phone', customer_phone)
        .single()

      if (existing) {
        return res.status(400).json({ error: 'Phone number already exists' })
      }
    }

    // Email validation if provided
    if (customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(customer_email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }
    }

    const customerData = {
      customer_name: customer_name.trim(),
      customer_phone: customer_phone?.trim() || null,
      customer_email: customer_email?.trim() || null,
      address: address?.trim() || null,
      credit_limit: parseFloat(credit_limit) || 0,
      notes: notes?.trim() || null,
      created_date: new Date().toISOString().split('T')[0],
      last_transaction_date: null,
      total_outstanding: 0
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Customer with this phone number already exists' })
      }
      return res.status(500).json({ error: 'Failed to create customer' })
    }

    res.status(201).json({
      message: 'Customer created successfully',
      data
    })
  } catch (error) {
    console.error('Error creating customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/v1/customers/:id - Update customer
router.patch('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    delete updates.id
    delete updates.created_at
    delete updates.total_outstanding

    // Validate phone if being updated
    if (updates.customer_phone) {
      const phoneRegex = /^[+]?[\d\s\-()]+$/
      if (!phoneRegex.test(updates.customer_phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' })
      }

      // Check for existing phone number (excluding current customer)
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_phone', updates.customer_phone)
        .neq('id', id)
        .single()

      if (existing) {
        return res.status(400).json({ error: 'Phone number already exists' })
      }
    }

    // Validate email if being updated
    if (updates.customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updates.customer_email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }
    }

    // Add updated timestamp
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to update customer' })
    }

    res.json({
      message: 'Customer updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/v1/customers/:id/update-outstanding - Update customer's outstanding balance
router.post('/:id/update-outstanding', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { id } = req.params
    const { amount, operation = 'add' } = req.body

    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Get current customer data
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('total_outstanding, credit_limit')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch customer' })
    }

    let newOutstanding
    if (operation === 'add') {
      newOutstanding = customer.total_outstanding + amount
    } else if (operation === 'subtract') {
      newOutstanding = Math.max(0, customer.total_outstanding - amount)
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use "add" or "subtract"' })
    }

    // Check credit limit
    if (newOutstanding > customer.credit_limit && customer.credit_limit > 0) {
      return res.status(400).json({ 
        error: `Outstanding amount (${newOutstanding}) would exceed credit limit (${customer.credit_limit})` 
      })
    }

    const { data, error } = await supabase
      .from('customers')
      .update({ 
        total_outstanding: newOutstanding,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to update outstanding balance' })
    }

    res.json({
      message: 'Outstanding balance updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating outstanding balance:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/customers/search/phone/:phone - Quick search by phone
router.get('/search/phone/:phone', authenticateUser, async (req, res) => {
  try {
    const { phone } = req.params

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_phone', phone)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' })
      }
      return res.status(500).json({ error: 'Failed to search customer' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error searching customer by phone:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/v1/customers/:id/transactions - Get customer transaction history
router.get('/:id/transactions', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 20 } = req.query

    // Get sales transactions
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, sale_date, tender_type, amount, transaction_reference, notes, created_at')
      .or(`customer_reference.eq.${id}`)
      .order('sale_date', { ascending: false })
      .limit(limit)

    // Get sales orders
    const { data: orders, error: ordersError } = await supabase
      .from('sales_orders')
      .select('id, order_date, order_number, total_estimated_amount, advance_paid, status, notes, created_at')
      .eq('customer_id', id)
      .order('order_date', { ascending: false })
      .limit(limit)

    // Get deposits
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('id, deposit_date, deposit_type, amount, payment_method, notes, created_at')
      .eq('customer_id', id)
      .order('deposit_date', { ascending: false })
      .limit(limit)

    if (salesError || ordersError || depositsError) {
      console.error('Database error:', salesError || ordersError || depositsError)
      return res.status(500).json({ error: 'Failed to fetch transaction history' })
    }

    res.json({
      sales: sales || [],
      orders: orders || [],
      deposits: deposits || []
    })
  } catch (error) {
    console.error('Error fetching customer transactions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router