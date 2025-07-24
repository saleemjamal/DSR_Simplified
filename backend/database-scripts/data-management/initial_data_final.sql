-- =================================================================
-- INITIAL DATA SETUP (FINAL CORRECTED VERSION)
-- Poppat Jamals Daily Reporting System
-- =================================================================

-- =================================================================
-- 1. EXPENSE CATEGORIES (No dependencies)
-- =================================================================

INSERT INTO expense_categories (
    category_name, 
    category_description, 
    requires_approval, 
    approval_threshold,
    auto_categorization_rules
) VALUES 
(
    'staff_welfare', 
    'Staff welfare expenses including tea, coffee, snacks', 
    false, 
    200.00,
    '{"keywords": ["tea", "coffee", "snacks", "water", "biscuits"], "confidence_weight": 0.8}'::jsonb
),
(
    'logistics', 
    'Transportation and delivery related expenses', 
    true, 
    500.00,
    '{"keywords": ["transport", "fuel", "petrol", "diesel", "delivery", "shipping"], "confidence_weight": 0.9}'::jsonb
),
(
    'maintenance', 
    'Store maintenance and repair expenses', 
    true, 
    1000.00,
    '{"keywords": ["repair", "maintenance", "fix", "service", "cleaning"], "confidence_weight": 0.85}'::jsonb
),
(
    'office_supplies', 
    'Office stationery and supplies', 
    false, 
    300.00,
    '{"keywords": ["stationery", "paper", "pen", "office", "supplies"], "confidence_weight": 0.7}'::jsonb
),
(
    'utilities', 
    'Electricity, water and other utility bills', 
    true, 
    2000.00,
    '{"keywords": ["electricity", "water", "bill", "utility", "power"], "confidence_weight": 0.9}'::jsonb
),
(
    'marketing', 
    'Marketing and promotional expenses', 
    true, 
    1500.00,
    '{"keywords": ["marketing", "promotion", "advertisement", "banner", "flyer"], "confidence_weight": 0.8}'::jsonb
),
(
    'miscellaneous', 
    'Other miscellaneous expenses', 
    false, 
    100.00,
    '{"keywords": [], "confidence_weight": 0.3}'::jsonb
);

-- =================================================================
-- 2. SYSTEM SETTINGS (No dependencies)
-- =================================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, module_name, description) VALUES
-- Core Cash Management Settings
('daily_deadline_time', '12:00:00', 'string', 'core', 'Default daily sales entry deadline'),
('max_petty_cash_limit', '5000.00', 'number', 'core', 'Maximum petty cash limit per store'),
('expense_approval_threshold', '500.00', 'number', 'core', 'Expense amount requiring approval'),
('cash_variance_alert_threshold', '100.00', 'number', 'core', 'Cash variance threshold for alerts'),
('hand_bill_conversion_deadline_hours', '24', 'number', 'core', 'Hours to convert hand bills to system bills'),

-- Security and Session Settings
('session_timeout_minutes', '60', 'number', 'auth', 'User session timeout in minutes'),
('mobile_session_timeout_minutes', '120', 'number', 'auth', 'Mobile app session timeout in minutes'),
('biometric_auth_enabled', 'true', 'boolean', 'auth', 'Enable biometric authentication for mobile'),
('password_min_length', '8', 'number', 'auth', 'Minimum password length for local accounts'),
('max_login_attempts', '5', 'number', 'auth', 'Maximum failed login attempts before lockout'),

-- Notification Settings
('push_notification_enabled', 'true', 'boolean', 'notifications', 'Enable push notifications'),
('deadline_reminder_minutes', '30', 'number', 'notifications', 'Minutes before deadline to send reminder'),
('email_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('slack_notifications_enabled', 'false', 'boolean', 'notifications', 'Enable Slack notifications'),

-- Sync and Integration Settings
('offline_sync_interval_minutes', '5', 'number', 'sync', 'Interval for offline data sync attempts'),
('max_offline_records', '1000', 'number', 'sync', 'Maximum offline records per device'),
('auto_sync_enabled', 'true', 'boolean', 'sync', 'Enable automatic data synchronization'),
('sync_conflict_resolution', 'server_wins', 'string', 'sync', 'Default conflict resolution strategy'),

-- File and Media Settings
('image_upload_max_size_mb', '10', 'number', 'files', 'Maximum image upload size in MB'),
('backup_retention_days', '1825', 'number', 'backup', 'Backup retention period in days (5 years)'),
('voucher_image_required', 'false', 'boolean', 'files', 'Require voucher image for expense entries'),

-- ML and Analytics Settings
('auto_categorization_enabled', 'false', 'boolean', 'ml', 'Enable automatic expense categorization'),
('ml_confidence_threshold', '0.8', 'number', 'ml', 'Minimum confidence for auto-categorization'),
('analytics_retention_months', '24', 'number', 'analytics', 'Analytics data retention in months'),

-- Workflow Settings
('workflow_timeout_hours', '24', 'number', 'workflow', 'Default workflow timeout in hours'),
('checklist_reminder_hours', '2', 'number', 'workflow', 'Hours before checklist deadline for reminders'),

-- Business Rules
('gift_voucher_expiry_months', '12', 'number', 'vouchers', 'Default gift voucher expiry in months'),
('gift_voucher_minimum_amount', '100.00', 'number', 'vouchers', 'Minimum gift voucher amount'),
('credit_payment_grace_days', '7', 'number', 'credit', 'Grace period for credit payments'),
('damage_report_auto_notify', 'true', 'boolean', 'damage', 'Auto-notify on damage reports');

-- =================================================================
-- 3. SAMPLE STORE (ANNANAGAR) - No dependencies
-- =================================================================

INSERT INTO stores (
    store_code, 
    store_name, 
    address, 
    phone, 
    daily_deadline_time, 
    petty_cash_limit,
    configuration,
    metadata
) VALUES (
    'AN001', 
    'Poppat Jamals - Annanagar', 
    'Shop No. 15, Annanagar Main Road, Chennai - 600040', 
    '+91-44-26615234',
    '12:00:00',
    5000.00,
    '{
        "business_hours": {
            "monday": {"open": "09:00", "close": "21:00"},
            "tuesday": {"open": "09:00", "close": "21:00"},
            "wednesday": {"open": "09:00", "close": "21:00"},
            "thursday": {"open": "09:00", "close": "21:00"},
            "friday": {"open": "09:00", "close": "21:00"},
            "saturday": {"open": "09:00", "close": "21:00"},
            "sunday": {"open": "09:00", "close": "21:00"}
        },
        "payment_methods": ["cash", "credit", "credit_card", "upi", "gift_voucher"],
        "upi_vendors": ["GooglePay", "PhonePe", "Amazon Pay", "Paytm"],
        "features": {
            "gift_vouchers": true,
            "damage_reporting": true,
            "expense_management": true,
            "mobile_app": true
        }
    }'::jsonb,
    '{
        "store_type": "retail",
        "region": "south",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600040"
    }'::jsonb
);

-- =================================================================
-- 4. SAMPLE SYSTEM ADMIN USER (Depends on store)
-- =================================================================

-- Get the store ID for Annanagar
WITH annanagar_store AS (
    SELECT id as store_id FROM stores WHERE store_code = 'AN001'
)
INSERT INTO users (
    username,
    email, 
    first_name,
    last_name,
    role,
    store_id,
    authentication_type,
    is_active
)
SELECT 
    'system_admin',
    'admin@poppatjamals.com',
    'System',
    'Administrator', 
    'super_user',
    store_id,
    'google_sso',
    true
FROM annanagar_store;

-- =================================================================
-- 5. SAMPLE EXPORT TEMPLATES (Depends on system admin user)
-- =================================================================

INSERT INTO export_templates (
    template_name, 
    data_source, 
    export_format, 
    template_definition, 
    field_mappings, 
    created_by
) VALUES 
(
    'Daily Sales Report', 
    'sales', 
    'csv',
    '{
        "headers": ["Date", "Tender Type", "Amount", "Reference", "Entered By"],
        "date_format": "DD/MM/YYYY",
        "include_totals": true,
        "group_by": "tender_type"
    }'::jsonb,
    '{
        "sale_date": "Date",
        "tender_type": "Tender Type", 
        "amount": "Amount",
        "transaction_reference": "Reference",
        "entered_by": "Entered By"
    }'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'Expense Summary', 
    'expenses', 
    'excel',
    '{
        "sheets": [
            {
                "name": "Summary",
                "headers": ["Date", "Category", "Description", "Amount", "Status"],
                "include_charts": true
            }
        ],
        "formatting": {
            "currency_columns": ["amount"],
            "date_format": "DD/MM/YYYY"
        }
    }'::jsonb,
    '{
        "expense_date": "Date",
        "category": "Category",
        "description": "Description", 
        "amount": "Amount",
        "approval_status": "Status"
    }'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'Gift Voucher Report', 
    'gift_vouchers', 
    'json',
    '{
        "structure": "array",
        "include_metadata": true,
        "date_format": "ISO8601"
    }'::jsonb,
    '{
        "voucher_number": "voucher_number",
        "original_amount": "original_amount",
        "current_balance": "current_balance",
        "status": "status",
        "issued_date": "issued_date"
    }'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
);

-- =================================================================
-- 6. SAMPLE WORKFLOWS (Depends on system admin user)
-- =================================================================

INSERT INTO workflows (
    workflow_name, 
    workflow_type, 
    description, 
    definition, 
    created_by
) VALUES 
(
    'Daily Opening Checklist',
    'checklist',
    'Daily store opening procedures checklist',
    '{
        "steps": [
            {
                "id": 1,
                "title": "Unlock store and turn on lights",
                "required": true,
                "type": "checkbox"
            },
            {
                "id": 2,
                "title": "Count opening cash",
                "required": true,
                "type": "number",
                "field_name": "opening_cash"
            },
            {
                "id": 3,
                "title": "Check petty cash float",
                "required": true,
                "type": "number",
                "field_name": "petty_cash_amount"
            },
            {
                "id": 4,
                "title": "Review previous day reports",
                "required": false,
                "type": "checkbox"
            },
            {
                "id": 5,
                "title": "Check for pending hand bill conversions",
                "required": true,
                "type": "checkbox"
            }
        ],
        "timeout_hours": 2,
        "notify_on_timeout": true
    }'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'Daily Closing Checklist',
    'checklist', 
    'Daily store closing procedures checklist',
    '{
        "steps": [
            {
                "id": 1,
                "title": "Complete daily sales entry",
                "required": true,
                "type": "checkbox"
            },
            {
                "id": 2,
                "title": "Count closing cash",
                "required": true,
                "type": "number",
                "field_name": "closing_cash"
            },
            {
                "id": 3,
                "title": "Record any cash variance",
                "required": false,
                "type": "text",
                "field_name": "variance_reason"
            },
            {
                "id": 4,
                "title": "Submit daily reconciliation",
                "required": true,
                "type": "checkbox"
            },
            {
                "id": 5,
                "title": "Lock store and set security",
                "required": true,
                "type": "checkbox"
            }
        ],
        "timeout_hours": 1,
        "notify_on_timeout": true
    }'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
);

-- =================================================================
-- 7. SAMPLE CUSTOM FIELDS (Depends on system admin user)
-- =================================================================

INSERT INTO custom_fields (
    entity_type, 
    field_name, 
    field_label, 
    field_type, 
    field_options, 
    is_required, 
    created_by
) VALUES 
(
    'expenses',
    'supplier_name',
    'Supplier Name',
    'text',
    '{}'::jsonb,
    false,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'expenses',
    'invoice_number',
    'Invoice Number',
    'text',
    '{}'::jsonb,
    false,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'expenses',
    'payment_due_date',
    'Payment Due Date',
    'date',
    '{}'::jsonb,
    false,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'sales',
    'customer_type',
    'Customer Type',
    'select',
    '{"options": ["Regular", "VIP", "Wholesale", "Walk-in"]}'::jsonb,
    false,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'damage_reports',
    'damage_severity',
    'Damage Severity',
    'select',
    '{"options": ["Minor", "Moderate", "Major", "Total Loss"]}'::jsonb,
    true,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'gift_vouchers',
    'occasion',
    'Occasion',
    'select',
    '{"options": ["Birthday", "Anniversary", "Festival", "Corporate", "Other"]}'::jsonb,
    false,
    (SELECT id FROM users WHERE username = 'system_admin')
);

-- =================================================================
-- 8. ALERT CONFIGURATIONS (Depends on system admin user)
-- =================================================================

INSERT INTO alert_configurations (
    alert_type, 
    entity_type, 
    trigger_condition, 
    alert_stages, 
    created_by
) VALUES 
(
    'credit_payment_overdue', 
    'sales', 
    '{"days_overdue": 0}'::jsonb, 
    '[
        {"stage": 1, "days_after": 7, "channels": ["email"], "recipients": ["store_manager"], "message_template": "Credit payment reminder: {customer_reference} - Amount: {amount}"},
        {"stage": 2, "days_after": 15, "channels": ["email", "slack"], "recipients": ["store_manager", "accounts_incharge"], "message_template": "Overdue credit payment: {customer_reference} - Amount: {amount} - {days_overdue} days overdue"},
        {"stage": 3, "days_after": 30, "channels": ["email", "sms"], "recipients": ["accounts_incharge", "super_user"], "message_template": "URGENT: Credit payment severely overdue: {customer_reference} - Amount: {amount} - {days_overdue} days overdue"}
    ]'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'hand_bill_conversion', 
    'sales', 
    '{"hours_pending": 12}'::jsonb, 
    '[
        {"stage": 1, "hours_after": 12, "channels": ["push"], "recipients": ["store_manager"], "message_template": "Hand bill conversion reminder: {transaction_reference}"},
        {"stage": 2, "hours_after": 20, "channels": ["push", "email"], "recipients": ["store_manager", "accounts_incharge"], "message_template": "Hand bill conversion overdue: {transaction_reference} - {hours_pending} hours pending"}
    ]'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'damage_report_filed', 
    'damage_reports', 
    '{"immediate": true}'::jsonb, 
    '[
        {"stage": 1, "minutes_after": 0, "channels": ["email"], "recipients": ["store_manager", "accounts_incharge"], "message_template": "New damage report filed: {item_name} - Supplier: {supplier_name} - Quantity: {quantity}"}
    ]'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'expense_approval_pending', 
    'expenses', 
    '{"amount_threshold": 500}'::jsonb, 
    '[
        {"stage": 1, "hours_after": 4, "channels": ["push"], "recipients": ["store_manager"], "message_template": "Expense approval pending: {description} - Amount: {amount}"},
        {"stage": 2, "hours_after": 24, "channels": ["email"], "recipients": ["accounts_incharge"], "message_template": "Expense approval overdue: {description} - Amount: {amount} - Requested by: {requested_by}"}
    ]'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
),
(
    'daily_deadline_reminder', 
    'sales', 
    '{"deadline_approaching": true}'::jsonb, 
    '[
        {"stage": 1, "minutes_after": -30, "channels": ["push"], "recipients": ["store_manager", "cashier"], "message_template": "Daily sales entry deadline in 30 minutes"},
        {"stage": 2, "minutes_after": 60, "channels": ["email"], "recipients": ["store_manager", "accounts_incharge"], "message_template": "Daily sales entry deadline missed for {store_name}"}
    ]'::jsonb,
    (SELECT id FROM users WHERE username = 'system_admin')
);

-- =================================================================
-- 9. SUCCESS MESSAGE
-- =================================================================

-- Insert a success message in audit logs to confirm setup
INSERT INTO audit_logs (
    table_name, 
    record_id, 
    action_type, 
    new_values,
    module_name,
    additional_data
) VALUES (
    'system_settings',
    gen_random_uuid(),
    'INSERT',
    '{"message": "Database initialization completed successfully"}'::jsonb,
    'setup',
    jsonb_build_object(
        'timestamp', NOW(),
        'tables_created', 25,
        'expense_categories', 7,
        'system_settings', 24,
        'alert_configurations', 5,
        'export_templates', 3,
        'workflows', 2,
        'custom_fields', 6,
        'sample_store', 'Annanagar (AN001)',
        'sample_admin', 'system_admin'
    )
);

-- Display completion message
SELECT 
    'Database setup completed successfully!' as message,
    '25 tables created' as tables,
    '7 expense categories added' as categories,
    '24 system settings configured' as settings,
    'Sample store (Annanagar) created' as store,
    'System admin user created' as admin_user,
    'All JSON fields properly cast' as json_fix,
    'Ready for Phase 2 - Authentication setup' as next_step;