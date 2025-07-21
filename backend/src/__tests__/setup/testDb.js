// Database setup for tests
import { createClient } from '@supabase/supabase-js'

// Test database configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for tests')
}

// Create Supabase client for tests
export const testSupabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data cleanup utilities
export const testDbUtils = {
  // Clean up test data after tests (in dependency order)
  async cleanup() {
    try {
      // Clean up in reverse dependency order to avoid foreign key constraint violations
      
      // 1. Clean up sales (references users and stores)
      await testSupabase
        .from('sales')
        .delete()
        .like('transaction_reference', 'test_%')
      
      // 2. Clean up customers
      await testSupabase
        .from('customers')
        .delete()
        .like('customer_email', '%test%')
      
      // 3. Clean up test users (but preserve users referenced by stores)
      await testSupabase
        .from('users')
        .delete()
        .like('email', '%test%')
        .neq('role', 'super_user') // Keep super users for subsequent tests
      
      // 4. Clean up test stores (do this last since users may reference them)
      await testSupabase
        .from('stores')
        .delete()
        .like('store_code', 'T%')
      
    } catch (error) {
      console.warn('Test cleanup warning:', error.message)
    }
  },

  // Create test user
  async createTestUser(userData = {}) {
    const timestamp = Date.now()
    const defaultUser = {
      username: `testuser_${timestamp}`,
      email: userData.email || `test_${timestamp}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      role: userData.role || 'cashier', // Use provided role or default to cashier
      authentication_type: 'local',
      is_active: true,
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfYK4uSHdqnLQja', // 'password123'
      created_at: new Date().toISOString()
    }

    const user = { ...defaultUser, ...userData }
    
    const { data, error } = await testSupabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Create test customer
  async createTestCustomer(customerData = {}) {
    const timestamp = Date.now()
    const defaultCustomer = {
      customer_name: 'Test Customer',
      customer_email: `customer_${timestamp}@test.com`,
      customer_phone: `123456${timestamp.toString().slice(-4)}`,
      credit_limit: 1000.00,
      total_outstanding: 0.00,
      created_date: new Date().toISOString().split('T')[0]
    }

    const customer = { ...defaultCustomer, ...customerData }
    
    const { data, error } = await testSupabase
      .from('customers')
      .insert(customer)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Create test store
  async createTestStore(storeData = {}) {
    const timestamp = Date.now()
    const defaultStore = {
      store_code: `T${timestamp.toString().slice(-3)}`, // Limit to 4 chars total (T + 3 digits)
      store_name: `Test Store ${timestamp}`,
      is_active: true,
      address: 'Test Address',
      phone: '1234567890',
      timezone: 'UTC',
      daily_deadline_time: '12:00:00',
      petty_cash_limit: 5000.00
    }

    const store = { ...defaultStore, ...storeData }
    
    const { data, error } = await testSupabase
      .from('stores')
      .insert(store)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Create test sale
  async createTestSale(saleData = {}) {
    const defaultSale = {
      tender_type: 'cash',
      amount: 100.00,
      sale_date: new Date().toISOString().split('T')[0],
      entered_by: saleData.entered_by || null, // Must be provided by caller
      approval_status: 'pending',
      transaction_reference: null,
      customer_reference: null,
      notes: null
    }

    const sale = { ...defaultSale, ...saleData }
    
    const { data, error } = await testSupabase
      .from('sales')
      .insert(sale)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Helper to get isolated test schema (if using schema-based isolation)
export const getTestSchema = () => {
  return process.env.TEST_SCHEMA || 'public'
}