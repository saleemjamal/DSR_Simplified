const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole, useServiceRole } = require('../middleware/supabase')

// Get system settings
router.get('/settings', authenticateUser, requireRole(['store_manager', 'accounts_incharge', 'super_user']), async (req, res) => {
  try {
    const { module_name } = req.query

    let query = req.supabase
      .from('system_settings')
      .select('*')

    if (module_name) {
      query = query.eq('module_name', module_name)
    }

    const { data: settings, error } = await query

    if (error) throw error

    res.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Failed to fetch system settings' })
  }
})

// Update system setting (super users only)
router.patch('/settings/:settingId', authenticateUser, requireRole('super_user'), useServiceRole, async (req, res) => {
  try {
    const { settingId } = req.params
    const { setting_value } = req.body

    const { data: updatedSetting, error } = await req.supabase
      .from('system_settings')
      .update({ 
        setting_value,
        updated_by: req.user.id
      })
      .eq('id', settingId)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Setting updated successfully', setting: updatedSetting })
  } catch (error) {
    console.error('Update setting error:', error)
    res.status(500).json({ error: 'Failed to update setting' })
  }
})

// Get audit logs
router.get('/audit-logs', authenticateUser, requireRole(['store_manager', 'accounts_incharge', 'super_user']), async (req, res) => {
  try {
    const { table_name, action_type, page = 1, limit = 50 } = req.query

    let query = req.supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (table_name) query = query.eq('table_name', table_name)
    if (action_type) query = query.eq('action_type', action_type)

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error } = await query

    if (error) throw error

    res.json(logs)
  } catch (error) {
    console.error('Get audit logs error:', error)
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

module.exports = router