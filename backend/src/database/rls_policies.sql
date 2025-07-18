-- =================================================================
-- ROW LEVEL SECURITY POLICIES
-- Poppat Jamals Daily Reporting System
-- =================================================================

-- Enable Row Level Security on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- HELPER FUNCTIONS FOR RLS
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
  RETURN (
    SELECT CASE 
      WHEN role = 'super_user' THEN true 
      ELSE false 
    END
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STORES TABLE RLS POLICIES
-- =================================================================

-- Super users can see all stores
CREATE POLICY "Super users can view all stores" ON stores
  FOR SELECT USING (is_super_user());

-- Store managers and accounts incharge can see their own store
CREATE POLICY "Users can view their own store" ON stores
  FOR SELECT USING (
    id = get_user_store_id() OR is_super_user()
  );

-- Only super users can insert/update/delete stores
CREATE POLICY "Only super users can modify stores" ON stores
  FOR ALL USING (is_super_user());

-- =================================================================
-- USERS TABLE RLS POLICIES
-- =================================================================

-- Users can see their own record
CREATE POLICY "Users can view their own record" ON users
  FOR SELECT USING (id = auth.uid());

-- Store managers can see users in their store
CREATE POLICY "Store managers can view store users" ON users
  FOR SELECT USING (
    store_id = get_user_store_id() AND 
    get_user_role() IN ('store_manager', 'accounts_incharge', 'super_user')
  );

-- Super users can see all users
CREATE POLICY "Super users can view all users" ON users
  FOR SELECT USING (is_super_user());

-- Store managers can create cashier accounts for their store
CREATE POLICY "Store managers can create cashiers" ON users
  FOR INSERT WITH CHECK (
    store_id = get_user_store_id() AND 
    role = 'cashier' AND 
    get_user_role() = 'store_manager'
  );

-- Users can update their own record (limited fields)
CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (id = auth.uid());

-- Super users can modify any user
CREATE POLICY "Super users can modify any user" ON users
  FOR ALL USING (is_super_user());

-- =================================================================
-- SALES TABLE RLS POLICIES
-- =================================================================

-- Users can only see sales from their store
CREATE POLICY "Users can view sales from their store" ON sales
  FOR SELECT USING (
    store_id = get_user_store_id() OR is_super_user()
  );

-- Users can insert sales for their store
CREATE POLICY "Users can insert sales for their store" ON sales
  FOR INSERT WITH CHECK (
    store_id = get_user_store_id() AND
    entered_by = auth.uid()
  );

-- Users can update sales they entered (if not approved)
CREATE POLICY "Users can update their own sales" ON sales
  FOR UPDATE USING (
    entered_by = auth.uid() AND 
    approval_status = 'pending'
  );

-- Store managers can approve sales in their store
CREATE POLICY "Store managers can approve sales" ON sales
  FOR UPDATE USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- EXPENSES TABLE RLS POLICIES
-- =================================================================

-- Users can view expenses from their store
CREATE POLICY "Users can view expenses from their store" ON expenses
  FOR SELECT USING (
    store_id = get_user_store_id() OR is_super_user()
  );

-- Users can insert expenses for their store
CREATE POLICY "Users can insert expenses for their store" ON expenses
  FOR INSERT WITH CHECK (
    store_id = get_user_store_id() AND
    requested_by = auth.uid()
  );

-- Users can update expenses they requested (if not approved)
CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (
    requested_by = auth.uid() AND 
    approval_status = 'pending'
  );

-- Store managers can approve expenses in their store
CREATE POLICY "Store managers can approve expenses" ON expenses
  FOR UPDATE USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- PETTY CASH TABLE RLS POLICIES
-- =================================================================

-- Users can view petty cash from their store
CREATE POLICY "Users can view petty cash from their store" ON petty_cash
  FOR SELECT USING (
    store_id = get_user_store_id() OR is_super_user()
  );

-- Store managers can manage petty cash for their store
CREATE POLICY "Store managers can manage petty cash" ON petty_cash
  FOR ALL USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- DAILY RECONCILIATION TABLE RLS POLICIES
-- =================================================================

-- Users can view reconciliation from their store
CREATE POLICY "Users can view reconciliation from their store" ON daily_reconciliation
  FOR SELECT USING (
    store_id = get_user_store_id() OR is_super_user()
  );

-- Store managers can manage reconciliation for their store
CREATE POLICY "Store managers can manage reconciliation" ON daily_reconciliation
  FOR ALL USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- GIFT VOUCHERS TABLE RLS POLICIES
-- =================================================================

-- Users can view vouchers from their store
CREATE POLICY "Users can view vouchers from their store" ON gift_vouchers
  FOR SELECT USING (
    store_id = get_user_store_id() OR is_super_user()
  );

-- Store managers can manage vouchers for their store
CREATE POLICY "Store managers can manage vouchers" ON gift_vouchers
  FOR ALL USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- DAMAGE REPORTS TABLE RLS POLICIES
-- =================================================================

-- Users can view damage reports from their store
CREATE POLICY "Users can view damage reports from their store" ON damage_reports
  FOR SELECT USING (
    store_id = get_user_store_id() OR is_super_user()
  );

-- Users can create damage reports for their store
CREATE POLICY "Users can create damage reports for their store" ON damage_reports
  FOR INSERT WITH CHECK (
    store_id = get_user_store_id() AND
    reported_by = auth.uid()
  );

-- Store managers can manage damage reports for their store
CREATE POLICY "Store managers can manage damage reports" ON damage_reports
  FOR ALL USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- NOTIFICATION AND ALERT POLICIES
-- =================================================================

-- Users can view their own notification preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notification preferences
CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Users can view their own device tokens
CREATE POLICY "Users can view their own device tokens" ON device_tokens
  FOR ALL USING (user_id = auth.uid());

-- Users can view their own mobile sessions
CREATE POLICY "Users can view their own mobile sessions" ON mobile_sessions
  FOR ALL USING (user_id = auth.uid());

-- Users can view their own offline sync data
CREATE POLICY "Users can view their own offline sync data" ON offline_sync
  FOR ALL USING (user_id = auth.uid());

-- =================================================================
-- SYSTEM AND ADMIN POLICIES
-- =================================================================

-- Super users can view all audit logs
CREATE POLICY "Super users can view all audit logs" ON audit_logs
  FOR SELECT USING (is_super_user());

-- Users can view audit logs for their store
CREATE POLICY "Users can view audit logs for their store" ON audit_logs
  FOR SELECT USING (
    store_id = get_user_store_id() AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- Super users can manage system settings
CREATE POLICY "Super users can manage system settings" ON system_settings
  FOR ALL USING (is_super_user());

-- Store managers can view system settings for their store
CREATE POLICY "Store managers can view system settings" ON system_settings
  FOR SELECT USING (
    (store_id = get_user_store_id() OR store_id IS NULL) AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- =================================================================
-- EXTENSIBILITY POLICIES
-- =================================================================

-- Users can view custom fields for their store
CREATE POLICY "Users can view custom fields for their store" ON custom_fields
  FOR SELECT USING (
    (store_id = get_user_store_id() OR store_id IS NULL) OR is_super_user()
  );

-- Store managers can manage custom fields for their store
CREATE POLICY "Store managers can manage custom fields" ON custom_fields
  FOR ALL USING (
    (store_id = get_user_store_id() OR store_id IS NULL) AND
    get_user_role() IN ('store_manager', 'accounts_incharge')
  );

-- Users can view custom field values they have access to
CREATE POLICY "Users can view accessible custom field values" ON custom_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM custom_fields cf 
      WHERE cf.id = custom_field_id 
      AND ((cf.store_id = get_user_store_id() OR cf.store_id IS NULL) OR is_super_user())
    )
  );

-- Users can manage custom field values for entities they can access
CREATE POLICY "Users can manage accessible custom field values" ON custom_field_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM custom_fields cf 
      WHERE cf.id = custom_field_id 
      AND ((cf.store_id = get_user_store_id() OR cf.store_id IS NULL) OR is_super_user())
    )
  );