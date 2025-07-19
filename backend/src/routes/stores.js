const express = require('express')
const router = express.Router()
const { authenticateUser, requireRole, requireStoreAccess } = require('../middleware/supabase')

// Get all stores (super users and accounts_incharge)
router.get('/', authenticateUser, requireRole(['super_user', 'accounts_incharge']), async (req, res) => {
  try {
    const { data: stores, error } = await req.supabase
      .from('stores')
      .select(`
        *,
        manager:users!fk_stores_manager(first_name, last_name, email)
      `)
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

// Create new store (super users only)
router.post('/', authenticateUser, requireRole(['super_user']), async (req, res) => {
  try {
    const { 
      store_code, 
      store_name, 
      address, 
      phone, 
      manager_id,
      petty_cash_limit = 5000.00,
      timezone = 'Asia/Kolkata',
      daily_deadline_time = '12:00:00'
    } = req.body

    // Validate required fields
    if (!store_code || !store_name) {
      return res.status(400).json({ 
        error: 'Store code and name are required' 
      })
    }

    // Validate store code format (letters and numbers only, max 10 chars)
    if (!/^[A-Z0-9]{2,10}$/.test(store_code)) {
      return res.status(400).json({ 
        error: 'Store code must be 2-10 uppercase letters/numbers only' 
      })
    }

    // Check if store code already exists
    const { data: existingStore, error: checkError } = await req.supabase
      .from('stores')
      .select('id')
      .eq('store_code', store_code)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingStore) {
      return res.status(409).json({ 
        error: 'Store code already exists' 
      })
    }

    // Validate manager if provided
    if (manager_id) {
      const { data: manager, error: managerError } = await req.supabase
        .from('users')
        .select('id, role')
        .eq('id', manager_id)
        .single()

      if (managerError || !manager) {
        return res.status(400).json({ 
          error: 'Invalid manager ID' 
        })
      }

      if (!['store_manager', 'accounts_incharge', 'super_user'].includes(manager.role)) {
        return res.status(400).json({ 
          error: 'Manager must have manager-level role or above' 
        })
      }
    }

    // Create the store
    const { data: newStore, error } = await req.supabase
      .from('stores')
      .insert({
        store_code: store_code.toUpperCase(),
        store_name,
        address,
        phone,
        manager_id: manager_id || null,
        petty_cash_limit: parseFloat(petty_cash_limit),
        timezone,
        daily_deadline_time,
        is_active: true,
        configuration: {},
        metadata: {
          created_by_user: req.user.id,
          creation_date: new Date().toISOString()
        }
      })
      .select(`
        *,
        manager:users!fk_stores_manager(first_name, last_name, email)
      `)
      .single()

    if (error) {
      throw error
    }

    // Synchronize user store assignment if manager is assigned
    if (manager_id && newStore) {
      console.log(`Syncing store assignment: Setting user ${manager_id} store_id to ${newStore.id}`)
      
      const { error: userUpdateError } = await req.supabase
        .from('users')
        .update({ store_id: newStore.id })
        .eq('id', manager_id)
      
      if (userUpdateError) {
        console.error('Failed to sync user store assignment:', userUpdateError)
        // Continue with store creation but log the issue
      } else {
        console.log('Successfully synced user store assignment')
      }
    }

    res.status(201).json({
      message: 'Store created successfully',
      store: newStore
    })

  } catch (error) {
    console.error('Create store error:', error)
    res.status(500).json({ error: 'Failed to create store' })
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

// Update store details
router.patch('/:storeId', authenticateUser, requireRole(['super_user']), async (req, res) => {
  try {
    const { storeId } = req.params
    const { 
      store_name, 
      address, 
      phone, 
      manager_id,
      petty_cash_limit,
      timezone,
      daily_deadline_time,
      is_active
    } = req.body

    // Validate required fields
    if (!store_name) {
      return res.status(400).json({ 
        error: 'Store name is required' 
      })
    }

    // Validate manager if provided
    if (manager_id) {
      const { data: manager, error: managerError } = await req.supabase
        .from('users')
        .select('id, role')
        .eq('id', manager_id)
        .single()

      if (managerError || !manager) {
        return res.status(400).json({ 
          error: 'Invalid manager ID' 
        })
      }

      if (!['store_manager', 'accounts_incharge', 'super_user'].includes(manager.role)) {
        return res.status(400).json({ 
          error: 'Manager must have manager-level role or above' 
        })
      }
    }

    // Get current store data to check previous manager
    const { data: currentStore, error: getCurrentError } = await req.supabase
      .from('stores')
      .select('manager_id')
      .eq('id', storeId)
      .single()

    if (getCurrentError) {
      throw getCurrentError
    }

    // Update the store
    const { data: updatedStore, error } = await req.supabase
      .from('stores')
      .update({
        store_name,
        address,
        phone,
        manager_id: manager_id || null,
        petty_cash_limit: petty_cash_limit ? parseFloat(petty_cash_limit) : undefined,
        timezone,
        daily_deadline_time,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)
      .select(`
        *,
        manager:users!fk_stores_manager(first_name, last_name, email)
      `)
      .single()

    if (error) {
      throw error
    }

    // Synchronize user store assignments
    // 1. Remove store assignment from previous manager (if different)
    if (currentStore.manager_id && currentStore.manager_id !== manager_id) {
      console.log(`Removing store assignment from previous manager: ${currentStore.manager_id}`)
      
      const { error: prevManagerError } = await req.supabase
        .from('users')
        .update({ store_id: null })
        .eq('id', currentStore.manager_id)
      
      if (prevManagerError) {
        console.error('Failed to remove previous manager store assignment:', prevManagerError)
      }
    }
    
    // 2. Assign store to new manager (if provided)
    if (manager_id) {
      console.log(`Syncing store assignment: Setting user ${manager_id} store_id to ${storeId}`)
      
      const { error: userUpdateError } = await req.supabase
        .from('users')
        .update({ store_id: storeId })
        .eq('id', manager_id)
      
      if (userUpdateError) {
        console.error('Failed to sync new manager store assignment:', userUpdateError)
      } else {
        console.log('Successfully synced new manager store assignment')
      }
    }

    res.json({
      message: 'Store updated successfully',
      store: updatedStore
    })

  } catch (error) {
    console.error('Update store error:', error)
    res.status(500).json({ error: 'Failed to update store' })
  }
})

module.exports = router