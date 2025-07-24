-- =====================================================
-- NUCLEAR DELETE WITH FOREIGN KEY HANDLING
-- =====================================================
-- This script safely deletes all data by temporarily 
-- removing foreign key constraints
-- =====================================================

-- STEP 1: Find your super user ID
SELECT '=== SUPER USERS ===' as info;
SELECT id, username, email, role FROM users WHERE role = 'super_user';

-- STEP 2: Drop problematic foreign key constraints
ALTER TABLE stores DROP CONSTRAINT IF EXISTS fk_stores_manager;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_created_by;

-- STEP 3: Delete all data except super user
DELETE FROM credit_alerts;
DELETE FROM audit_logs;
DELETE FROM notification_log;
DELETE FROM push_notifications;
DELETE FROM mobile_sessions;
DELETE FROM offline_sync;
DELETE FROM device_tokens;
DELETE FROM sales;
DELETE FROM expenses;
DELETE FROM petty_cash;
DELETE FROM daily_reconciliation;
DELETE FROM gift_vouchers;
DELETE FROM damage_reports;
DELETE FROM hand_bills;
DELETE FROM returns;
DELETE FROM sales_orders;
DELETE FROM deposits;
DELETE FROM customers;
DELETE FROM custom_field_values;
DELETE FROM workflow_instances;
DELETE FROM alert_configurations;
DELETE FROM notification_preferences;
DELETE FROM integration_configs;
DELETE FROM export_templates;

-- Delete all users EXCEPT super user (replace with your ID)
DELETE FROM users WHERE id != '22164c6a-564e-41bf-a55c-50ab588b9477';

-- Delete all stores
DELETE FROM stores;

-- Clean up remaining tables
DELETE FROM custom_fields;
DELETE FROM workflows;

-- STEP 4: Recreate the foreign key constraints
ALTER TABLE stores ADD CONSTRAINT fk_stores_manager 
  FOREIGN KEY (manager_id) REFERENCES users(id);

ALTER TABLE users ADD CONSTRAINT fk_users_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id);

-- FINAL VERIFICATION
SELECT '=== CLEANUP COMPLETE ===' as status;
SELECT 'Remaining users: ' || COUNT(*) as count FROM users;
SELECT 'Remaining stores: ' || COUNT(*) as count FROM stores;
SELECT 'Remaining sales: ' || COUNT(*) as count FROM sales;

-- Show your remaining user
SELECT '=== YOUR REMAINING USER ===' as info;
SELECT id, username, email, role FROM users;