-- =====================================================
-- Performance Optimization Indexes for DSR System (SAFE VERSION)
-- =====================================================
-- This version checks table existence before creating indexes
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Sales Table Indexes (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        -- Composite index for store + date queries
        CREATE INDEX IF NOT EXISTS idx_sales_store_date ON sales(store_id, sale_date DESC);
        
        -- Foreign key indexes
        CREATE INDEX IF NOT EXISTS idx_sales_entered_by ON sales(entered_by);
        CREATE INDEX IF NOT EXISTS idx_sales_approved_by ON sales(approved_by);
        
        -- Approval workflow index
        CREATE INDEX IF NOT EXISTS idx_sales_approval_pending ON sales(approval_status) 
        WHERE approval_status = 'pending';
        
        RAISE NOTICE 'Sales indexes created successfully';
    ELSE
        RAISE NOTICE 'Sales table not found - skipping indexes';
    END IF;
END $$;

-- Expenses Table Indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, expense_date DESC);
        CREATE INDEX IF NOT EXISTS idx_expenses_requested_by ON expenses(requested_by);
        CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON expenses(approved_by);
        CREATE INDEX IF NOT EXISTS idx_expenses_approval_pending ON expenses(approval_status) 
        WHERE approval_status = 'pending';
        
        RAISE NOTICE 'Expenses indexes created successfully';
    ELSE
        RAISE NOTICE 'Expenses table not found - skipping indexes';
    END IF;
END $$;

-- Users Table Indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_email_sso ON users(email) 
        WHERE authentication_type = 'google_sso';
        
        RAISE NOTICE 'Users indexes created successfully';
    ELSE
        RAISE NOTICE 'Users table not found - skipping indexes';
    END IF;
END $$;

-- Stores Table Indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active) 
        WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_stores_manager_id ON stores(manager_id);
        
        RAISE NOTICE 'Stores indexes created successfully';
    ELSE
        RAISE NOTICE 'Stores table not found - skipping indexes';
    END IF;
END $$;

-- Customers Table Indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        -- Index for customer search by name
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name varchar_pattern_ops);
        -- Index for phone lookup (global across stores)
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(customer_phone);
        -- Index for origin store (reporting only, not filtering)
        CREATE INDEX IF NOT EXISTS idx_customers_origin_store ON customers(origin_store_id) 
        WHERE origin_store_id IS NOT NULL;
        
        RAISE NOTICE 'Customers indexes created successfully';
    ELSE
        RAISE NOTICE 'Customers table not found - skipping indexes';
    END IF;
END $$;

-- Final Summary
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;