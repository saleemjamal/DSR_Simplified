const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole } = require('../middleware/supabase')

// Get expenses with store filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { date, category, status, store_id, page = 1, limit = 50 } = req.query
    
    let query = req.supabase
      .from('expenses')
      .select(`
        *,
        store:stores!expenses_store_id_fkey(store_code, store_name),
        requested_by_user:users!expenses_requested_by_fkey(first_name, last_name),
        approved_by_user:users!expenses_approved_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    // Apply store filtering based on user role
    if (req.user.role === 'store_manager' || req.user.role === 'cashier') {
      // Store managers and cashiers can only see their store's data
      if (!req.user.store_id) {
        return res.status(400).json({ 
          error: 'User not assigned to store. Contact admin.' 
        })
      }
      query = query.eq('store_id', req.user.store_id)
    } else if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      // Super users and accounts_incharge can see all stores, with optional filtering
      if (store_id) {
        query = query.eq('store_id', store_id)
      }
      // If no store_id specified, they see all stores
    }

    // Apply other filters
    if (date) query = query.eq('expense_date', date)
    if (category) query = query.eq('category', category)
    if (status) query = query.eq('approval_status', status)

    // Pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: expenses, error } = await query

    if (error) throw error

    res.json(expenses)
  } catch (error) {
    console.error('Get expenses error:', error)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// Create batch expense entries
router.post('/batch', authenticateUser, async (req, res) => {
  try {
    const { expense_date, expenses } = req.body

    console.log('POST /expenses/batch - Request body:', req.body)
    console.log('POST /expenses/batch - User context:', {
      userId: req.user?.id,
      storeId: req.user?.store_id,
      role: req.user?.role
    })

    // Validation
    if (!expense_date || !expenses || !Array.isArray(expenses)) {
      return res.status(400).json({ 
        error: 'Expense date and expenses array are required' 
      })
    }

    // Filter out expenses with no amount or zero amount
    const validExpenses = expenses.filter(expense => 
      expense.category && 
      expense.description && 
      expense.amount && 
      parseFloat(expense.amount) > 0
    )

    if (validExpenses.length === 0) {
      return res.status(400).json({ 
        error: 'At least one expense with amount > 0 is required' 
      })
    }

    // Determine store_id - super users and accounts_incharge can work with any store
    let storeId = req.user.store_id
    
    // For super users and accounts_incharge without assigned store, require store_id in request
    if (!storeId && (req.user.role === 'super_user' || req.user.role === 'accounts_incharge')) {
      if (!req.body.store_id) {
        return res.status(400).json({ 
          error: 'Please specify store_id in request body for multi-store access' 
        })
      }
      
      // Verify the store exists
      const { data: store, error: storeError } = await req.supabase
        .from('stores')
        .select('id')
        .eq('id', req.body.store_id)
        .single()
      
      if (storeError || !store) {
        return res.status(400).json({ 
          error: 'Invalid store_id provided' 
        })
      }
      
      storeId = req.body.store_id
    }
    
    if (!storeId) {
      return res.status(400).json({ 
        error: 'User not assigned to store. Contact admin to assign store.' 
      })
    }

    // Prepare expense data for batch insert
    const expenseData = validExpenses.map(expense => ({
      store_id: storeId,
      expense_date,
      category: expense.category,
      description: expense.description,
      amount: parseFloat(expense.amount),
      voucher_number: expense.voucher_number || '',
      expense_owner: expense.expense_owner || '',
      payment_method: expense.payment_method || 'petty_cash',
      requested_by: req.user.id
    }))

    console.log('Expense data to insert (batch):', expenseData)

    // Insert all expense entries in a single transaction
    const { data: newExpenses, error } = await req.supabase
      .from('expenses')
      .insert(expenseData)
      .select()

    if (error) {
      console.error('Supabase batch insert error:', error)
      throw error
    }

    console.log('Expense entries created successfully (batch):', newExpenses)

    res.status(201).json({
      message: `${newExpenses.length} expense entries created successfully`,
      expenses: newExpenses,
      count: newExpenses.length
    })
  } catch (error) {
    console.error('Create batch expenses error - Full details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to create expense entries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Create expense entry
router.post('/', authenticateUser, async (req, res) => {
  try {
    console.log('POST /expenses - Request body:', req.body)
    console.log('POST /expenses - User context:', {
      userId: req.user?.id,
      storeId: req.user?.store_id,
      role: req.user?.role
    })

    const {
      expense_date,
      category,
      description,
      amount,
      voucher_number,
      expense_owner,
      payment_method
    } = req.body

    // Validation
    if (!expense_date || !category || !description || !amount) {
      console.log('Validation failed:', { expense_date, category, description, amount })
      return res.status(400).json({ 
        error: 'Expense date, category, description, and amount are required' 
      })
    }

    // Determine store_id - super users and accounts_incharge can work with any store
    let storeId = req.user.store_id
    
    // For super users and accounts_incharge without assigned store, require store_id in request
    if (!storeId && (req.user.role === 'super_user' || req.user.role === 'accounts_incharge')) {
      if (!req.body.store_id) {
        return res.status(400).json({ 
          error: 'Please specify store_id in request body for multi-store access' 
        })
      }
      
      // Verify the store exists
      const { data: store, error: storeError } = await req.supabase
        .from('stores')
        .select('id')
        .eq('id', req.body.store_id)
        .single()
      
      if (storeError || !store) {
        return res.status(400).json({ 
          error: 'Invalid store_id provided' 
        })
      }
      
      storeId = req.body.store_id
    }
    
    if (!storeId) {
      return res.status(400).json({ 
        error: 'User not assigned to store. Contact admin to assign store.' 
      })
    }

    const expenseData = {
      store_id: storeId,
      expense_date,
      category,
      description,
      amount: parseFloat(amount),
      voucher_number: voucher_number || '',
      expense_owner: expense_owner || '',
      payment_method: payment_method || 'petty_cash',
      requested_by: req.user.id
    }

    console.log('Expense data to insert:', expenseData)

    const { data: newExpense, error } = await req.supabase
      .from('expenses')
      .insert([expenseData])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    console.log('Expense entry created successfully:', newExpense)

    res.status(201).json({
      message: 'Expense entry created successfully',
      expense: newExpense
    })
  } catch (error) {
    console.error('Create expense error - Full details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to create expense entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Approve/reject expense entry (managers only)
router.patch('/:expenseId/approval', authenticateUser, requireRole(['store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { expenseId } = req.params
    const { approval_status, approval_notes } = req.body

    if (!['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'Invalid approval status' })
    }

    const { data: updatedExpense, error } = await req.supabase
      .from('expenses')
      .update({
        approval_status,
        approved_by: req.user.id,
        approval_notes: approval_notes || null
      })
      .eq('id', expenseId)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: `Expense ${approval_status} successfully`,
      expense: updatedExpense
    })
  } catch (error) {
    console.error('Approve expense error:', error)
    res.status(500).json({ error: 'Failed to process approval' })
  }
})

module.exports = router