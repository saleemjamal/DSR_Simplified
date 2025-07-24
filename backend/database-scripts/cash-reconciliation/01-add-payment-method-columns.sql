-- =================================================================
-- CASH RECONCILIATION ENHANCEMENT - PAYMENT METHOD COLUMNS
-- File: 01-add-payment-method-columns.sql
-- Purpose: Add payment_method columns to hand_bills and gift_vouchers tables
-- =================================================================

-- Description:
-- This script adds payment_method tracking to hand_bills and gift_vouchers tables
-- to enable comprehensive cash variance calculations. These columns are required
-- to determine which transactions involved cash payments.

-- =================================================================
-- 1. ADD PAYMENT METHOD TO HAND_BILLS TABLE
-- =================================================================

-- Add payment_method column to hand_bills
ALTER TABLE hand_bills 
ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash' 
CHECK (payment_method IN ('cash', 'credit_card', 'upi', 'store_credit'));

-- Add index for performance on cash variance queries
CREATE INDEX idx_hand_bills_payment_method_date 
ON hand_bills(payment_method, sale_date) 
WHERE status != 'cancelled';

-- Add comment for documentation
COMMENT ON COLUMN hand_bills.payment_method IS 'Payment method used for hand bill transaction. Used in cash variance calculations.';

-- =================================================================
-- 2. ADD PAYMENT METHOD TO GIFT_VOUCHERS TABLE
-- =================================================================

-- Add payment_method column to gift_vouchers (for voucher purchases)
ALTER TABLE gift_vouchers 
ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash' 
CHECK (payment_method IN ('cash', 'credit_card', 'upi', 'bank_transfer'));

-- Add index for performance on cash variance queries
CREATE INDEX idx_gift_vouchers_payment_method_date 
ON gift_vouchers(payment_method, issued_date) 
WHERE status != 'cancelled';

-- Add comment for documentation
COMMENT ON COLUMN gift_vouchers.payment_method IS 'Payment method used when purchasing the gift voucher. Used in cash variance calculations.';

-- =================================================================
-- 3. UPDATE EXISTING DATA (MIGRATION)
-- =================================================================

-- Set default payment method for existing records
-- This assumes existing transactions were cash payments (safe default)
UPDATE hand_bills 
SET payment_method = 'cash' 
WHERE payment_method IS NULL;

UPDATE gift_vouchers 
SET payment_method = 'cash' 
WHERE payment_method IS NULL;

-- =================================================================
-- 4. VERIFICATION QUERIES
-- =================================================================

-- Verify hand_bills table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'hand_bills' AND column_name = 'payment_method';

-- Verify gift_vouchers table structure  
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'gift_vouchers' AND column_name = 'payment_method';

-- Verify constraints
-- SELECT conname, contype, consrc 
-- FROM pg_constraint 
-- WHERE conname LIKE '%payment_method%';

-- =================================================================
-- ROLLBACK SCRIPT (IF NEEDED)
-- =================================================================
-- 
-- -- Remove payment_method from hand_bills
-- ALTER TABLE hand_bills DROP COLUMN IF EXISTS payment_method;
-- DROP INDEX IF EXISTS idx_hand_bills_payment_method_date;
-- 
-- -- Remove payment_method from gift_vouchers  
-- ALTER TABLE gift_vouchers DROP COLUMN IF EXISTS payment_method;
-- DROP INDEX IF EXISTS idx_gift_vouchers_payment_method_date;

-- =================================================================
-- EXECUTION NOTES
-- =================================================================
-- 
-- 1. Run this script during low-traffic period
-- 2. Backup database before execution
-- 3. Test on staging environment first
-- 4. Monitor query performance after adding indexes
-- 5. Update application code to handle new payment_method fields
--
-- Expected execution time: < 1 minute for typical data volumes
-- Required privileges: ALTER, CREATE INDEX permissions
-- =================================================================