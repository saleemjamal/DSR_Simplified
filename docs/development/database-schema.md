# Database Schema - Extensible Architecture
## Daily Reporting System - Poppat Jamals

### Database: PostgreSQL

---

## Core Tables (Cash Management Foundation)

### 1. Users Table
Manages hybrid authentication with Google Workspace SSO and local accounts.

```sql
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
    created_by UUID REFERENCES users(id),
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
```

**Indexes:**
- `idx_users_username` ON username
- `idx_users_email` ON email
- `idx_users_role` ON role
- `idx_users_store_id` ON store_id
- `idx_users_auth_type` ON authentication_type
- `idx_users_google_id` ON google_workspace_id
- `idx_users_metadata` GIN (metadata)

**Authentication Rules:**
- Google SSO users: Super User, Store Manager, Accounts Incharge (require @poppatjamals.com email)
- Local users: Cashiers (username/password, created by store managers)
- Store managers can create/manage cashier accounts for their store
- Email required for Google SSO, optional for local accounts

---

### 2. Stores Table
Manages multiple store locations with extensible configuration support.

```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_code VARCHAR(10) UNIQUE NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    daily_deadline_time TIME DEFAULT '12:00:00',
    petty_cash_limit DECIMAL(10,2) DEFAULT 5000.00,
    configuration JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_stores_code` ON store_code
- `idx_stores_manager` ON manager_id
- `idx_stores_configuration` GIN (configuration)

---

### 3. Sales Table
Records all sales transactions with different tender types and extensible data storage.

```sql
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
    custom_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_sales_store_date` ON (store_id, sale_date)
- `idx_sales_tender_type` ON tender_type
- `idx_sales_date` ON sale_date
- `idx_sales_entered_by` ON entered_by
- `idx_sales_custom_data` GIN (custom_data)

---

### 4. Expenses Table
Tracks all business expenses with approval workflows and extensible categorization.

```sql
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
```

**Indexes:**
- `idx_expenses_store_date` ON (store_id, expense_date)
- `idx_expenses_category` ON category
- `idx_expenses_status` ON approval_status
- `idx_expenses_requested_by` ON requested_by
- `idx_expenses_tags` GIN (tags)
- `idx_expenses_custom_data` GIN (custom_data)

---

### 5. Petty Cash Table
Manages petty cash float and transactions with extensible reference tracking.

```sql
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
```

**Indexes:**
- `idx_petty_cash_store_date` ON (store_id, transaction_date)
- `idx_petty_cash_type` ON transaction_type
- `idx_petty_cash_reference` ON (reference_id, reference_type)

---

### 6. Daily Reconciliation Table
Stores daily cash reconciliation data with extensible variance tracking.

```sql
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
```

**Indexes:**
- `idx_daily_recon_store_date` ON (store_id, reconciliation_date)
- `idx_daily_recon_status` ON reconciliation_status

---

## Extensibility Foundation Tables

### 7. Custom Fields Table
Defines custom fields for any entity in the system.

```sql
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
```

### 8. Custom Field Values Table
Stores values for custom fields.

```sql
CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_field_id UUID NOT NULL REFERENCES custom_fields(id),
    entity_id UUID NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(custom_field_id, entity_id)
);
```

### 9. Workflows Table
Foundation for workflow engine (checklists, approval processes, etc.).

```sql
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
```

### 10. Workflow Instances Table
Tracks execution of workflows.

```sql
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
```

### 11. Integration Configs Table
Manages external system integrations (ERP, accounting software, etc.).

```sql
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
```

### 12. Export Templates Table
Defines export formats (XML, JSON, CSV) for different data types.

```sql
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
```

## Enhanced Sales Transaction System Tables

### 13. Customers Table
Manages customer information for all transaction types with phone-based deduplication.

```sql
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
```

**Indexes:**
- `idx_customers_phone` ON customer_phone (unique)
- `idx_customers_name` ON customer_name
- `idx_customers_email` ON customer_email
- `idx_customers_created_date` ON created_date

### 14. Deposits Table
Tracks all advance payments separately from sales revenue.

```sql
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
```

**Indexes:**
- `idx_deposits_store_date` ON (store_id, deposit_date)
- `idx_deposits_type` ON deposit_type
- `idx_deposits_customer` ON customer_id
- `idx_deposits_reference` ON (reference_id, reference_type)

### 15. Sales Orders Table
Tracks customer orders awaiting stock fulfillment with ERP integration.

```sql
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
    converted_by UUID REFERENCES users(id),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_sales_orders_store_date` ON (store_id, order_date)
- `idx_sales_orders_customer` ON customer_id
- `idx_sales_orders_status` ON status
- `idx_sales_orders_number` ON order_number
- `idx_sales_orders_erp_bill` ON erp_sale_bill_number

### 16. Hand Bills Table
Tracks hand bills with dual image storage and conversion tracking.

```sql
CREATE TABLE hand_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    hand_bill_number VARCHAR(50) UNIQUE NOT NULL,
    sale_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(10,2) NOT NULL,
    items_description TEXT,
    original_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'cancelled')),
    conversion_date DATE,
    erp_sale_bill_number VARCHAR(100),
    sale_bill_image_url VARCHAR(500),
    converted_by UUID REFERENCES users(id),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_hand_bills_store_date` ON (store_id, sale_date)
- `idx_hand_bills_customer` ON customer_id
- `idx_hand_bills_status` ON status
- `idx_hand_bills_number` ON hand_bill_number

### 17. Returns (RRN) Table
Documents return transactions for compliance and tracking.

```sql
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    return_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    return_amount DECIMAL(10,2) NOT NULL,
    return_reason VARCHAR(200) NOT NULL,
    original_bill_reference VARCHAR(100),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'credit_card', 'upi', 'store_credit')),
    processed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_returns_store_date` ON (store_id, return_date)
- `idx_returns_customer` ON customer_id
- `idx_returns_processed_by` ON processed_by
- `idx_returns_bill_ref` ON original_bill_reference

### 18. Gift Vouchers Table (Enhanced)
Manages gift voucher lifecycle with customer linking and mandatory fields.

```sql
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
    customer_id UUID REFERENCES customers(id),  -- NEW: Links to customer records
    customer_name VARCHAR(100) NOT NULL,        -- NOW REQUIRED: Mandatory field
    customer_phone VARCHAR(20) NOT NULL,        -- NOW REQUIRED: Mandatory field
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_gift_vouchers_number` ON voucher_number
- `idx_gift_vouchers_status` ON status
- `idx_gift_vouchers_store_expiry` ON (store_id, expiry_date)
- `idx_gift_vouchers_type` ON voucher_type
- `idx_gift_vouchers_customer` ON customer_id  -- NEW: Customer linking index

### 14. Damage Reports Table
Tracks damaged items and supplier actions with automated alerts.

```sql
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
```

**Indexes:**
- `idx_damage_reports_store_date` ON (store_id, report_date)
- `idx_damage_reports_status` ON status
- `idx_damage_reports_supplier` ON supplier_name
- `idx_damage_reports_reported_by` ON reported_by

### 15. Alert Configurations Table
Configures multi-stage alert rules for various business processes.

```sql
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
```

**Sample Alert Configurations:**
```sql
INSERT INTO alert_configurations (alert_type, entity_type, trigger_condition, alert_stages) VALUES
('credit_payment_overdue', 'sales', 
 '{"days_overdue": 0}', 
 '[
   {"stage": 1, "days_after": 7, "channels": ["slack"], "recipients": ["store_manager"]},
   {"stage": 2, "days_after": 15, "channels": ["slack", "email"], "recipients": ["accounts_incharge"]},
   {"stage": 3, "days_after": 30, "channels": ["email", "sms"], "recipients": ["super_user"]}
 ]'),
('hand_bill_conversion', 'sales', 
 '{"hours_pending": 12}', 
 '[
   {"stage": 1, "hours_after": 12, "channels": ["slack"], "recipients": ["store_manager"]},
   {"stage": 2, "hours_after": 20, "channels": ["slack", "email"], "recipients": ["store_manager", "accounts_incharge"]}
 ]'),
('damage_report_filed', 'damage_reports', 
 '{"immediate": true}', 
 '[
   {"stage": 1, "minutes_after": 0, "channels": ["slack", "email"], "recipients": ["store_manager", "accounts_incharge"]}
 ]');
```

### 16. Notification Preferences Table
User-level preferences for email and Slack notifications.

```sql
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
```

### 17. Credit Alerts Table
Tracks multi-stage credit payment recovery alerts.

```sql
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
```

### 18. Notification Log Table
Complete log of all notifications sent with delivery status.

```sql
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
```

---

## Enhanced Supporting Tables

### 19. Expense Categories Table
Enhanced with ML support and custom rules.

```sql
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
```

### 20. Audit Logs Table
Enhanced comprehensive audit trail with plugin support.

```sql
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
```

**Indexes:**
- `idx_audit_table_record` ON (table_name, record_id)
- `idx_audit_user` ON user_id
- `idx_audit_created` ON created_at
- `idx_audit_action` ON action_type
- `idx_audit_module` ON module_name

### 21. System Settings Table
Enhanced with module-specific settings and validation.

```sql
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
```

**Initial Settings:**
```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type, module_name, description) VALUES
-- Core Cash Management Settings
('daily_deadline_time', '12:00:00', 'string', 'core', 'Default daily sales entry deadline'),
('max_petty_cash_limit', '5000.00', 'number', 'core', 'Maximum petty cash limit per store'),
('expense_approval_threshold', '500.00', 'number', 'core', 'Expense amount requiring approval'),
('cash_variance_alert_threshold', '100.00', 'number', 'core', 'Cash variance threshold for alerts'),

-- Security and Session Settings
('session_timeout_minutes', '60', 'number', 'auth', 'User session timeout in minutes'),
('mobile_session_timeout_minutes', '120', 'number', 'auth', 'Mobile app session timeout in minutes'),
('biometric_auth_enabled', 'true', 'boolean', 'auth', 'Enable biometric authentication for mobile'),

-- Notification Settings
('push_notification_enabled', 'true', 'boolean', 'notifications', 'Enable push notifications'),
('deadline_reminder_minutes', '30', 'number', 'notifications', 'Minutes before deadline to send reminder'),

-- Sync and Integration Settings
('offline_sync_interval_minutes', '5', 'number', 'sync', 'Interval for offline data sync attempts'),
('max_offline_records', '1000', 'number', 'sync', 'Maximum offline records per device'),
('auto_sync_enabled', 'true', 'boolean', 'sync', 'Enable automatic data synchronization'),

-- File and Media Settings
('image_upload_max_size_mb', '10', 'number', 'files', 'Maximum image upload size in MB'),
('backup_retention_days', '1825', 'number', 'backup', 'Backup retention period in days (5 years)'),

-- ML and Analytics Settings
('auto_categorization_enabled', 'false', 'boolean', 'ml', 'Enable automatic expense categorization'),
('ml_confidence_threshold', '0.8', 'number', 'ml', 'Minimum confidence for auto-categorization'),

-- Workflow Settings
('workflow_timeout_hours', '24', 'number', 'workflow', 'Default workflow timeout in hours'),
('checklist_reminder_hours', '2', 'number', 'workflow', 'Hours before checklist deadline for reminders');
```

---

## Mobile and Integration Tables

### 22. Device Tokens Table (Enhanced)
```sql
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
```

### 23. Mobile Sessions Table (Enhanced)
```sql
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
```

### 24. Offline Sync Table (Enhanced)
```sql
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
```

### 25. Push Notifications Table (Enhanced)
```sql
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
```

---

## Future Expansion Architecture

### Modular Design Principles:
1. **Plugin Architecture**: Each new module adds its own tables with consistent naming
2. **JSONB Flexibility**: Custom data storage without schema changes
3. **Event-Driven**: All major actions trigger events for inter-module communication
4. **API-First**: Database designed for clean API abstractions
5. **Multi-tenant Ready**: Store-level isolation with shared configurations

### Planned Module Expansions:
- **Checklists Module**: workflow_templates, checklist_instances, checklist_responses
- **Inventory Module**: products, stock_movements, stock_reconciliation
- **HR Module**: employees, schedules, attendance, payroll
- **Analytics Module**: kpis, dashboards, reports, alerts
- **CRM Module**: customers, orders, loyalty_programs

### Migration Strategy:
- Phase 1: Core cash management (current 19 tables)
- Phase 2: Add workflow engine and custom fields
- Phase 3: Add integration framework
- Phase 4: Add module-specific tables as needed

---

## Enhanced Database Functions and Triggers

### 1. Update Timestamp Trigger (Enhanced)
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Trigger event for real-time sync
    PERFORM pg_notify('record_updated', json_build_object(
        'table', TG_TABLE_NAME,
        'id', NEW.id,
        'action', 'UPDATE'
    )::text);
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### 2. Extensible Audit Log Trigger
```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Build audit data with extensible structure
    audit_data := json_build_object(
        'table_name', TG_TABLE_NAME,
        'timestamp', NOW(),
        'user_id', current_setting('app.current_user_id', true),
        'store_id', current_setting('app.current_user_store_id', true)
    );

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action_type, old_values, user_id, additional_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), 
                nullif(current_setting('app.current_user_id', true), '')::UUID, audit_data);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action_type, old_values, new_values, user_id, additional_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), 
                nullif(current_setting('app.current_user_id', true), '')::UUID, audit_data);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action_type, new_values, user_id, additional_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), 
                nullif(current_setting('app.current_user_id', true), '')::UUID, audit_data);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';
```

### 3. Custom Field Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_custom_fields(entity_type TEXT, entity_id UUID, custom_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    field_record RECORD;
    field_value TEXT;
BEGIN
    -- Validate each custom field based on its definition
    FOR field_record IN 
        SELECT * FROM custom_fields 
        WHERE entity_type = validate_custom_fields.entity_type 
        AND is_active = true
    LOOP
        field_value := custom_data ->> field_record.field_name;
        
        -- Check required fields
        IF field_record.is_required AND (field_value IS NULL OR field_value = '') THEN
            RAISE EXCEPTION 'Required field % is missing', field_record.field_label;
        END IF;
        
        -- Type validation would go here based on field_type
        -- This is a simplified version
    END LOOP;
    
    RETURN TRUE;
END;
$$ language 'plpgsql';
```

---

## Performance and Scalability Considerations

### Indexing Strategy:
- JSONB GIN indexes for flexible queries
- Partial indexes for filtered data
- Composite indexes for common query patterns
- Store-based partitioning for large datasets

### Caching Strategy:
- Redis for session management
- Application-level caching for settings and configurations
- Materialized views for complex reports
- CDN for static assets and images

### Monitoring and Observability:
- Query performance tracking
- Real-time system health metrics
- Audit log analytics
- Custom field usage statistics

This extensible schema provides a solid foundation for cash management while enabling seamless expansion into a comprehensive operational super app.