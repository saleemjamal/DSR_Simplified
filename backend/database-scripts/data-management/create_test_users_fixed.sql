-- =================================================================
-- CREATE TEST USERS FOR DEVELOPMENT (FIXED VERSION)
-- Poppat Jamals Daily Reporting System
-- Run this script in Supabase SQL Editor
-- =================================================================

-- =================================================================
-- CLEAN UP EXISTING TEST USERS (IF ANY)
-- =================================================================

-- Remove existing test users to avoid conflicts
DELETE FROM users WHERE username IN ('test_cashier', 'test_manager', 'test_accounts', 'test_admin');

-- =================================================================
-- CREATE TEST USER ACCOUNTS
-- =================================================================

-- Get the Annanagar store ID for reference
WITH annanagar_store AS (
    SELECT id as store_id FROM stores WHERE store_code = 'AN001'
)

-- Insert test users with bcrypt hashed passwords
INSERT INTO users (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    store_id,
    authentication_type,
    is_active
) 
SELECT 
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    CASE 
        WHEN role = 'super_user' THEN NULL 
        ELSE store_id 
    END,
    authentication_type,
    is_active
FROM annanagar_store, (VALUES
    -- Test Cashier Account
    (
        'test_cashier',
        NULL,
        '$2b$12$LQv3c1yqBwlFDpamOGrMIezHlOjKoKJrOQyJ3vGGKgXPwCaGcuU8q', -- password123
        'Test',
        'Cashier',
        'cashier',
        'local',
        true
    ),
    -- Test Store Manager Account  
    (
        'test_manager',
        'testmanager@poppatjamals.com',
        '$2b$12$LQv3c1yqBwlFDpamOGrMIezHlOjKoKJrOQyJ3vGGKgXPwCaGcuU8q', -- password123
        'Test',
        'Manager',
        'store_manager',
        'google_sso',
        true
    ),
    -- Test Accounts Incharge Account
    (
        'test_accounts',
        'testaccounts@poppatjamals.com', 
        '$2b$12$LQv3c1yqBwlFDpamOGrMIezHlOjKoKJrOQyJ3vGGKgXPwCaGcuU8q', -- password123
        'Test',
        'Accounts',
        'accounts_incharge',
        'google_sso',
        true
    ),
    -- Test Super User Account
    (
        'test_admin',
        'testadmin@poppatjamals.com',
        '$2b$12$LQv3c1yqBwlFDpamOGrMIezHlOjKoKJrOQyJ3vGGKgXPwCaGcuU8q', -- password123
        'Test',
        'Admin',
        'super_user',
        'google_sso',
        true
    )
) AS test_users(username, email, password_hash, first_name, last_name, role, authentication_type, is_active);

-- =================================================================
-- SUCCESS MESSAGE
-- =================================================================

-- Insert success message in audit logs
INSERT INTO audit_logs (
    table_name, 
    record_id, 
    action_type, 
    new_values,
    module_name,
    additional_data
) VALUES (
    'users',
    gen_random_uuid(),
    'INSERT',
    '{"message": "Test user accounts created successfully"}'::jsonb,
    'setup',
    jsonb_build_object(
        'timestamp', NOW(),
        'test_accounts_created', 4,
        'cashier', 'test_cashier / password123',
        'manager', 'test_manager / password123',
        'accounts', 'test_accounts / password123',
        'admin', 'test_admin / password123'
    )
);

-- Display test account information
SELECT 
    '🎉 Test accounts created successfully!' as message,
    'Use these credentials to login' as instruction;

-- Show the created accounts
SELECT 
    username,
    email,
    role,
    authentication_type,
    'password123' as password,
    CASE 
        WHEN role = 'cashier' THEN 'Use Cashier Login tab'
        ELSE 'Use Manager Login tab (for now, use local login)'
    END as login_tab,
    is_active
FROM users 
WHERE username LIKE 'test_%'
ORDER BY 
    CASE role 
        WHEN 'cashier' THEN 1
        WHEN 'store_manager' THEN 2  
        WHEN 'accounts_incharge' THEN 3
        WHEN 'super_user' THEN 4
    END;

-- =================================================================
-- QUICK LOGIN REFERENCE
-- =================================================================

SELECT 
    '📋 QUICK LOGIN REFERENCE' as info,
    '' as spacing;

SELECT 
    'CASHIER LOGIN' as account_type,
    'test_cashier' as username,
    'password123' as password,
    'Cashier Login Tab' as use_tab;

SELECT 
    'MANAGER LOGIN' as account_type,
    'test_manager' as username, 
    'password123' as password,
    'Manager Login Tab' as use_tab;

SELECT 
    'ACCOUNTS LOGIN' as account_type,
    'test_accounts' as username,
    'password123' as password,
    'Manager Login Tab' as use_tab;

SELECT 
    'ADMIN LOGIN' as account_type,
    'test_admin' as username,
    'password123' as password,
    'Manager Login Tab' as use_tab;