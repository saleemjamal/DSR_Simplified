-- =================================================================
-- ENHANCED SALES TRANSACTION SYSTEM MIGRATION
-- Add new tables for customers, deposits, sales orders, hand bills, and returns
-- =================================================================

-- 13. CUSTOMERS TABLE
-- Manages customer information for all transaction types
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) UNIQUE,
    customer_email VARCHAR(100),
    address TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    total_outstanding DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_date DATE DEFAULT CURRENT_DATE,
    last_transaction_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. DEPOSITS TABLE
-- Tracks all advance payments separately from sales revenue
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    deposit_date DATE NOT NULL,
    deposit_type VARCHAR(20) NOT NULL CHECK (deposit_type IN ('sales_order', 'other')),
    reference_id UUID,
    reference_type VARCHAR(20),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'upi', 'bank_transfer')),
    customer_id UUID REFERENCES customers(id),
    processed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 15. SALES ORDERS TABLE
-- Tracks customer orders awaiting stock fulfillment
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL,
    items_description TEXT NOT NULL,
    total_estimated_amount DECIMAL(10,2) NOT NULL,
    advance_paid DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'cancelled')),
    erp_conversion_date DATE,
    erp_sale_bill_number VARCHAR(100),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    converted_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 16. HAND BILLS TABLE
-- Tracks manual bills awaiting system conversion
CREATE TABLE hand_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    hand_bill_number VARCHAR(50) UNIQUE NOT NULL,
    sale_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(10,2) NOT NULL,
    items_description TEXT,
    original_image_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'cancelled')),
    conversion_date DATE,
    erp_sale_bill_number VARCHAR(100),
    sale_bill_image_url VARCHAR(255),
    converted_by UUID REFERENCES users(id),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 17. RETURNS (RRN) TABLE
-- Documents return transactions for compliance
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    return_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    return_amount DECIMAL(10,2) NOT NULL,
    return_reason TEXT,
    original_bill_reference VARCHAR(100),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'credit_card', 'upi', 'store_credit')),
    processed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =================================================================
-- ADD INDEXES FOR PERFORMANCE
-- =================================================================

-- Customer management table indexes
CREATE INDEX idx_customers_name ON customers(customer_name);
CREATE INDEX idx_customers_phone ON customers(customer_phone);
CREATE INDEX idx_customers_email ON customers(customer_email);
CREATE INDEX idx_customers_last_transaction ON customers(last_transaction_date);
CREATE INDEX idx_customers_credit_limit ON customers(credit_limit);

-- Deposits table indexes
CREATE INDEX idx_deposits_store_date ON deposits(store_id, deposit_date);
CREATE INDEX idx_deposits_type ON deposits(deposit_type);
CREATE INDEX idx_deposits_customer ON deposits(customer_id);
CREATE INDEX idx_deposits_reference ON deposits(reference_id, reference_type);
CREATE INDEX idx_deposits_payment_method ON deposits(payment_method);

-- Sales orders table indexes
CREATE INDEX idx_sales_orders_store_date ON sales_orders(store_id, order_date);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_number ON sales_orders(order_number);
CREATE INDEX idx_sales_orders_erp_bill ON sales_orders(erp_sale_bill_number);
CREATE INDEX idx_sales_orders_conversion_date ON sales_orders(erp_conversion_date);

-- Hand bills table indexes
CREATE INDEX idx_hand_bills_store_date ON hand_bills(store_id, sale_date);
CREATE INDEX idx_hand_bills_customer ON hand_bills(customer_id);
CREATE INDEX idx_hand_bills_status ON hand_bills(status);
CREATE INDEX idx_hand_bills_number ON hand_bills(hand_bill_number);
CREATE INDEX idx_hand_bills_erp_bill ON hand_bills(erp_sale_bill_number);
CREATE INDEX idx_hand_bills_conversion_date ON hand_bills(conversion_date);

-- Returns table indexes
CREATE INDEX idx_returns_store_date ON returns(store_id, return_date);
CREATE INDEX idx_returns_customer ON returns(customer_id);
CREATE INDEX idx_returns_payment_method ON returns(payment_method);
CREATE INDEX idx_returns_bill_reference ON returns(original_bill_reference);

-- =================================================================
-- OPTIONAL: UPDATE GIFT VOUCHERS TABLE TO INCLUDE CUSTOMER_ID
-- (Uncomment if you want to link gift vouchers to customers)
-- =================================================================

-- Add customer_id column to gift_vouchers table for better customer relationship management
-- ALTER TABLE gift_vouchers ADD COLUMN customer_id UUID REFERENCES customers(id);
-- CREATE INDEX idx_gift_vouchers_customer ON gift_vouchers(customer_id);

-- =================================================================
-- MIGRATION VERIFICATION QUERIES
-- =================================================================

-- Run these queries after executing the migration to verify everything was created correctly:

-- Check if all tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('customers', 'deposits', 'sales_orders', 'hand_bills', 'returns');

-- Check if all indexes were created
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_customers_%' OR indexname LIKE 'idx_deposits_%' OR indexname LIKE 'idx_sales_orders_%' OR indexname LIKE 'idx_hand_bills_%' OR indexname LIKE 'idx_returns_%';

-- Check table structures
-- \d customers
-- \d deposits  
-- \d sales_orders
-- \d hand_bills
-- \d returns