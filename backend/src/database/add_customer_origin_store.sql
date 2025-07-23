-- =====================================================
-- Add Origin Store to Customers Table
-- =====================================================
-- This migration adds store_id to track where customer 
-- was first created, but customers remain global
-- =====================================================

-- Add origin_store_id column (nullable for existing customers)
ALTER TABLE customers 
ADD COLUMN origin_store_id UUID REFERENCES stores(id);

-- Add comment to clarify this is for tracking only
COMMENT ON COLUMN customers.origin_store_id IS 'Store where customer was first created. For tracking purposes only - customers are global across all stores';

-- Create index for reporting purposes (not for filtering)
CREATE INDEX idx_customers_origin_store ON customers(origin_store_id);

-- Optional: Update existing customers to a default store if needed
-- UPDATE customers SET origin_store_id = (SELECT id FROM stores WHERE store_name = 'Main Store' LIMIT 1) 
-- WHERE origin_store_id IS NULL;

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers'
AND column_name = 'origin_store_id';

-- Show comment (correct syntax)
SELECT 
    col_description('customers'::regclass, 
    (SELECT attnum FROM pg_attribute 
     WHERE attrelid = 'customers'::regclass 
     AND attname = 'origin_store_id'));