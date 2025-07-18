const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole } = require('../middleware/supabase')

// Get gift vouchers
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query
    
    let query = req.supabase
      .from('gift_vouchers')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: vouchers, error } = await query
    if (error) throw error

    res.json(vouchers)
  } catch (error) {
    console.error('Get vouchers error:', error)
    res.status(500).json({ error: 'Failed to fetch vouchers' })
  }
})

// Create gift voucher
router.post('/', authenticateUser, requireRole(['store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { original_amount, customer_name, customer_phone, notes } = req.body

    if (!original_amount) {
      return res.status(400).json({ error: 'Original amount required' })
    }

    // Generate voucher number
    const { data: voucherNumber, error: numberError } = await req.supabase
      .rpc('generate_voucher_number', { store_prefix: 'PJ' })

    if (numberError) throw numberError

    const voucherData = {
      voucher_number: voucherNumber,
      original_amount: parseFloat(original_amount),
      current_balance: parseFloat(original_amount),
      issued_date: new Date().toISOString().split('T')[0],
      store_id: req.user.store_id,
      created_by: req.user.id,
      customer_name,
      customer_phone,
      notes
    }

    const { data: newVoucher, error } = await req.supabase
      .from('gift_vouchers')
      .insert([voucherData])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Gift voucher created successfully', voucher: newVoucher })
  } catch (error) {
    console.error('Create voucher error:', error)
    res.status(500).json({ error: 'Failed to create gift voucher' })
  }
})

module.exports = router