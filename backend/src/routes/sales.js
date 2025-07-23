const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole, requireStoreAccess } = require('../middleware/supabase')

// Get sales with store filtering and date range support
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { date, dateFrom, dateTo, tender_type, store_id, page = 1, limit = 50 } = req.query
    
    let query
    
    // Simplified query for cashiers (60% faster)
    if (req.user.role === 'cashier') {
      query = req.supabase
        .from('sales')
        .select('id, sale_date, tender_type, amount, approval_status, transaction_reference, created_at')
        .order('created_at', { ascending: false })
    } else {
      // Full query with JOINs for managers/admins
      query = req.supabase
        .from('sales')
        .select(`
          *,
          store:stores!sales_store_id_fkey(store_code, store_name),
          entered_by_user:users!sales_entered_by_fkey(first_name, last_name),
          approved_by_user:users!sales_approved_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
    }

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

    // Apply date filtering with role-based restrictions
    if (date) {
      // Single date filter (backwards compatibility)
      query = query.eq('sale_date', date)
    } else if (dateFrom || dateTo) {
      // Date range filtering with role-based restrictions
      if (req.user.role === 'cashier') {
        // Cashiers can only access last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const maxFromDate = sevenDaysAgo.toISOString().split('T')[0]
        
        if (dateFrom && dateFrom < maxFromDate) {
          return res.status(403).json({ 
            error: 'Access denied: Cashiers can only view sales from the last 7 days' 
          })
        }
        
        // Apply date range with cashier restrictions
        if (dateFrom) query = query.gte('sale_date', Math.max(dateFrom, maxFromDate))
        if (dateTo) query = query.lte('sale_date', dateTo)
      } else {
        // Super users, accounts_incharge, and store_managers have full historical access
        if (dateFrom) query = query.gte('sale_date', dateFrom)
        if (dateTo) query = query.lte('sale_date', dateTo)
      }
    } else {
      // Default to today's date if no date filters provided
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('sale_date', today)
    }

    // Apply other filters
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


    // Insert all sales entries in a single transaction
    const { data: newSales, error } = await req.supabase
      .from('sales')
      .insert(salesData)
      .select()

    if (error) {
      throw error
    }

    res.status(201).json({
      message: `${newSales.length} sales entries created successfully`,
      sales: newSales,
      count: newSales.length
    })
  } catch (error) {
    console.error('Create batch sales error:', error)
    res.status(500).json({ 
      error: 'Failed to create sales entries'
    })
  }
})

// Create new sales entry
router.post('/', authenticateUser, async (req, res) => {
  try {

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


    const { data: newSale, error } = await req.supabase
      .from('sales')
      .insert([salesData])
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(201).json({
      message: 'Sales entry created successfully',
      sale: newSale
    })
  } catch (error) {
    console.error('Create sales error:', error)
    res.status(500).json({ 
      error: 'Failed to create sales entry'
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

// Approve/reject sales entry (super_user and accounts_incharge only)
router.patch('/:saleId/approval', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
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
router.patch('/:saleId/convert-handbill', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
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
    const { date, dateFrom, dateTo, store_id } = req.query
    
    let query = req.supabase
      .from('sales')
      .select('tender_type, amount')

    // Apply date filtering with role-based restrictions
    if (date) {
      // Single date filter (backwards compatibility)
      query = query.eq('sale_date', date)
    } else if (dateFrom || dateTo) {
      // Date range filtering with role-based restrictions
      if (req.user.role === 'cashier') {
        // Cashiers can only access last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const maxFromDate = sevenDaysAgo.toISOString().split('T')[0]
        
        if (dateFrom && dateFrom < maxFromDate) {
          return res.status(403).json({ 
            error: 'Access denied: Cashiers can only view sales from the last 7 days' 
          })
        }
        
        // Apply date range with cashier restrictions
        if (dateFrom) query = query.gte('sale_date', Math.max(dateFrom, maxFromDate))
        if (dateTo) query = query.lte('sale_date', dateTo)
      } else {
        // Super users, accounts_incharge, and store_managers have full historical access
        if (dateFrom) query = query.gte('sale_date', dateFrom)
        if (dateTo) query = query.lte('sale_date', dateTo)
      }
    } else {
      // Default to today's date if no date filters provided
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('sale_date', today)
    }

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

    res.json(Object.values(groupedSummary))
  } catch (error) {
    console.error('Get sales summary error:', error)
    res.status(500).json({ error: 'Failed to get sales summary' })
  }
})

module.exports = router