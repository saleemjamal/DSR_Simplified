-- =====================================================
-- Simple Delete Test Data Script for Supabase
-- =====================================================
-- This script removes all test stores and related data
-- 
-- INSTRUCTIONS:
-- 1. Run the preview section first
-- 2. Uncomment DELETE statements and run again
-- =====================================================

-- PREVIEW: Show what will be deleted
SELECT 'Test Stores:' as info;
SELECT id, store_name FROM stores WHERE LOWER(store_name) LIKE '%test%';

-- =====================================================
-- DELETE ALL TEST DATA (UNCOMMENT TO RUN)
-- =====================================================

-- Step 1: Delete all foreign key dependencies first
-- DELETE FROM credit_alerts WHERE sales_id IN (SELECT id FROM sales WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%'));
-- DELETE FROM audit_logs WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');
-- DELETE FROM notification_log WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');

-- Step 2: Delete all transaction records from test stores
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

-- Step 3: Delete users from test stores
-- DELETE FROM users WHERE store_id IN (SELECT id FROM stores WHERE LOWER(store_name) LIKE '%test%');

-- Step 4: Delete test stores
-- DELETE FROM stores WHERE LOWER(store_name) LIKE '%test%';

-- Verify
-- SELECT 'Remaining stores:' as info;
-- SELECT COUNT(*) FROM stores;