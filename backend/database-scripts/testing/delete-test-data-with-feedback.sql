-- =====================================================
-- Delete Test Data Script with Progress Feedback
-- =====================================================
-- This script removes all test stores and shows progress
-- 
-- INSTRUCTIONS:
-- 1. Run the preview section first
-- 2. Uncomment DELETE statements and run again
-- =====================================================

-- PREVIEW: Show what will be deleted
SELECT '=== PREVIEW: Test Stores to Delete ===' as info;
SELECT id, store_name FROM stores WHERE LOWER(store_name) LIKE '%test%';
SELECT COUNT(*) || ' test stores found' as summary FROM stores WHERE LOWER(store_name) LIKE '%test%';

-- =====================================================
-- DELETE WITH PROGRESS FEEDBACK (UNCOMMENT TO RUN)
-- =====================================================

-- Step 1: Delete credit alerts
-- WITH deleted AS (
--   DELETE FROM credit_alerts 
--   WHERE sales_id IN (SELECT id FROM sales WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%'))
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' credit_alerts records' as result FROM deleted;

-- Step 2: Delete audit logs
-- WITH deleted AS (
--   DELETE FROM audit_logs 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' audit_logs records' as result FROM deleted;

-- Step 3: Delete notification logs
-- WITH deleted AS (
--   DELETE FROM notification_log 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' notification_log records' as result FROM deleted;

-- Step 4: Delete sales
-- WITH deleted AS (
--   DELETE FROM sales 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' sales records' as result FROM deleted;

-- Step 5: Delete expenses
-- WITH deleted AS (
--   DELETE FROM expenses 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' expenses records' as result FROM deleted;

-- Step 6: Delete petty cash
-- WITH deleted AS (
--   DELETE FROM petty_cash 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' petty_cash records' as result FROM deleted;

-- Step 7: Delete gift vouchers
-- WITH deleted AS (
--   DELETE FROM gift_vouchers 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' gift_vouchers records' as result FROM deleted;

-- Step 8: Delete damage reports
-- WITH deleted AS (
--   DELETE FROM damage_reports 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' damage_reports records' as result FROM deleted;

-- Step 9: Delete hand bills
-- WITH deleted AS (
--   DELETE FROM hand_bills 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' hand_bills records' as result FROM deleted;

-- Step 10: Delete returns
-- WITH deleted AS (
--   DELETE FROM returns 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' returns records' as result FROM deleted;

-- Step 11: Delete sales orders
-- WITH deleted AS (
--   DELETE FROM sales_orders 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' sales_orders records' as result FROM deleted;

-- Step 12: Delete deposits
-- WITH deleted AS (
--   DELETE FROM deposits 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' deposits records' as result FROM deleted;

-- Step 13: Delete daily reconciliation
-- WITH deleted AS (
--   DELETE FROM daily_reconciliation 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' daily_reconciliation records' as result FROM deleted;

-- Step 14: Delete users
-- WITH deleted AS (
--   DELETE FROM users 
--   WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%')
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' users' as result FROM deleted;

-- Step 15: Delete stores
-- WITH deleted AS (
--   DELETE FROM stores 
--   WHERE LOWER(store_name) LIKE '%test%'
--   RETURNING *
-- )
-- SELECT 'Deleted ' || COUNT(*) || ' stores' as result FROM deleted;

-- Final verification
-- SELECT '=== DELETION COMPLETE ===' as status;
-- SELECT 'Remaining stores: ' || COUNT(*) as summary FROM stores;