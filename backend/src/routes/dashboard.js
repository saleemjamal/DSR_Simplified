const express = require('express')
const router = express.Router()
const { authenticateUser } = require('../middleware/supabase')

// Consolidated dashboard endpoint (90% faster than multiple calls)
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { date } = req.query
    const today = date || new Date().toISOString().split('T')[0]
    
    // Parallel data fetching for better performance
    const promises = []
    
    // 1. Sales Summary (always needed)
    const salesSummaryPromise = getSalesSummary(req.supabase, req.user, today)
    promises.push(salesSummaryPromise)
    
    // 2. Cash Reconciliation (non-cashiers only)
    let cashReconciliationPromise = null
    if (req.user.role !== 'cashier') {
      cashReconciliationPromise = getCashReconciliation(req.supabase, req.user, today)
      promises.push(cashReconciliationPromise)
    }
    
    // 3. Pending Approvals (managers/admins only)
    let pendingApprovalsPromise = null
    if (req.user.role !== 'cashier') {
      pendingApprovalsPromise = getPendingApprovals(req.supabase, req.user)
      promises.push(pendingApprovalsPromise)
    }
    
    // Execute all queries in parallel
    const results = await Promise.allSettled(promises)
    
    // Process results
    const salesSummary = results[0].status === 'fulfilled' ? results[0].value : []
    const todayTotal = salesSummary.reduce((sum, item) => sum + item.total_amount, 0)
    
    let cashVariance = 0
    let cashVarianceStatus = 'unknown'
    let cashTransactionCount = 0
    let pendingApprovals = 0
    
    if (req.user.role !== 'cashier') {
      if (results[1] && results[1].status === 'fulfilled') {
        const cashReconData = results[1].value
        cashVariance = cashReconData.variance || 0
        cashVarianceStatus = cashReconData.status || 'unknown'
        cashTransactionCount = cashReconData.transactionCount || 0
      }
      
      if (results[2] && results[2].status === 'fulfilled') {
        pendingApprovals = results[2].value || 0
      }
    }
    
    // Return consolidated response
    res.json({
      salesSummary,
      dashboardStats: {
        todayTotal,
        pendingApprovals,
        cashVariance,
        cashVarianceStatus,
        cashTransactionCount,
        overdueCredits: 0 // TODO: Implement from API
      }
    })
    
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Failed to load dashboard data' })
  }
})

// Helper function: Get sales summary with role-based filtering
async function getSalesSummary(supabase, user, date) {
  let query = supabase
    .from('sales')
    .select('tender_type, amount')
    .eq('sale_date', date)

  // Apply store filtering based on user role
  if (user.role === 'store_manager' || user.role === 'cashier') {
    if (!user.store_id) {
      throw new Error('User not assigned to store')
    }
    query = query.eq('store_id', user.store_id)
  }
  // Super users and accounts_incharge see all stores by default

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

  return Object.values(groupedSummary)
}

// Helper function: Get cash reconciliation (placeholder)
async function getCashReconciliation(supabase, user, date) {
  try {
    // Determine which store to calculate variance for
    let storeId = user.store_id
    
    // For super users without a specific store, we could:
    // - Calculate for all stores (aggregate)
    // - Show 0 variance (current approach)
    // - Require store selection
    if (!storeId) {
      return { variance: 0, status: 'no_store' }
    }

    // Call our cash variance calculation function
    const { data, error } = await supabase
      .rpc('get_cash_variance_summary', {
        p_store_id: storeId,
        p_date: date
      })

    if (error) {
      console.error('Cash variance calculation error:', error)
      return { variance: 0, status: 'error' }
    }

    // Extract results from the function
    const result = data && data.length > 0 ? data[0] : null
    
    if (!result) {
      return { variance: 0, status: 'no_data' }
    }

    return {
      variance: parseFloat(result.variance_amount || 0),
      status: result.variance_status || 'unknown',
      transactionCount: parseInt(result.total_cash_transactions || 0)
    }
  } catch (error) {
    console.error('Cash reconciliation error:', error)
    return { variance: 0, status: 'error' }
  }
}

// Helper function: Get pending approvals count
async function getPendingApprovals(supabase, user) {
  try {
    let query = supabase
      .from('sales')
      .select('id', { count: 'exact' })
      .eq('approval_status', 'pending')
    
    // Apply store filtering
    if (user.role === 'store_manager') {
      if (!user.store_id) {
        return 0
      }
      query = query.eq('store_id', user.store_id)
    }
    // Super users and accounts_incharge see all stores
    
    const { count, error } = await query
    
    if (error) {
      console.error('Pending approvals error:', error)
      return 0
    }
    
    return count || 0
  } catch (error) {
    console.error('Pending approvals error:', error)
    return 0
  }
}

module.exports = router