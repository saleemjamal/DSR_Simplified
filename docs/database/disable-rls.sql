-- =================================================================
-- DISABLE ROW LEVEL SECURITY FOR APPLICATION LOGIC TESTING
-- Poppat Jamals Daily Reporting System
-- =================================================================

-- IMPORTANT: This script temporarily disables RLS for testing
-- Remember to re-enable RLS after testing application logic!

-- =================================================================
-- CORE OPERATIONAL TABLES
-- =================================================================

-- Disable RLS on main business tables
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- =================================================================
-- FINANCIAL TABLES
-- =================================================================Q

ALTER TABLE petty_cash DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reconciliation DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_vouchers DISABLE ROW LEVEL SECURITY;

-- =================================================================
-- REPORTING TABLES
-- =================================================================

ALTER TABLE damage_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- =================================================================
-- SYSTEM CONFIGURATION TABLES
-- =================================================================

ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;

-- =================================================================
-- OPTIONAL ADVANCED FEATURE TABLES (if they exist)
-- =================================================================

-- Only disable if these tables exist in your database
-- You can comment out any that don't exist

-- Workflow tables
ALTER TABLE custom_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances DISABLE ROW LEVEL SECURITY;

-- Integration tables
ALTER TABLE integration_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates DISABLE ROW LEVEL SECURITY;

-- Notification tables
ALTER TABLE alert_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log DISABLE ROW LEVEL SECURITY;

-- Mobile app tables
ALTER TABLE device_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications DISABLE ROW LEVEL SECURITY;

-- =================================================================
-- VERIFICATION QUERY
-- =================================================================

-- Run this to verify which tables have RLS disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'stores', 'users', 'sales', 'expenses', 'petty_cash', 
    'daily_reconciliation', 'gift_vouchers', 'damage_reports',
    'audit_logs', 'system_settings', 'expense_categories'
  )
ORDER BY tablename;

-- =================================================================
-- NOTES FOR LATER
-- =================================================================

/*
REMEMBER TO RE-ENABLE RLS AFTER TESTING:

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

Then apply the new RBAC policies from RBAC_RLS_POLICIES_NEW.sql
*/