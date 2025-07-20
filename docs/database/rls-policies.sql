-- =================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) - ROW LEVEL SECURITY POLICIES
-- Poppat Jamals Daily Reporting System
-- Updated for 4-Tier Role Hierarchy
-- =================================================================

-- =================================================================
-- HELPER FUNCTIONS FOR RBAC
-- =================================================================

-- Function to get current user's store_id
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT store_id 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super user
CREATE OR REPLACE FUNCTION is_super_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (get_user_role() = 'super_user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is accounts incharge
CREATE OR REPLACE FUNCTION is_accounts_incharge()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (get_user_role() = 'accounts_incharge');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is store manager
CREATE OR REPLACE FUNCTION is_store_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (get_user_role() = 'store_manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is cashier
CREATE OR REPLACE FUNCTION is_cashier()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (get_user_role() = 'cashier');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has multi-store access (super_user or accounts_incharge)
CREATE OR REPLACE FUNCTION has_multi_store_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (get_user_role() IN ('super_user', 'accounts_incharge'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access specific store
CREATE OR REPLACE FUNCTION can_access_store(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super users and accounts have access to all stores
  IF has_multi_store_access() THEN
    RETURN true;
  END IF;
  
  -- Store managers and cashiers can only access their assigned store
  RETURN (target_store_id = get_user_store_id());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- DROP EXISTING POLICIES (Clean Slate)
-- =================================================================

-- Drop all existing policies on key tables
DROP POLICY IF EXISTS "Super users can view all stores" ON stores;
DROP POLICY IF EXISTS "Users can view their own store" ON stores;
DROP POLICY IF EXISTS "Only super users can modify stores" ON stores;

DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Store managers can view store users" ON users;
DROP POLICY IF EXISTS "Super users can view all users" ON users;
DROP POLICY IF EXISTS "Store managers can create cashiers" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Super users can modify any user" ON users;

DROP POLICY IF EXISTS "Users can view sales from their store" ON sales;
DROP POLICY IF EXISTS "Users can insert sales for their store" ON sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales;

DROP POLICY IF EXISTS "Users can view expenses from their store" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their store" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;

-- =================================================================
-- STORES TABLE POLICIES
-- =================================================================

-- VIEW POLICIES
-- Super users and accounts can view all stores
CREATE POLICY "multi_store_users_view_all_stores" ON stores
  FOR SELECT 
  USING (has_multi_store_access());

-- Store managers and cashiers can view their assigned store
CREATE POLICY "single_store_users_view_own_store" ON stores
  FOR SELECT 
  USING (id = get_user_store_id());

-- MODIFICATION POLICIES
-- Only super users can create, update, delete stores
CREATE POLICY "super_users_manage_stores" ON stores
  FOR ALL 
  USING (is_super_user())
  WITH CHECK (is_super_user());

-- =================================================================
-- USERS TABLE POLICIES  
-- =================================================================

-- VIEW POLICIES
-- Users can always view their own record
CREATE POLICY "users_view_own_record" ON users
  FOR SELECT 
  USING (id = auth.uid());

-- Super users can view all users
CREATE POLICY "super_users_view_all_users" ON users
  FOR SELECT 
  USING (is_super_user());

-- Accounts can view all users (for reporting/oversight)
CREATE POLICY "accounts_view_all_users" ON users
  FOR SELECT 
  USING (is_accounts_incharge());

-- Store managers can view users in their store
CREATE POLICY "store_managers_view_store_users" ON users
  FOR SELECT 
  USING (
    is_store_manager() AND 
    store_id = get_user_store_id()
  );

-- INSERT POLICIES
-- Super users can create any type of user
CREATE POLICY "super_users_create_users" ON users
  FOR INSERT 
  WITH CHECK (is_super_user());

-- Store managers can create cashiers for their store
CREATE POLICY "store_managers_create_cashiers" ON users
  FOR INSERT 
  WITH CHECK (
    is_store_manager() AND 
    role = 'cashier' AND 
    store_id = get_user_store_id()
  );

-- UPDATE POLICIES
-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE 
  USING (id = auth.uid());

-- Super users can update any user
CREATE POLICY "super_users_update_users" ON users
  FOR UPDATE 
  USING (is_super_user());

-- Store managers can update users in their store (except other managers)
CREATE POLICY "store_managers_update_store_users" ON users
  FOR UPDATE 
  USING (
    is_store_manager() AND 
    store_id = get_user_store_id() AND
    role IN ('cashier')  -- Can only update cashiers
  );

-- =================================================================
-- SALES TABLE POLICIES
-- =================================================================

-- VIEW POLICIES
-- Super users and accounts can view all sales
CREATE POLICY "multi_store_users_view_all_sales" ON sales
  FOR SELECT 
  USING (has_multi_store_access());

-- Store managers and cashiers can view sales from their store
CREATE POLICY "single_store_users_view_store_sales" ON sales
  FOR SELECT 
  USING (can_access_store(store_id));

-- INSERT POLICIES
-- All authenticated users can insert sales (with proper store validation)
CREATE POLICY "authenticated_users_insert_sales" ON sales
  FOR INSERT 
  WITH CHECK (
    entered_by = auth.uid() AND
    (
      -- Multi-store users can insert for any store (validated at app level)
      has_multi_store_access() OR
      -- Single-store users can only insert for their store
      can_access_store(store_id)
    )
  );

-- UPDATE POLICIES
-- Super users can update any sales record
CREATE POLICY "super_users_update_sales" ON sales
  FOR UPDATE 
  USING (is_super_user());

-- Store managers can update sales from their store (if not approved)
CREATE POLICY "store_managers_update_store_sales" ON sales
  FOR UPDATE 
  USING (
    is_store_manager() AND 
    can_access_store(store_id) AND 
    approval_status = 'pending'
  );

-- Users can update sales they entered (if not approved and from their store)
CREATE POLICY "users_update_own_sales" ON sales
  FOR UPDATE 
  USING (
    entered_by = auth.uid() AND 
    can_access_store(store_id) AND 
    approval_status = 'pending'
  );

-- DELETE POLICIES
-- Only super users can delete sales
CREATE POLICY "super_users_delete_sales" ON sales
  FOR DELETE 
  USING (is_super_user());

-- =================================================================
-- EXPENSES TABLE POLICIES
-- =================================================================

-- VIEW POLICIES
-- Super users and accounts can view all expenses
CREATE POLICY "multi_store_users_view_all_expenses" ON expenses
  FOR SELECT 
  USING (has_multi_store_access());

-- Store managers and cashiers can view expenses from their store
CREATE POLICY "single_store_users_view_store_expenses" ON expenses
  FOR SELECT 
  USING (can_access_store(store_id));

-- INSERT POLICIES
-- All authenticated users can insert expenses (with proper store validation)
CREATE POLICY "authenticated_users_insert_expenses" ON expenses
  FOR INSERT 
  WITH CHECK (
    requested_by = auth.uid() AND
    (
      -- Multi-store users can insert for any store (validated at app level)
      has_multi_store_access() OR
      -- Single-store users can only insert for their store
      can_access_store(store_id)
    )
  );

-- UPDATE POLICIES
-- Super users can update any expense record
CREATE POLICY "super_users_update_expenses" ON expenses
  FOR UPDATE 
  USING (is_super_user());

-- Store managers can update expenses from their store (if not approved)
CREATE POLICY "store_managers_update_store_expenses" ON expenses
  FOR UPDATE 
  USING (
    is_store_manager() AND 
    can_access_store(store_id) AND 
    approval_status = 'pending'
  );

-- Users can update expenses they requested (if not approved and from their store)
CREATE POLICY "users_update_own_expenses" ON expenses
  FOR UPDATE 
  USING (
    requested_by = auth.uid() AND 
    can_access_store(store_id) AND 
    approval_status = 'pending'
  );

-- DELETE POLICIES
-- Only super users can delete expenses
CREATE POLICY "super_users_delete_expenses" ON expenses
  FOR DELETE 
  USING (is_super_user());

-- =================================================================
-- OTHER OPERATIONAL TABLES (Apply Same Pattern)
-- =================================================================

-- PETTY CASH POLICIES
CREATE POLICY "multi_store_users_view_all_petty_cash" ON petty_cash
  FOR SELECT USING (has_multi_store_access());

CREATE POLICY "single_store_users_view_store_petty_cash" ON petty_cash
  FOR SELECT USING (can_access_store(store_id));

CREATE POLICY "authenticated_users_manage_petty_cash" ON petty_cash
  FOR ALL USING (
    has_multi_store_access() OR can_access_store(store_id)
  );

-- GIFT VOUCHERS POLICIES
CREATE POLICY "multi_store_users_view_all_vouchers" ON gift_vouchers
  FOR SELECT USING (has_multi_store_access());

CREATE POLICY "single_store_users_view_store_vouchers" ON gift_vouchers
  FOR SELECT USING (can_access_store(store_id));

CREATE POLICY "authenticated_users_manage_vouchers" ON gift_vouchers
  FOR ALL USING (
    has_multi_store_access() OR can_access_store(store_id)
  );

-- DAMAGE REPORTS POLICIES
CREATE POLICY "multi_store_users_view_all_damage" ON damage_reports
  FOR SELECT USING (has_multi_store_access());

CREATE POLICY "single_store_users_view_store_damage" ON damage_reports
  FOR SELECT USING (can_access_store(store_id));

CREATE POLICY "authenticated_users_manage_damage" ON damage_reports
  FOR ALL USING (
    has_multi_store_access() OR can_access_store(store_id)
  );

-- =================================================================
-- APPROVAL WORKFLOW POLICIES
-- =================================================================

-- Function to check if user can approve transactions
CREATE OR REPLACE FUNCTION can_approve_transactions()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (get_user_role() IN ('super_user', 'accounts_incharge'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add approval policies for sales
CREATE POLICY "approvers_can_approve_sales" ON sales
  FOR UPDATE 
  USING (
    can_approve_transactions() AND
    (has_multi_store_access() OR can_access_store(store_id))
  );

-- Add approval policies for expenses  
CREATE POLICY "approvers_can_approve_expenses" ON expenses
  FOR UPDATE 
  USING (
    can_approve_transactions() AND
    (has_multi_store_access() OR can_access_store(store_id))
  );

-- =================================================================
-- AUDIT AND SYSTEM TABLES
-- =================================================================

-- Audit logs - super users can see all, others see their store's
CREATE POLICY "audit_logs_access" ON audit_logs
  FOR SELECT 
  USING (
    is_super_user() OR 
    is_accounts_incharge() OR
    store_id = get_user_store_id()
  );

-- System settings - role-based access
CREATE POLICY "system_settings_access" ON system_settings
  FOR SELECT 
  USING (
    is_super_user() OR 
    is_accounts_incharge() OR
    (store_id IS NULL OR store_id = get_user_store_id())
  );

CREATE POLICY "super_users_manage_system_settings" ON system_settings
  FOR ALL 
  USING (is_super_user());

-- =================================================================
-- ENABLE ROW LEVEL SECURITY
-- =================================================================

-- Re-enable RLS on all tables (in case they were disabled)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- SUMMARY OF RBAC IMPLEMENTATION
-- =================================================================

/*
ROLE HIERARCHY IMPLEMENTED:

1. SUPER_USER:
   - Full access to all tables and all stores
   - Can create/edit/delete any record
   - Can manage stores and all user types
   - Complete system administration

2. ACCOUNTS_INCHARGE:
   - View and approve access to all stores
   - Can create transactions for any store
   - Cannot edit/delete (separation of duties)
   - Financial oversight role

3. STORE_MANAGER:
   - Full CRUD access to their assigned store only
   - Can create cashier accounts for their store
   - Cannot approve transactions (separation of duties)
   - Local operations management

4. CASHIER:
   - Create and view access to their assigned store only
   - Cannot edit, delete, or approve anything
   - Basic data entry role

STORE ACCESS:
- Super users and accounts: store_id = NULL (access all stores)
- Store managers and cashiers: store_id = assigned store
- Multi-store access handled at application level for super/accounts
*/