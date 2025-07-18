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

    if (!token) {
      return res.status(400).json({ error: 'Google token required' })
    }

    // Verify Google token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    // Check if user exists in our system
    const { data: systemUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', user.email)
      .eq('authentication_type', 'google_sso')
      .eq('is_active', true)
      .single()

    if (userError || !systemUser) {
      return res.status(401).json({ 
        error: 'User not found in system. Contact administrator.' 
      })
    }

    // Check if email domain is allowed (@poppatjamals.com)
    if (!user.email.endsWith('@poppatjamals.com')) {
      return res.status(403).json({ 
        error: 'Only @poppatjamals.com email addresses are allowed' 
      })
    }

    // Update last login and Google workspace ID
    await supabaseAdmin
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        google_workspace_id: user.id
      })
      .eq('id', systemUser.id)

    res.json({
      user: systemUser,
      token,
      authentication_type: 'google_sso'
    })
  } catch (error) {
    console.error('Google login error:', error)
    res.status(500).json({ error: 'Google login failed' })
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

module.exports = router