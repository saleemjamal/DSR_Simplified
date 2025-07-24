-- =================================================================
-- ADD CUSTOMER_ID TO GIFT_VOUCHERS TABLE
-- Links gift vouchers to customer records for better tracking
-- =================================================================

-- Add customer_id column to gift_vouchers table
ALTER TABLE gift_vouchers ADD COLUMN customer_id UUID REFERENCES customers(id);

-- Add index for performance on customer lookups
CREATE INDEX idx_gift_vouchers_customer ON gift_vouchers(customer_id);

-- Verification query - check if column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'gift_vouchers' AND column_name = 'customer_id';