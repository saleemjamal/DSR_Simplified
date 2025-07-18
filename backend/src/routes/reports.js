const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole } = require('../middleware/supabase')

// Daily sales report
router.get('/daily-sales', authenticateUser, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query

    const { data: salesData, error } = await req.supabase
      .from('sales')
      .select('tender_type, amount, approval_status')
      .eq('sale_date', date)

    if (error) throw error

    const summary = salesData.reduce((acc, sale) => {
      const type = sale.tender_type
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0, approved: 0, pending: 0 }
      }
      acc[type].total += parseFloat(sale.amount)
      acc[type].count += 1
      acc[type][sale.approval_status] += 1
      return acc
    }, {})

    res.json({ date, summary })
  } catch (error) {
    console.error('Daily sales report error:', error)
    res.status(500).json({ error: 'Failed to generate daily sales report' })
  }
})

// Cash reconciliation
router.get('/cash-reconciliation', authenticateUser, requireRole(['store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query

    const { data: reconciliation, error } = await req.supabase
      .rpc('calculate_daily_reconciliation', {
        p_store_id: req.user.store_id,
        p_date: date
      })

    if (error) throw error

    res.json({ date, reconciliation: reconciliation[0] })
  } catch (error) {
    console.error('Cash reconciliation error:', error)
    res.status(500).json({ error: 'Failed to generate cash reconciliation' })
  }
})

module.exports = router