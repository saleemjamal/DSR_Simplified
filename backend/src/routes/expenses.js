const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole } = require('../middleware/supabase')

// Get expenses for current user's store
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { date, category, status, page = 1, limit = 50 } = req.query
    
    let query = req.supabase
      .from('expenses')
      .select(`
        *,
        requested_by_user:users!expenses_requested_by_fkey(first_name, last_name),
        approved_by_user:users!expenses_approved_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
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

// Create expense entry
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { expense_date, category, description, amount, voucher_number, expense_owner } = req.body

    if (!expense_date || !category || !description || !amount) {
      return res.status(400).json({ error: 'Required fields missing' })
    }

    const expenseData = {
      store_id: req.user.store_id,
      expense_date,
      category,
      description,
      amount: parseFloat(amount),
      voucher_number,
      expense_owner,
      requested_by: req.user.id
    }

    const { data: newExpense, error } = await req.supabase
      .from('expenses')
      .insert([expenseData])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Expense created successfully', expense: newExpense })
  } catch (error) {
    console.error('Create expense error:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

module.exports = router