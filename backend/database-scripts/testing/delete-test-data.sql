-- =====================================================
-- Delete Test Data Script for Supabase
-- =====================================================
-- This script removes all test data from the database
-- Test data is identified by store names containing "test"
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

-- Count related records
SELECT '=== RELATED RECORDS COUNT ===' as section;
SELECT 
  'Sales' as table_name,
  COUNT(*) as record_count
FROM sales 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Expenses' as table_name,
  COUNT(*) as record_count
FROM expenses 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Users' as table_name,
  COUNT(*) as record_count
FROM users 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Gift Vouchers' as table_name,
  COUNT(*) as record_count
FROM gift_vouchers 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Damage Reports' as table_name,
  COUNT(*) as record_count
FROM damage_reports 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Hand Bills' as table_name,
  COUNT(*) as record_count
FROM hand_bills 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Returns' as table_name,
  COUNT(*) as record_count
FROM returns 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Sales Orders' as table_name,
  COUNT(*) as record_count
FROM sales_orders 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Deposits' as table_name,
  COUNT(*) as record_count
FROM deposits 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Petty Cash' as table_name,
  COUNT(*) as record_count
FROM petty_cash 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
UNION ALL
SELECT 
  'Credit Alerts' as table_name,
  COUNT(*) as record_count
FROM credit_alerts 
WHERE sales_id IN (SELECT id FROM sales WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%'))
ORDER BY table_name;

-- Show sample of data to be deleted
SELECT '=== SAMPLE DATA TO BE DELETED ===' as section;
SELECT 'Sales Records:' as data_type;
SELECT id, store_id, sale_date, tender_type, amount, approval_status 
FROM sales 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
LIMIT 5;

SELECT 'User Accounts:' as data_type;
SELECT id, email, role, store_id 
FROM users 
WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
LIMIT 5;

-- =====================================================
-- DELETE SECTION - UNCOMMENT TO EXECUTE
-- =====================================================
-- WARNING: This will permanently delete all test data!
-- Make sure you have reviewed the preview above
-- =====================================================

-- Delete from child tables first (foreign key constraints)

-- First delete records that reference sales
-- DELETE FROM credit_alerts WHERE sales_id IN (SELECT id FROM sales WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%'));

-- Then delete from main transaction tables
-- DELETE FROM sales WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM expenses WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM petty_cash WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM gift_vouchers WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM damage_reports WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM hand_bills WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM returns WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM sales_orders WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM deposits WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM daily_reconciliation WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM audit_logs WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM notification_log WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM users WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');

-- Finally delete the stores
-- DELETE FROM stores WHERE LOWER(store_name) LIKE '%test%';

-- Verify deletion
-- SELECT 'Deletion complete. Remaining stores:' as status;
-- SELECT COUNT(*) as remaining_stores FROM stores;