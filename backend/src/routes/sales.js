const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole, requireStoreAccess } = require('../middleware/supabase')

// Get sales with store filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { date, tender_type, store_id, page = 1, limit = 50 } = req.query
    
    let query = req.supabase
      .from('sales')
      .select(`
        *,
        store:stores!sales_store_id_fkey(store_code, store_name),
        entered_by_user:users!sales_entered_by_fkey(first_name, last_name),
        approved_by_user:users!sales_approved_by_fkey(first_name, last_name)
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
    if (date) {
      query = query.eq('sale_date', date)
    }
    if (tender_type) {
      query = query.eq('tender_type', tender_type)
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: sales, error } = await query

    if (error) {
      throw error
    }

    res.json(sales)
  } catch (error) {
    console.error('Get sales error:', error)
    res.status(500).json({ error: 'Failed to fetch sales' })
  }
})

// Create batch sales entries for multiple tenders
router.post('/batch', authenticateUser, async (req, res) => {
  try {
    const { sale_date, tenders } = req.body

    console.log('POST /sales/batch - Request body:', req.body)
    console.log('POST /sales/batch - User context:', {
      userId: req.user?.id,
      storeId: req.user?.store_id,
      role: req.user?.role
    })

    // Validation
    if (!sale_date || !tenders || !Array.isArray(tenders)) {
      return res.status(400).json({ 
        error: 'Sale date and tenders array are required' 
      })
    }

    // Filter out tenders with no amount or zero amount
    const validTenders = tenders.filter(tender => 
      tender.tender_type && 
      tender.amount && 
      parseFloat(tender.amount) > 0
    )

    if (validTenders.length === 0) {
      return res.status(400).json({ 
        error: 'At least one tender with amount > 0 is required' 
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

    // Prepare sales data for batch insert
    const salesData = validTenders.map(tender => ({
      store_id: storeId,
      sale_date,
      tender_type: tender.tender_type,
      amount: parseFloat(tender.amount),
      transaction_reference: tender.transaction_reference || '',
      customer_reference: tender.customer_reference || '',
      notes: tender.notes || '',
      entered_by: req.user.id
    }))

    console.log('Sales data to insert (batch):', salesData)

    // Insert all sales entries in a single transaction
    const { data: newSales, error } = await req.supabase
      .from('sales')
      .insert(salesData)
      .select()

    if (error) {
      console.error('Supabase batch insert error:', error)
      throw error
    }

    console.log('Sales entries created successfully (batch):', newSales)

    res.status(201).json({
      message: `${newSales.length} sales entries created successfully`,
      sales: newSales,
      count: newSales.length
    })
  } catch (error) {
    console.error('Create batch sales error - Full details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to create sales entries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Create new sales entry
router.post('/', authenticateUser, async (req, res) => {
  try {
    console.log('POST /sales - Request body:', req.body)
    console.log('POST /sales - User context:', {
      userId: req.user?.id,
      storeId: req.user?.store_id,
      role: req.user?.role
    })

    const {
      sale_date,
      tender_type,
      amount,
      transaction_reference,
      customer_reference,
      notes
    } = req.body

    // Validation
    if (!sale_date || !tender_type || !amount) {
      console.log('Validation failed:', { sale_date, tender_type, amount })
      return res.status(400).json({ 
        error: 'Sale date, tender type, and amount are required' 
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

    const salesData = {
      store_id: storeId,
      sale_date,
      tender_type,
      amount: parseFloat(amount),
      transaction_reference,
      customer_reference,
      notes,
      entered_by: req.user.id
    }

    console.log('Sales data to insert:', salesData)

    const { data: newSale, error } = await req.supabase
      .from('sales')
      .insert([salesData])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    console.log('Sales entry created successfully:', newSale)

    res.status(201).json({
      message: 'Sales entry created successfully',
      sale: newSale
    })
  } catch (error) {
    console.error('Create sales error - Full details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to create sales entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Update sales entry (own entries only, if pending)
router.patch('/:saleId', authenticateUser, async (req, res) => {
  try {
    const { saleId } = req.params
    const updateData = req.body

    // Remove fields that shouldn't be updated directly
    delete updateData.id
    delete updateData.store_id
    delete updateData.entered_by
    delete updateData.created_at
    delete updateData.updated_at

    const { data: updatedSale, error } = await req.supabase
      .from('sales')
      .update(updateData)
      .eq('id', saleId)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: 'Sales entry updated successfully',
      sale: updatedSale
    })
  } catch (error) {
    console.error('Update sales error:', error)
    res.status(500).json({ error: 'Failed to update sales entry' })
  }
})

// Approve/reject sales entry (managers only)
router.patch('/:saleId/approval', authenticateUser, requireRole(['store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { saleId } = req.params
    const { approval_status, approval_notes } = req.body

    if (!['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'Invalid approval status' })
    }

    const { data: updatedSale, error } = await req.supabase
      .from('sales')
      .update({
        approval_status,
        approved_by: req.user.id,
        approval_notes: approval_notes || null
      })
      .eq('id', saleId)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: `Sales entry ${approval_status} successfully`,
      sale: updatedSale
    })
  } catch (error) {
    console.error('Approve sales error:', error)
    res.status(500).json({ error: 'Failed to process approval' })
  }
})

// Convert hand bill to system bill
router.patch('/:saleId/convert-handbill', authenticateUser, requireRole(['store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { saleId } = req.params
    const { system_transaction_reference } = req.body

    const { data: updatedSale, error } = await req.supabase
      .from('sales')
      .update({
        is_hand_bill_converted: true,
        converted_at: new Date().toISOString(),
        converted_by: req.user.id,
        transaction_reference: system_transaction_reference
      })
      .eq('id', saleId)
      .eq('tender_type', 'hand_bill')
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: 'Hand bill converted to system bill successfully',
      sale: updatedSale
    })
  } catch (error) {
    console.error('Convert hand bill error:', error)
    res.status(500).json({ error: 'Failed to convert hand bill' })
  }
})

// Get sales summary by tender type
router.get('/summary', authenticateUser, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], store_id } = req.query
    
    let query = req.supabase
      .from('sales')
      .select('tender_type, amount')
      .eq('sale_date', date)

    // Apply store filtering based on user role
    if (req.user.role === 'store_manager' || req.user.role === 'cashier') {
      // Store managers and cashiers can only see their store's data
      if (!req.user.store_id) {
        return res.status(400).json({ 
          error: 'User not assigned to store. Contact admin.' 
        })
      }
      query = query.eq('store_id', req.user.store_id)
      console.log(`Sales summary: Filtering for store ${req.user.store_id} (${req.user.role})`)
    } else if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
      // Super users and accounts_incharge can see all stores, with optional filtering
      if (store_id) {
        query = query.eq('store_id', store_id)
        console.log(`Sales summary: Filtering for specific store ${store_id}`)
      } else {
        console.log(`Sales summary: No store filter (all stores)`)
      }
    }

    const { data: summary, error } = await query

    if (error) {
      throw error
    }

    // Group by tender type
    const groupedSummary = summary.reduce((acc, sale) => {
      if (!acc[sale.tender_type]) {
        acc[sale.tender_type] = {
          tender_type: sale.tender_type,
          total_amount: 0,
          count: 0
        }
      }
      acc[sale.tender_type].total_amount += parseFloat(sale.amount)
      acc[sale.tender_type].count += 1
      return acc
    }, {})

    console.log(`Sales summary result: ${Object.keys(groupedSummary).length} tender types, ${summary.length} total sales`)
    res.json(Object.values(groupedSummary))
  } catch (error) {
    console.error('Get sales summary error:', error)
    res.status(500).json({ error: 'Failed to get sales summary' })
  }
})

module.exports = router