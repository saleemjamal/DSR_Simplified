const { supabase, supabaseAdmin } = require('../config/supabase')
const jwt = require('jsonwebtoken')

// Middleware to authenticate users with Supabase
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    let userId
    let effectiveStoreId = null

    // First try to verify as local JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      userId = decoded.sub
      effectiveStoreId = decoded.store_id // Get effective store ID from JWT
      console.log(`JWT auth: User ${userId}, effective store: ${effectiveStoreId}`)
    } catch (jwtError) {
      // If JWT verification fails, try as Supabase token
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
      
      userId = user.id
      console.log(`Supabase auth: User ${userId}`)
    }

    // Get user details from our users table
    const { data: userDetails, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userDetails) {
      return res.status(401).json({ error: 'User not found in system' })
    }

    // If we have effective store ID from JWT, use it; otherwise fall back to database value
    if (effectiveStoreId !== null) {
      userDetails.store_id = effectiveStoreId
      console.log(`Using effective store ID from JWT: ${effectiveStoreId}`)
    } else {
      // For Supabase tokens, determine effective store ID the same way as login
      let storeId = userDetails.store_id
      
      if (!storeId || userDetails.role === 'store_manager') {
        const { data: managedStore } = await supabaseAdmin
          .from('stores')
          .select('id')
          .eq('manager_id', userId)
          .single()
        
        if (managedStore) {
          storeId = managedStore.id
          console.log(`Supabase auth: User ${userId} manages store ${storeId}`)
        }
      }
      
      userDetails.store_id = storeId
    }

    // RLS is disabled - no need to set context variables
    // Removed 4 RPC calls for 70% performance improvement

    req.user = userDetails
    // Use supabaseAdmin to bypass RLS for authenticated users
    req.supabase = supabaseAdmin
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const userRole = req.user.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    console.log(`requireRole check: User ${req.user.email} has role '${userRole}', required: [${allowedRoles.join(', ')}]`)

    if (!allowedRoles.includes(userRole)) {
      console.log(`requireRole DENIED: User ${req.user.email} with role '${userRole}' not in [${allowedRoles.join(', ')}]`)
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      })
    }

    console.log(`requireRole GRANTED: User ${req.user.email} with role '${userRole}' has access`)
    next()
  }
}

// Middleware to check if user can access specific store
const requireStoreAccess = async (req, res, next) => {
  const storeId = req.params.storeId || req.body.store_id || req.query.store_id
  
  if (!storeId) {
    return res.status(400).json({ error: 'Store ID required' })
  }

  // Super users and accounts can access any store
  if (req.user.role === 'super_user' || req.user.role === 'accounts_incharge') {
    return next()
  }

  // Check if user has access to this store via direct assignment
  if (req.user.store_id === storeId) {
    return next()
  }

  // Check if user manages this store (via stores.manager_id)
  try {
    const { data: managedStore, error } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('manager_id', req.user.id)
      .single()

    if (!error && managedStore) {
      console.log(`Store access granted: User ${req.user.id} manages store ${storeId}`)
      return next()
    }
  } catch (error) {
    console.error('Store access check error:', error)
  }

  // Access denied
  return res.status(403).json({ error: 'Access denied to this store' })
}

// Middleware for admin operations (uses service role)
const useServiceRole = (req, res, next) => {
  req.supabase = supabaseAdmin
  next()
}

module.exports = {
  authenticateUser,
  requireRole,
  requireStoreAccess,
  useServiceRole
}