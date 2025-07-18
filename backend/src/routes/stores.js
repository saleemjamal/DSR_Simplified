const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole, requireStoreAccess } = require('../middleware/supabase')

// Get all stores (super users only)
router.get('/', authenticateUser, requireRole('super_user'), async (req, res) => {
  try {
    const { data: stores, error } = await req.supabase
      .from('stores')
      .select('*')
      .order('store_name')

    if (error) {
      throw error
    }

    res.json(stores)
  } catch (error) {
    console.error('Get stores error:', error)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
})

// Get current user's store
router.get('/current', authenticateUser, async (req, res) => {
  try {
    if (!req.user.store_id) {
      return res.status(404).json({ error: 'No store assigned to user' })
    }

    const { data: store, error } = await req.supabase
      .from('stores')
      .select('*')
      .eq('id', req.user.store_id)
      .single()

    if (error) {
      throw error
    }

    res.json(store)
  } catch (error) {
    console.error('Get current store error:', error)
    res.status(500).json({ error: 'Failed to fetch store details' })
  }
})

// Get store by ID
router.get('/:storeId', authenticateUser, requireStoreAccess, async (req, res) => {
  try {
    const { storeId } = req.params

    const { data: store, error } = await req.supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (error) {
      throw error
    }

    res.json(store)
  } catch (error) {
    console.error('Get store error:', error)
    res.status(500).json({ error: 'Failed to fetch store' })
  }
})

// Update store configuration
router.patch('/:storeId/config', authenticateUser, requireRole(['store_manager', 'super_user']), requireStoreAccess, async (req, res) => {
  try {
    const { storeId } = req.params
    const { configuration } = req.body

    const { data: updatedStore, error } = await req.supabase
      .from('stores')
      .update({ configuration })
      .eq('id', storeId)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: 'Store configuration updated successfully',
      store: updatedStore
    })
  } catch (error) {
    console.error('Update store config error:', error)
    res.status(500).json({ error: 'Failed to update store configuration' })
  }
})

module.exports = router