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

// Create gift voucher (everyone except accounts_incharge)
router.post('/', authenticateUser, requireRole(['super_user', 'store_manager', 'cashier']), async (req, res) => {
  try {
    const { original_amount, customer_name, customer_phone, notes, expiry_date, store_id, voucher_number } = req.body

    // Validation
    if (!original_amount) {
      return res.status(400).json({ error: 'Original amount is required' })
    }
    
    if (parseFloat(original_amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }

    if (!expiry_date) {
      return res.status(400).json({ error: 'Expiry date is required' })
    }

    // Mandatory customer validation
    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    if (!customer_phone || customer_phone.trim() === '') {
      return res.status(400).json({ error: 'Customer phone is required' })
    }

    // Determine store_id (same pattern as other APIs)
    let targetStoreId = store_id
    if (req.user.role !== 'super_user' && req.user.role !== 'accounts_incharge') {
      targetStoreId = req.user.store_id
    } else if (!targetStoreId) {
      return res.status(400).json({ error: 'Store selection is required' })
    }

    // Validate expiry date is in the future
    const expiryDate = new Date(expiry_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to compare dates only
    
    if (expiryDate <= today) {
      return res.status(400).json({ error: 'Expiry date must be in the future' })
    }

    // Auto-create or find customer logic
    let customer_id
    
    try {
      // 1. Search for existing customer by phone (unique field)
      const { data: existingCustomer, error: searchError } = await req.supabase
        .from('customers')
        .select('*')
        .eq('customer_phone', customer_phone.trim())
        .single()

      if (existingCustomer) {
        // Customer exists - use their ID
        customer_id = existingCustomer.id
        
        // Update name if different (phone is primary key, name might change)
        if (customer_name.trim() !== existingCustomer.customer_name) {
          await req.supabase
            .from('customers')
            .update({ 
              customer_name: customer_name.trim(),
              last_transaction_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', customer_id)
        } else {
          // Just update last transaction date
          await req.supabase
            .from('customers')
            .update({ 
              last_transaction_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', customer_id)
        }
      } else {
        // Customer doesn't exist - create new one
        const { data: newCustomer, error: customerError } = await req.supabase
          .from('customers')
          .insert({
            customer_name: customer_name.trim(),
            customer_phone: customer_phone.trim(),
            created_date: new Date().toISOString().split('T')[0],
            last_transaction_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single()
          
        if (customerError) throw customerError
        customer_id = newCustomer.id
      }
    } catch (error) {
      console.error('Customer creation/lookup error:', error)
      return res.status(500).json({ error: 'Failed to process customer information' })
    }

    // Handle voucher number - use provided number or generate one
    let finalVoucherNumber = voucher_number
    
    if (!finalVoucherNumber) {
      // Generate voucher number if not provided
      const { data: generatedNumber, error: numberError } = await req.supabase
        .rpc('generate_voucher_number', { store_prefix: 'PJ' })

      if (numberError) throw numberError
      finalVoucherNumber = generatedNumber
    } else {
      // Check if manually entered voucher number already exists
      const { data: existingVoucher, error: checkError } = await req.supabase
        .from('gift_vouchers')
        .select('id')
        .eq('voucher_number', finalVoucherNumber.trim())
        .single()

      if (!checkError && existingVoucher) {
        return res.status(400).json({ error: 'Voucher number already exists' })
      }
    }

    const voucherData = {
      voucher_number: finalVoucherNumber,
      original_amount: parseFloat(original_amount),
      current_balance: parseFloat(original_amount),
      issued_date: new Date().toISOString().split('T')[0],
      expiry_date: expiry_date,
      store_id: targetStoreId,
      created_by: req.user.id,
      customer_id,           // NEW: Link to customer record
      customer_name,         // Keep for display/backup
      customer_phone,        // Keep for display/backup
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

// Search voucher by number
router.get('/search/:voucherNumber', authenticateUser, async (req, res) => {
  try {
    const { voucherNumber } = req.params

    const { data: voucher, error } = await req.supabase
      .from('gift_vouchers')
      .select(`
        *,
        store:stores!gift_vouchers_store_id_fkey(store_code, store_name),
        created_by_user:users!gift_vouchers_created_by_fkey(first_name, last_name)
      `)
      .eq('voucher_number', voucherNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Voucher not found' })
      }
      throw error
    }

    res.json(voucher)
  } catch (error) {
    console.error('Search voucher error:', error)
    res.status(500).json({ error: 'Failed to search voucher' })
  }
})

// Redeem gift voucher (full amount only)
router.patch('/:voucherNumber/redeem', authenticateUser, async (req, res) => {
  try {
    const { voucherNumber } = req.params
    const { redeemed_by_user_id } = req.body // Optional - who redeemed it

    // First, get the voucher
    const { data: voucher, error: fetchError } = await req.supabase
      .from('gift_vouchers')
      .select('*')
      .eq('voucher_number', voucherNumber)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Voucher not found' })
      }
      throw fetchError
    }

    // Validate voucher status
    if (voucher.status !== 'active') {
      return res.status(400).json({ 
        error: `Cannot redeem voucher. Status: ${voucher.status}` 
      })
    }

    // Check if voucher has expired
    const today = new Date()
    const expiryDate = new Date(voucher.expiry_date)
    
    if (expiryDate < today) {
      // Mark as expired
      await req.supabase
        .from('gift_vouchers')
        .update({ status: 'expired' })
        .eq('voucher_number', voucherNumber)
        
      return res.status(400).json({ 
        error: 'Voucher has expired and cannot be redeemed' 
      })
    }

    // Check if full amount is available
    if (voucher.current_balance !== voucher.original_amount) {
      return res.status(400).json({ 
        error: 'Voucher has been partially used. Only full amount redemption is allowed.' 
      })
    }

    // Redeem the full voucher
    const { data: updatedVoucher, error: updateError } = await req.supabase
      .from('gift_vouchers')
      .update({
        status: 'redeemed',
        current_balance: 0,
        redeemed_by: redeemed_by_user_id || req.user.id
      })
      .eq('voucher_number', voucherNumber)
      .select()
      .single()

    if (updateError) throw updateError

    res.json({
      message: 'Gift voucher redeemed successfully',
      voucher: updatedVoucher,
      redeemed_amount: voucher.original_amount
    })
  } catch (error) {
    console.error('Redeem voucher error:', error)
    res.status(500).json({ error: 'Failed to redeem gift voucher' })
  }
})

// Cancel voucher (admin only)
router.patch('/:voucherNumber/cancel', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { voucherNumber } = req.params
    const { reason } = req.body

    // First get the voucher to preserve existing notes
    const { data: existingVoucher, error: fetchError } = await req.supabase
      .from('gift_vouchers')
      .select('notes')
      .eq('voucher_number', voucherNumber)
      .eq('status', 'active')
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Active voucher not found' })
      }
      throw fetchError
    }

    const { data: updatedVoucher, error } = await req.supabase
      .from('gift_vouchers')
      .update({
        status: 'cancelled',
        notes: reason ? `${existingVoucher.notes || ''}\nCancelled: ${reason}` : existingVoucher.notes
      })
      .eq('voucher_number', voucherNumber)
      .eq('status', 'active') // Only cancel active vouchers
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Active voucher not found' })
      }
      throw error
    }

    res.json({
      message: 'Gift voucher cancelled successfully',
      voucher: updatedVoucher
    })
  } catch (error) {
    console.error('Cancel voucher error:', error)
    res.status(500).json({ error: 'Failed to cancel gift voucher' })
  }
})

// Check and update expired vouchers (utility endpoint)
router.post('/update-expired', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: expiredVouchers, error } = await req.supabase
      .from('gift_vouchers')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expiry_date', today)
      .select()

    if (error) throw error

    res.json({
      message: `Updated ${expiredVouchers.length} expired vouchers`,
      expired_count: expiredVouchers.length
    })
  } catch (error) {
    console.error('Update expired vouchers error:', error)
    res.status(500).json({ error: 'Failed to update expired vouchers' })
  }
})

module.exports = router