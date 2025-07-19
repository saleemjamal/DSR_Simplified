const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { supabase, supabaseAdmin } = require('../config/supabase')
const { authenticateUser, requireRole } = require('../middleware/supabase')

// Local login for cashiers
router.post('/login/local', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('authentication_type', 'local')
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        sub: user.id,
        username: user.username,
        role: user.role,
        store_id: user.store_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Return user data (without password hash)
    const { password_hash, ...userWithoutPassword } = user

    res.json({
      user: userWithoutPassword,
      token,
      authentication_type: 'local'
    })
  } catch (error) {
    console.error('Local login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Google SSO callback (for managers/admin)
router.post('/login/google', async (req, res) => {
  try {
    const { token } = req.body
    console.log('Google login attempt with token:', token?.substring(0, 50) + '...')

    if (!token) {
      return res.status(400).json({ error: 'Google token required' })
    }

    // Verify Google token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    console.log('Supabase auth result:', { user: user?.email, error: error?.message })
    
    if (error || !user) {
      console.error('Supabase auth error:', error)
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    // Check if email domain is allowed (@poppatjamals.com) - Do this FIRST
    if (!user.email.endsWith('@poppatjamals.com')) {
      return res.status(403).json({ 
        error: 'Only @poppatjamals.com email addresses are allowed' 
      })
    }

    // Check if user exists in our system
    const { data: systemUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', user.email)
      .eq('authentication_type', 'google_sso')
      .eq('is_active', true)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for new users
      throw userError
    }

    let finalUser = systemUser

    // If user doesn't exist, create them automatically
    if (!systemUser) {
      const role = determineRoleFromEmail(user.email)
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          username: user.email.split('@')[0], // Use email prefix as username
          email: user.email,
          first_name: user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0],
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          role: role,
          authentication_type: 'google_sso',
          is_active: true,
          store_id: null, // Will be assigned by admin
          google_workspace_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }
      
      finalUser = newUser
    }

    // Update last login and Google workspace ID  
    await supabaseAdmin
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        google_workspace_id: user.id
      })
      .eq('id', finalUser.id)

    // Create our own JWT token for the authenticated user
    const jwtToken = jwt.sign(
      { 
        sub: finalUser.id,
        email: finalUser.email,
        role: finalUser.role,
        store_id: finalUser.store_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      user: finalUser,
      token: jwtToken,
      authentication_type: 'google_sso'
    })
  } catch (error) {
    console.error('Google login error:', error)
    res.status(500).json({ error: 'Google login failed' })
  }
})

// Create user account (comprehensive endpoint for all roles)
router.post('/users', authenticateUser, async (req, res) => {
  try {
    const { username, password, email, first_name, last_name, role, store_id } = req.body

    console.log('POST /users - Request body:', req.body)
    console.log('POST /users - User context:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      userStoreId: req.user?.store_id
    })

    // Validation
    if (!username || !email || !first_name || !last_name || !role) {
      return res.status(400).json({ 
        error: 'Username, email, first name, last name, and role are required' 
      })
    }

    // Password only required for cashiers (local auth)
    if (role === 'cashier' && !password) {
      return res.status(400).json({ 
        error: 'Password is required for cashier accounts' 
      })
    }

    // Role-based permission checks
    if (req.user.role === 'store_manager') {
      // Store managers can only create cashiers for their own store
      if (role !== 'cashier') {
        return res.status(403).json({ 
          error: 'Store managers can only create cashier accounts' 
        })
      }
      if (!req.user.store_id) {
        return res.status(400).json({ 
          error: 'Store manager must be assigned to a store' 
        })
      }
      // Force store assignment to manager's store
      store_id = req.user.store_id
    } else if (req.user.role === 'super_user') {
      // Super users can create any role
      // Store assignment logic:
      // - super_user and accounts_incharge: store_id should be null for multi-store access
      // - store_manager and cashier: store_id can be provided or assigned later
      if (role === 'super_user' || role === 'accounts_incharge') {
        store_id = null // Multi-store access
      } else if (role === 'store_manager' || role === 'cashier') {
        // Use provided store_id or null (to be assigned later)
        store_id = store_id || null
      }
    } else {
      return res.status(403).json({ 
        error: 'Insufficient permissions to create user accounts' 
      })
    }

    // Determine authentication type and password handling
    let password_hash = null
    let authentication_type = 'google_sso'
    
    if (role === 'cashier') {
      // Cashiers use local authentication with password
      password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12)
      authentication_type = 'local'
    }

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        username,
        password_hash,
        email,
        first_name,
        last_name,
        role,
        store_id,
        authentication_type,
        created_by: req.user.id
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        if (error.constraint?.includes('username')) {
          return res.status(409).json({ error: 'Username already exists' })
        }
        if (error.constraint?.includes('email')) {
          return res.status(409).json({ error: 'Email already exists' })
        }
        return res.status(409).json({ error: 'User already exists' })
      }
      throw error
    }

    // Return user without password hash
    const { password_hash: _, ...userWithoutPassword } = newUser

    res.status(201).json({
      message: `${role} account created successfully`,
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ error: 'Failed to create user account' })
  }
})

// Create cashier account (store managers only)
router.post('/users/cashier', authenticateUser, requireRole('store_manager'), async (req, res) => {
  try {
    const { username, password, first_name, last_name } = req.body

    if (!username || !password || !first_name || !last_name) {
      return res.status(400).json({ 
        error: 'Username, password, first name and last name are required' 
      })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12)

    // Create cashier user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        username,
        password_hash,
        first_name,
        last_name,
        role: 'cashier',
        store_id: req.user.store_id,
        authentication_type: 'local',
        created_by: req.user.id
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username already exists' })
      }
      throw error
    }

    // Return user without password hash
    const { password_hash: _, ...userWithoutPassword } = newUser

    res.status(201).json({
      message: 'Cashier account created successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Create cashier error:', error)
    res.status(500).json({ error: 'Failed to create cashier account' })
  }
})

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    // Get user with store details
    const { data: userWithStore, error } = await req.supabase
      .from('users')
      .select(`
        *,
        stores (
          store_code,
          store_name,
          address,
          phone
        )
      `)
      .eq('id', req.user.id)
      .single()

    if (error) {
      throw error
    }

    res.json(userWithStore)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to get user profile' })
  }
})

// Update user preferences
router.patch('/profile/preferences', authenticateUser, async (req, res) => {
  try {
    const { preferences } = req.body

    const { data: updatedUser, error } = await req.supabase
      .from('users')
      .update({ preferences })
      .eq('id', req.user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: 'Preferences updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

// Get all users (for managers, accounts, super users)
router.get('/users', authenticateUser, requireRole(['store_manager', 'accounts_incharge', 'super_user']), async (req, res) => {
  try {
    let query = req.supabase
      .from('users')
      .select(`
        id,
        username,
        first_name,
        last_name,
        email,
        role,
        authentication_type,
        is_active,
        last_login,
        created_at,
        created_by,
        stores!users_store_id_fkey (
          store_code,
          store_name
        )
      `)

    // Super users and accounts_incharge can see all users
    // Store managers can only see users in their store
    if (req.user.role === 'store_manager') {
      if (!req.user.store_id) {
        return res.status(400).json({ 
          error: 'Store manager not assigned to a store. Contact admin.' 
        })
      }
      query = query.eq('store_id', req.user.store_id)
    }

    const { data: users, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    res.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
})

// Update user status (activate/deactivate)
router.patch('/users/:userId/status', authenticateUser, requireRole(['super_user', 'store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { userId } = req.params
    const { is_active } = req.body

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' })
    }

    const { data: updatedUser, error } = await req.supabase
      .from('users')
      .update({ is_active })
      .eq('id', userId)
      .eq('store_id', req.user.store_id) // Ensure user is in same store
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    })
  } catch (error) {
    console.error('Update user status error:', error)
    res.status(500).json({ error: 'Failed to update user status' })
  }
})

// Reset user password (for local users)
router.patch('/users/:userId/password', authenticateUser, requireRole(['super_user', 'store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { userId } = req.params
    const { new_password } = req.body

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Hash new password
    const password_hash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12)

    const { data: updatedUser, error } = await req.supabase
      .from('users')
      .update({ password_hash })
      .eq('id', userId)
      .eq('store_id', req.user.store_id) // Ensure user is in same store
      .eq('authentication_type', 'local') // Only local users can have password reset
      .select('id, username, first_name, last_name, role')
      .single()

    if (error) {
      throw error
    }

    res.json({
      message: 'Password reset successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Logout (for session cleanup)
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    // If using Google SSO, sign out from Supabase
    if (req.user.authentication_type === 'google_sso') {
      await supabase.auth.signOut()
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// Helper function to determine role from email patterns
const determineRoleFromEmail = (email) => {
  // Define role mapping based on email patterns
  if (email.includes('admin') || email.includes('super') || email === 'saleem@poppatjamals.com') {
    return 'super_user'
  } else if (email.includes('accounts') || email.includes('finance')) {
    return 'accounts_incharge'
  } else {
    return 'store_manager' // Default for @poppatjamals.com users
  }
}

// Update user details
router.patch('/users/:userId', authenticateUser, requireRole(['super_user', 'store_manager', 'accounts_incharge']), async (req, res) => {
  try {
    const { userId } = req.params
    const { first_name, last_name, role, is_active } = req.body

    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({ 
        error: 'First name and last name are required' 
      })
    }

    // Role change restrictions
    if (role && req.user.role !== 'super_user') {
      // Only super users can change roles
      return res.status(403).json({ 
        error: 'Only super users can change user roles' 
      })
    }

    // Validate role if provided
    if (role && !['cashier', 'store_manager', 'accounts_incharge', 'super_user'].includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role specified' 
      })
    }

    // Update user data
    const updateData = {
      first_name,
      last_name,
      updated_at: new Date().toISOString()
    }

    // Only add role and is_active if provided and user has permission
    if (role !== undefined && req.user.role === 'super_user') {
      updateData.role = role
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data: updatedUser, error } = await req.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        username,
        first_name,
        last_name,
        email,
        role,
        authentication_type,
        is_active,
        last_login,
        created_at,
        stores!users_store_id_fkey (
          store_code,
          store_name
        )
      `)
      .single()

    if (error) {
      throw error
    }

    // Return user without sensitive data
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

module.exports = router