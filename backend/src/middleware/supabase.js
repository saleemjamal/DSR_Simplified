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

    // First try to verify as local JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      userId = decoded.sub
    } catch (jwtError) {
      // If JWT verification fails, try as Supabase token
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
      
      userId = user.id
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

    // Set user context for RLS and audit logging
    try {
      await supabase.rpc('set_config', {
        parameter: 'app.current_user_id',
        value: userId
      })

      await supabase.rpc('set_config', {
        parameter: 'app.current_user_store_id', 
        value: userDetails.store_id || ''
      })

      await supabase.rpc('set_config', {
        parameter: 'app.client_ip',
        value: req.ip || req.connection.remoteAddress
      })

      await supabase.rpc('set_config', {
        parameter: 'app.user_agent',
        value: req.headers['user-agent'] || ''
      })
    } catch (rpcError) {
      console.warn('RPC configuration warning:', rpcError.message)
      // Continue without RPC configuration if it fails
    }

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

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      })
    }

    next()
  }
}

// Middleware to check if user can access specific store
const requireStoreAccess = (req, res, next) => {
  const storeId = req.params.storeId || req.body.store_id || req.query.store_id
  
  if (!storeId) {
    return res.status(400).json({ error: 'Store ID required' })
  }

  // Super users can access any store
  if (req.user.role === 'super_user') {
    return next()
  }

  // Other users can only access their own store
  if (req.user.store_id !== storeId) {
    return res.status(403).json({ error: 'Access denied to this store' })
  }

  next()
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