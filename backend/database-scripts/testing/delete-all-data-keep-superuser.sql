-- =====================================================
-- NUCLEAR OPTION: Delete All Data Except Super User
-- =====================================================
-- This script removes ALL data and keeps only super user
-- 
-- INSTRUCTIONS:
-- 1. First identify your super user ID below
-- 2. Uncomment the DELETE statements to execute
-- =====================================================

-- STEP 1: Find your super user ID
SELECT '=== SUPER USERS ===' as info;
SELECT id, username, email, role FROM users WHERE role = 'super_user';

-- COPY THE SUPER USER ID FROM ABOVE AND PASTE IN THE SCRIPT BELOW
-- Replace 'YOUR_SUPER_USER_ID_HERE' with actual UUID

-- =====================================================
-- NUCLEAR DELETE (UNCOMMENT TO RUN)
-- =====================================================

-- Delete all dependent records first
 DELETE FROM credit_alerts;
 DELETE FROM audit_logs;
 DELETE FROM notification_log;
 DELETE FROM push_notifications;
 DELETE FROM mobile_sessions;
 DELETE FROM offline_sync;
 DELETE FROM device_tokens;

-- Delete all transaction data
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

-- Delete workflow and config data
 DELETE FROM custom_field_values;
 DELETE FROM workflow_instances;
 DELETE FROM alert_configurations;
 DELETE FROM notification_preferences;
 DELETE FROM integration_configs;
 DELETE FROM export_templates;
 DELETE FROM expense_categories WHERE id NOT IN (SELECT unnest(ARRAY[1,2,3,4,5])); -- Keep default categories

-- Delete all users EXCEPT super user
 DELETE FROM users WHERE id != '22164c6a-564e-41bf-a55c-50ab588b9477';

-- Delete all stores
 DELETE FROM stores;

-- Clean up remaining tables
 DELETE FROM custom_fields;
 DELETE FROM workflows;
 DELETE FROM system_settings WHERE setting_key NOT LIKE 'system_%'; -- Keep system settings

-- FINAL VERIFICATION
 SELECT '=== REMAINING DATA ===' as status;
 SELECT 'Users: ' || COUNT(*) as count FROM users;
 SELECT 'Stores: ' || COUNT(*) as count FROM stores;
 SELECT 'Sales: ' || COUNT(*) as count FROM sales;
 SELECT 'Expenses: ' || COUNT(*) as count FROM expenses;

-- Show remaining user
-- SELECT '=== REMAINING USER ===' as info;
 SELECT id, username, email, role FROM users;