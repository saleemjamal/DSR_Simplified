-- =================================================================
-- POPPAT JAMALS DAILY REPORTING SYSTEM - DATABASE SCHEMA
-- Supabase PostgreSQL Implementation
-- Total Tables: 25 (Extensible Architecture)
-- =================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================
-- CORE TABLES (Cash Management Foundation)
-- =================================================================

-- 1. STORES TABLE
-- Manages multiple store locations with extensible configuration
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_code VARCHAR(10) UNIQUE NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    daily_deadline_time TIME DEFAULT '12:00:00',
    petty_cash_limit DECIMAL(10,2) DEFAULT 5000.00,
    configuration JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. USERS TABLE
-- Hybrid authentication with Google Workspace SSO and local accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('store_manager', 'accounts_incharge', 'super_user', 'cashier')),
    store_id UUID REFERENCES stores(id),
    authentication_type VARCHAR(20) DEFAULT 'local' CHECK (authentication_type IN ('google_sso', 'local')),
    google_workspace_id VARCHAR(255),
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT email_required_for_sso CHECK (
        (authentication_type = 'google_sso' AND email IS NOT NULL) OR 
        (authentication_type = 'local')
    ),
    CONSTRAINT password_required_for_local CHECK (
        (authentication_type = 'local' AND password_hash IS NOT NULL) OR 
        (authentication_type = 'google_sso')
    )
);

-- Add foreign key constraint after users table is created
ALTER TABLE stores ADD CONSTRAINT fk_stores_manager FOREIGN KEY (manager_id) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- 3. SALES TABLE
-- Records all sales transactions with different tender types
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    sale_date DATE NOT NULL,
    tender_type VARCHAR(20) NOT NULL CHECK (tender_type IN ('cash', 'credit', 'credit_card', 'upi', 'hand_bill', 'rrn', 'gift_voucher')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_reference VARCHAR(100),
    customer_reference VARCHAR(100),
    notes TEXT,
    is_hand_bill_converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMP,
    converted_by UUID REFERENCES users(id),
    entered_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_notes TEXT,
    custom_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. EXPENSES TABLE
-- Tracks all business expenses with approval workflows
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    voucher_number VARCHAR(50),
    voucher_image_url VARCHAR(255),
    payment_method VARCHAR(20) DEFAULT 'petty_cash' CHECK (payment_method IN ('petty_cash', 'bank_transfer', 'credit_card')),
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_notes TEXT,
    auto_categorized BOOLEAN DEFAULT false,
    ml_confidence DECIMAL(3,2),
    expense_owner VARCHAR(100),
    tags JSONB DEFAULT '[]',
    custom_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. PETTY CASH TABLE
-- Manages petty cash float and transactions
CREATE TABLE petty_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('top_up', 'expense', 'reconciliation')),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(20),
    description TEXT,
    processed_by UUID NOT NULL REFERENCES users(id),
    custom_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. DAILY RECONCILIATION TABLE
-- Stores daily cash reconciliation data
CREATE TABLE daily_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    reconciliation_date DATE NOT NULL,
    opening_cash DECIMAL(10,2) NOT NULL,
    total_cash_sales DECIMAL(10,2) NOT NULL,
    total_expenses DECIMAL(10,2) NOT NULL,
    expected_closing_cash DECIMAL(10,2) NOT NULL,
    actual_closing_cash DECIMAL(10,2) NOT NULL,
    cash_variance DECIMAL(10,2) NOT NULL,
    variance_reason TEXT,
    reconciled_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    reconciliation_status VARCHAR(20) DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'approved', 'rejected')),
    analysis_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_id, reconciliation_date)
);

-- =================================================================
-- EXTENSIBILITY FOUNDATION TABLES
-- =================================================================

-- 7. CUSTOM FIELDS TABLE
-- Defines custom fields for any entity in the system
CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'file')),
    field_options JSONB DEFAULT '{}',
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    validation_rules JSONB DEFAULT '{}',
    store_id UUID REFERENCES stores(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, field_name, store_id)
);

-- 8. CUSTOM FIELD VALUES TABLE
-- Stores values for custom fields
CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_field_id UUID NOT NULL REFERENCES custom_fields(id),
    entity_id UUID NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(custom_field_id, entity_id)
);

-- 9. WORKFLOWS TABLE
-- Foundation for workflow engine (checklists, approval processes)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(100) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    store_id UUID REFERENCES stores(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. WORKFLOW INSTANCES TABLE
-- Tracks execution of workflows
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    entity_id UUID,
    entity_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'failed')),
    current_step INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES users(id),
    started_by UUID NOT NULL REFERENCES users(id),
    completed_at TIMESTAMP,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. INTEGRATION CONFIGS TABLE
-- Manages external system integrations (ERP, accounting software)
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    endpoint_url VARCHAR(500),
    api_key_encrypted TEXT,
    configuration JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    sync_interval_minutes INTEGER DEFAULT 60,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    store_id UUID REFERENCES stores(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. EXPORT TEMPLATES TABLE
-- Defines export formats (XML, JSON, CSV) for different data types
CREATE TABLE export_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    data_source VARCHAR(50) NOT NULL,
    export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('xml', 'json', 'csv', 'excel')),
    template_definition JSONB NOT NULL,
    field_mappings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    store_id UUID REFERENCES stores(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =================================================================
-- GIFT VOUCHER AND DAMAGE REPORTING TABLES
-- =================================================================

-- 13. GIFT VOUCHERS TABLE
-- Manages gift voucher lifecycle with legacy voucher support
CREATE TABLE gift_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    voucher_type VARCHAR(20) DEFAULT 'system_generated' CHECK (voucher_type IN ('system_generated', 'legacy', 'manual')),
    store_id UUID NOT NULL REFERENCES stores(id),
    created_by UUID REFERENCES users(id),
    redeemed_by UUID REFERENCES users(id),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. DAMAGE REPORTS TABLE
-- Tracks damaged items and supplier actions with automated alerts
CREATE TABLE damage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    report_date DATE NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    dc_number VARCHAR(50),
    item_code VARCHAR(50),
    brand_name VARCHAR(100),
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    damage_source VARCHAR(100),
    damage_category VARCHAR(50),
    action_taken VARCHAR(200),
    replacement_from_distributor BOOLEAN DEFAULT false,
    credit_note_number VARCHAR(50),
    estimated_value DECIMAL(10,2),
    reported_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
    resolution_notes TEXT,
    custom_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =================================================================
-- ALERT AND NOTIFICATION SYSTEM TABLES
-- =================================================================

-- 15. ALERT CONFIGURATIONS TABLE
-- Configures multi-stage alert rules for various business processes
CREATE TABLE alert_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    trigger_condition JSONB NOT NULL,
    alert_stages JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    store_id UUID REFERENCES stores(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 16. NOTIFICATION PREFERENCES TABLE
-- User-level preferences for email and Slack notifications
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    alert_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    slack_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    slack_user_id VARCHAR(50),
    phone_number VARCHAR(20),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, alert_type)
);

-- 17. CREDIT ALERTS TABLE
-- Tracks multi-stage credit payment recovery alerts
CREATE TABLE credit_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_id UUID NOT NULL REFERENCES sales(id),
    alert_stage INTEGER NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    alert_type VARCHAR(50) NOT NULL,
    channels JSONB NOT NULL,
    recipients JSONB NOT NULL,
    message_template TEXT,
    response_received BOOLEAN DEFAULT false,
    response_notes TEXT,
    next_alert_id UUID REFERENCES credit_alerts(id),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'responded', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18. NOTIFICATION LOG TABLE
-- Complete log of all notifications sent with delivery status
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    alert_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack', 'sms', 'push')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
    error_message TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =================================================================
-- ENHANCED SUPPORTING TABLES
-- =================================================================

-- 19. EXPENSE CATEGORIES TABLE
-- Enhanced with ML support and custom rules
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(50) UNIQUE NOT NULL,
    category_description TEXT,
    requires_approval BOOLEAN DEFAULT false,
    approval_threshold DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    auto_categorization_rules JSONB DEFAULT '{}',
    ml_training_data JSONB DEFAULT '{}',
    parent_category_id UUID REFERENCES expense_categories(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 20. AUDIT LOGS TABLE
-- Enhanced comprehensive audit trail with plugin support
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'SYNC')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    store_id UUID REFERENCES stores(id),
    ip_address INET,
    user_agent TEXT,
    module_name VARCHAR(50),
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 21. SYSTEM SETTINGS TABLE
-- Enhanced with module-specific settings and validation
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    module_name VARCHAR(50) DEFAULT 'core',
    description TEXT,
    validation_schema JSONB,
    is_editable BOOLEAN DEFAULT true,
    store_id UUID REFERENCES stores(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(setting_key, module_name, store_id)
);

-- =================================================================
-- MOBILE AND INTEGRATION TABLES
-- =================================================================

-- 22. DEVICE TOKENS TABLE
-- Enhanced device management for push notifications
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(255) NOT NULL,
    token VARCHAR(500) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    app_version VARCHAR(20),
    os_version VARCHAR(20),
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- 23. MOBILE SESSIONS TABLE
-- Enhanced session management for mobile apps
CREATE TABLE mobile_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    app_version VARCHAR(20),
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 24. OFFLINE SYNC TABLE
-- Enhanced offline synchronization for mobile apps
CREATE TABLE offline_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    data JSONB NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMP,
    conflict_resolution JSONB,
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    synced_at TIMESTAMP
);

-- 25. PUSH NOTIFICATIONS TABLE
-- Enhanced push notification management
CREATE TABLE push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_token_id UUID NOT NULL REFERENCES device_tokens(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =================================================================

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_auth_type ON users(authentication_type);
CREATE INDEX idx_users_google_id ON users(google_workspace_id);
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- Stores table indexes
CREATE INDEX idx_stores_code ON stores(store_code);
CREATE INDEX idx_stores_manager ON stores(manager_id);
CREATE INDEX idx_stores_configuration ON stores USING GIN (configuration);

-- Sales table indexes
CREATE INDEX idx_sales_store_date ON sales(store_id, sale_date);
CREATE INDEX idx_sales_tender_type ON sales(tender_type);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_entered_by ON sales(entered_by);
CREATE INDEX idx_sales_custom_data ON sales USING GIN (custom_data);

-- Expenses table indexes
CREATE INDEX idx_expenses_store_date ON expenses(store_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_status ON expenses(approval_status);
CREATE INDEX idx_expenses_requested_by ON expenses(requested_by);
CREATE INDEX idx_expenses_tags ON expenses USING GIN (tags);
CREATE INDEX idx_expenses_custom_data ON expenses USING GIN (custom_data);

-- Petty cash table indexes
CREATE INDEX idx_petty_cash_store_date ON petty_cash(store_id, transaction_date);
CREATE INDEX idx_petty_cash_type ON petty_cash(transaction_type);
CREATE INDEX idx_petty_cash_reference ON petty_cash(reference_id, reference_type);

-- Daily reconciliation table indexes
CREATE INDEX idx_daily_recon_store_date ON daily_reconciliation(store_id, reconciliation_date);
CREATE INDEX idx_daily_recon_status ON daily_reconciliation(reconciliation_status);

-- Gift vouchers table indexes
CREATE INDEX idx_gift_vouchers_number ON gift_vouchers(voucher_number);
CREATE INDEX idx_gift_vouchers_status ON gift_vouchers(status);
CREATE INDEX idx_gift_vouchers_store_expiry ON gift_vouchers(store_id, expiry_date);
CREATE INDEX idx_gift_vouchers_type ON gift_vouchers(voucher_type);

-- Damage reports table indexes
CREATE INDEX idx_damage_reports_store_date ON damage_reports(store_id, report_date);
CREATE INDEX idx_damage_reports_status ON damage_reports(status);
CREATE INDEX idx_damage_reports_supplier ON damage_reports(supplier_name);
CREATE INDEX idx_damage_reports_reported_by ON damage_reports(reported_by);

-- Audit logs table indexes
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_module ON audit_logs(module_name);