-- =====================================================
-- Performance Optimization Indexes for DSR System
-- =====================================================
-- These indexes significantly improve query performance
-- for common operations in the Daily Reporting System
-- 
-- IMPORTANT: Run this AFTER the schema.sql file
-- to ensure all tables exist
-- =====================================================

-- Sales Table Indexes
-- Composite index for store + date queries (most common filter pattern)
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON sales(store_id, sale_date DESC);

-- Foreign key indexes for JOIN operations
CREATE INDEX IF NOT EXISTS idx_sales_entered_by ON sales(entered_by);
CREATE INDEX IF NOT EXISTS idx_sales_approved_by ON sales(approved_by);

-- Covering index for list queries (includes commonly selected columns)
CREATE INDEX IF NOT EXISTS idx_sales_list_covering ON sales(store_id, sale_date DESC, approval_status) 
  INCLUDE (id, tender_type, amount, created_at);

-- Index for approval workflows
CREATE INDEX IF NOT EXISTS idx_sales_approval_status ON sales(approval_status) WHERE approval_status = 'pending';

-- Expenses Table Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_requested_by ON expenses(requested_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON expenses(approval_status) WHERE approval_status = 'pending';

-- Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE authentication_type = 'google_sso';

-- Stores Table Indexes
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stores_manager_id ON stores(manager_id);

-- Customers Table Indexes
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(customer_name varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(customer_phone);

-- Gift Vouchers Table Indexes
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_store_id ON gift_vouchers(store_id);
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_status ON gift_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_number ON gift_vouchers(voucher_number);

-- Hand Bills Table Indexes
CREATE INDEX IF NOT EXISTS idx_hand_bills_store_id ON hand_bills(store_id);
CREATE INDEX IF NOT EXISTS idx_hand_bills_status ON hand_bills(status);
CREATE INDEX IF NOT EXISTS idx_hand_bills_customer_id ON hand_bills(customer_id);

-- Returns Table Indexes
CREATE INDEX IF NOT EXISTS idx_returns_store_id ON returns(store_id);
CREATE INDEX IF NOT EXISTS idx_returns_original_sale ON returns(original_sale_id);

-- Daily Reconciliation Table Indexes
CREATE INDEX IF NOT EXISTS idx_daily_reconciliation_store_date ON daily_reconciliation(store_id, reconciliation_date DESC);

-- Audit Logs Table Indexes (if audit trail is needed later)
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- Index Statistics Update (run periodically)
-- =====================================================
-- ANALYZE sales;
-- ANALYZE expenses;
-- ANALYZE users;
-- ANALYZE stores;
-- ANALYZE customers;

-- =====================================================
-- Query Performance Check
-- =====================================================
-- To verify index usage, run EXPLAIN on your queries:
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM sales 
-- WHERE store_id = 'uuid' AND sale_date = '2025-01-23';