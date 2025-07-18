const express = require('express')
const router = express.Router()
const { authenticateUser } = require('../middleware/supabase')

// Get damage reports
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: reports, error } = await req.supabase
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(reports)
  } catch (error) {
    console.error('Get damage reports error:', error)
    res.status(500).json({ error: 'Failed to fetch damage reports' })
  }
})

// Create damage report
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { supplier_name, item_name, quantity, damage_category } = req.body

    const reportData = {
      store_id: req.user.store_id,
      report_date: new Date().toISOString().split('T')[0],
      supplier_name,
      item_name,
      quantity: parseInt(quantity),
      damage_category,
      reported_by: req.user.id,
      ...req.body
    }

    const { data: newReport, error } = await req.supabase
      .from('damage_reports')
      .insert([reportData])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Damage report created successfully', report: newReport })
  } catch (error) {
    console.error('Create damage report error:', error)
    res.status(500).json({ error: 'Failed to create damage report' })
  }
})

module.exports = router