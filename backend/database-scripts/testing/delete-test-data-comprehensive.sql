-- =====================================================
-- Comprehensive Delete Test Data Script for Supabase
-- =====================================================
-- This script removes ALL test data from the database
-- including records created by test users
-- 
-- INSTRUCTIONS:
-- 1. Run the preview queries first to see what will be deleted
-- 2. Uncomment the DELETE statements at the bottom
-- 3. Run again to delete the data
-- =====================================================

-- PREVIEW SECTION - See what will be deleted
-- =====================================================

-- Show test stores
SELECT '=== TEST STORES TO BE DELETED ===' as section;
SELECT id, store_name, created_at 
FROM stores 
WHERE LOWER(store_name) LIKE '%test%'
ORDER BY store_name;

-- Show test users (from test stores)
SELECT '=== TEST USERS TO BE DELETED ===' as section;
SELECT id, username, email, role, store_id
FROM users 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
ORDER BY username;

-- Count ALL records that will be deleted
SELECT '=== TOTAL RECORDS TO BE DELETED ===' as section;
WITH test_stores AS (
  SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%'
),
test_users AS (
  SELECT id FROM users WHERE store_id IN (SELECT id FROM test_stores)
)
SELECT 
  'Sales (by store)' as category,
  COUNT(*) as record_count
FROM sales WHERE store_id IN (SELECT id FROM test_stores)
UNION ALL
SELECT 
  'Sales (by user)' as category,
  COUNT(*) as record_count
FROM sales WHERE entered_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users)
UNION ALL
SELECT 
  'Expenses (by store)' as category,
  COUNT(*) as record_count
FROM expenses WHERE store_id IN (SELECT id FROM test_stores)
UNION ALL
SELECT 
  'Expenses (by user)' as category,
  COUNT(*) as record_count
FROM expenses WHERE entered_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users)
UNION ALL
SELECT 
  'Credit Alerts' as category,
  COUNT(*) as record_count
FROM credit_alerts 
WHERE sales_id IN (
  SELECT id FROM sales 
  WHERE store_id IN (SELECT id FROM test_stores) 
  OR entered_by IN (SELECT id FROM test_users)
)
UNION ALL
SELECT 
  'All Other Tables' as category,
  (SELECT COUNT(*) FROM gift_vouchers WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM damage_reports WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM hand_bills WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM returns WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM sales_orders WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM deposits WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM petty_cash WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM daily_reconciliation WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM audit_logs WHERE store_id IN (SELECT id FROM test_stores)) +
  (SELECT COUNT(*) FROM notification_log WHERE store_id IN (SELECT id FROM test_stores))
ORDER BY category;

-- =====================================================
-- DELETE SECTION - UNCOMMENT TO EXECUTE
-- =====================================================
-- WARNING: This will permanently delete all test data!
-- Make sure you have reviewed the preview above
-- =====================================================

-- Get IDs for deletion
-- WITH test_stores AS (
--   SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%'
-- ),
-- test_users AS (
--   SELECT id FROM users WHERE store_id IN (SELECT id FROM test_stores)
-- )

-- Step 1: Delete dependent records first (credit alerts)
-- DELETE FROM credit_alerts 
-- WHERE sales_id IN (
--   SELECT id FROM sales 
--   WHERE store_id IN (SELECT id FROM test_stores) 
--   OR entered_by IN (SELECT id FROM test_users)
--   OR approved_by IN (SELECT id FROM test_users)
-- );

-- Step 2: Delete all records that reference test users
-- DELETE FROM sales WHERE entered_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users) OR converted_by IN (SELECT id FROM test_users);
-- DELETE FROM expenses WHERE entered_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users);
-- DELETE FROM hand_bills WHERE entered_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users);
-- DELETE FROM returns WHERE entered_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users);
-- DELETE FROM damage_reports WHERE reported_by IN (SELECT id FROM test_users);
-- DELETE FROM gift_vouchers WHERE created_by IN (SELECT id FROM test_users) OR redeemed_by IN (SELECT id FROM test_users);
-- DELETE FROM daily_reconciliation WHERE reconciled_by IN (SELECT id FROM test_users) OR approved_by IN (SELECT id FROM test_users);
-- DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM test_users);

-- Step 3: Delete all records from test stores
-- DELETE FROM sales WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM expenses WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM petty_cash WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM gift_vouchers WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM damage_reports WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM hand_bills WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM returns WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM sales_orders WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM deposits WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM daily_reconciliation WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM audit_logs WHERE store_id IN (SELECT id FROM test_stores);
-- DELETE FROM notification_log WHERE store_id IN (SELECT id FROM test_stores);

-- Step 4: Delete test users
-- DELETE FROM users WHERE store_id IN (SELECT id FROM test_stores);

-- Step 5: Delete test stores (and any manager references)
-- UPDATE stores SET manager_id = NULL WHERE manager_id IN (SELECT id FROM test_users);
-- DELETE FROM stores WHERE LOWER(store_name) LIKE '%test%';

-- Verify deletion
-- SELECT 'Deletion complete. Remaining stores:' as status;
-- SELECT COUNT(*) as remaining_stores FROM stores;
-- SELECT COUNT(*) as remaining_users FROM users;