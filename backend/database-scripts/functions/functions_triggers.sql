-- =================================================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- Poppat Jamals Daily Reporting System
-- =================================================================

-- =================================================================
-- 1. UPDATE TIMESTAMP TRIGGER FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Trigger event for real-time sync (optional)
    PERFORM pg_notify('record_updated', json_build_object(
        'table', TG_TABLE_NAME,
        'id', NEW.id,
        'action', 'UPDATE'
    )::text);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp trigger to all relevant tables
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_reconciliation_updated_at BEFORE UPDATE ON daily_reconciliation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at BEFORE UPDATE ON custom_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_field_values_updated_at BEFORE UPDATE ON custom_field_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_configs_updated_at BEFORE UPDATE ON integration_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_templates_updated_at BEFORE UPDATE ON export_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_vouchers_updated_at BEFORE UPDATE ON gift_vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_damage_reports_updated_at BEFORE UPDATE ON damage_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_configurations_updated_at BEFORE UPDATE ON alert_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_alerts_updated_at BEFORE UPDATE ON credit_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 2. AUDIT LOG TRIGGER FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
    current_user_id UUID;
    current_store_id UUID;
BEGIN
    -- Get current user context (will be set by application)
    current_user_id := nullif(current_setting('app.current_user_id', true), '')::UUID;
    current_store_id := nullif(current_setting('app.current_user_store_id', true), '')::UUID;
    
    -- Build audit data with extensible structure
    audit_data := json_build_object(
        'table_name', TG_TABLE_NAME,
        'timestamp', NOW(),
        'user_id', current_user_id,
        'store_id', current_store_id,
        'ip_address', current_setting('app.client_ip', true),
        'user_agent', current_setting('app.user_agent', true)
    );

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action_type, old_values, user_id, store_id, additional_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), 
                current_user_id, current_store_id, audit_data);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action_type, old_values, new_values, user_id, store_id, additional_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), 
                current_user_id, current_store_id, audit_data);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action_type, new_values, user_id, store_id, additional_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), 
                current_user_id, current_store_id, audit_data);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_petty_cash AFTER INSERT OR UPDATE OR DELETE ON petty_cash
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_daily_reconciliation AFTER INSERT OR UPDATE OR DELETE ON daily_reconciliation
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_gift_vouchers AFTER INSERT OR UPDATE OR DELETE ON gift_vouchers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_stores AFTER INSERT OR UPDATE OR DELETE ON stores
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =================================================================
-- 3. GIFT VOUCHER NUMBERING FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION generate_voucher_number(store_prefix VARCHAR DEFAULT 'PJ')
RETURNS VARCHAR AS $$
DECLARE
    sequence_num INTEGER;
    voucher_num VARCHAR;
BEGIN
    -- Get next sequence number for today
    sequence_num := (
        SELECT COALESCE(MAX(
            CASE 
                WHEN voucher_number ~ '^' || store_prefix || '[0-9]{8}[0-9]{4}$' 
                THEN RIGHT(voucher_number, 4)::INTEGER 
                ELSE 0 
            END
        ), 0) + 1
        FROM gift_vouchers 
        WHERE DATE(created_at) = CURRENT_DATE
        AND voucher_number LIKE store_prefix || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '%'
    );
    
    -- Format: PJ + YYYYMMDD + 4-digit sequence
    voucher_num := store_prefix || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN voucher_num;
END;
$$ language 'plpgsql';

-- =================================================================
-- 4. CASH RECONCILIATION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION calculate_daily_reconciliation(
    p_store_id UUID,
    p_date DATE
)
RETURNS TABLE (
    opening_cash DECIMAL(10,2),
    total_cash_sales DECIMAL(10,2),
    total_expenses DECIMAL(10,2),
    expected_closing DECIMAL(10,2),
    petty_cash_balance DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_data AS (
        -- Get opening cash from previous day's reconciliation or petty cash
        SELECT 
            COALESCE(
                (SELECT actual_closing_cash 
                 FROM daily_reconciliation 
                 WHERE store_id = p_store_id 
                 AND reconciliation_date = p_date - INTERVAL '1 day'
                 ORDER BY created_at DESC LIMIT 1),
                (SELECT balance_after 
                 FROM petty_cash 
                 WHERE store_id = p_store_id 
                 AND transaction_date <= p_date
                 ORDER BY created_at DESC LIMIT 1),
                0.00
            ) as opening_amount,
            
            -- Get total cash sales for the day
            COALESCE(
                (SELECT SUM(amount) 
                 FROM sales 
                 WHERE store_id = p_store_id 
                 AND sale_date = p_date 
                 AND tender_type = 'cash'),
                0.00
            ) as cash_sales,
            
            -- Get total expenses for the day
            COALESCE(
                (SELECT SUM(amount) 
                 FROM expenses 
                 WHERE store_id = p_store_id 
                 AND expense_date = p_date 
                 AND payment_method = 'petty_cash'),
                0.00
            ) as total_exp,
            
            -- Get current petty cash balance
            COALESCE(
                (SELECT balance_after 
                 FROM petty_cash 
                 WHERE store_id = p_store_id 
                 AND transaction_date <= p_date
                 ORDER BY created_at DESC LIMIT 1),
                0.00
            ) as petty_balance
    )
    SELECT 
        opening_amount,
        cash_sales,
        total_exp,
        opening_amount + cash_sales - total_exp,
        petty_balance
    FROM daily_data;
END;
$$ language 'plpgsql';

-- =================================================================
-- 5. CUSTOM FIELD VALIDATION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION validate_custom_fields(
    entity_type TEXT, 
    entity_id UUID, 
    custom_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    field_record RECORD;
    field_value TEXT;
    numeric_value NUMERIC;
    date_value DATE;
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
        
        -- Skip validation if field is empty and not required
        IF field_value IS NULL OR field_value = '' THEN
            CONTINUE;
        END IF;
        
        -- Type-specific validation
        CASE field_record.field_type
            WHEN 'number' THEN
                BEGIN
                    numeric_value := field_value::NUMERIC;
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE EXCEPTION 'Field % must be a valid number', field_record.field_label;
                END;
                
            WHEN 'date' THEN
                BEGIN
                    date_value := field_value::DATE;
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE EXCEPTION 'Field % must be a valid date', field_record.field_label;
                END;
                
            WHEN 'boolean' THEN
                IF field_value NOT IN ('true', 'false', '1', '0', 'yes', 'no') THEN
                    RAISE EXCEPTION 'Field % must be a valid boolean value', field_record.field_label;
                END IF;
                
            WHEN 'select' THEN
                IF NOT (field_record.field_options ? 'options') THEN
                    RAISE EXCEPTION 'Select field % has no options defined', field_record.field_label;
                END IF;
                
                IF NOT (field_value = ANY(
                    SELECT jsonb_array_elements_text(field_record.field_options->'options')
                )) THEN
                    RAISE EXCEPTION 'Field % value is not in allowed options', field_record.field_label;
                END IF;
        END CASE;
        
        -- Additional validation rules (if any)
        IF field_record.validation_rules IS NOT NULL AND field_record.validation_rules != '{}' THEN
            -- Custom validation logic can be added here
            -- For now, we'll skip complex validation rules
            NULL;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ language 'plpgsql';

-- =================================================================
-- 6. ALERT SCHEDULING FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION schedule_credit_alerts(sales_record_id UUID)
RETURNS VOID AS $$
DECLARE
    sales_rec RECORD;
    alert_config RECORD;
    stage_config JSONB;
    stage_index INTEGER;
    scheduled_time TIMESTAMP;
BEGIN
    -- Get the sales record
    SELECT * INTO sales_rec FROM sales WHERE id = sales_record_id;
    
    IF NOT FOUND OR sales_rec.tender_type != 'credit' THEN
        RETURN;
    END IF;
    
    -- Get alert configuration for credit payments
    SELECT * INTO alert_config 
    FROM alert_configurations 
    WHERE alert_type = 'credit_payment_overdue' 
    AND entity_type = 'sales' 
    AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Schedule alerts for each stage
    FOR stage_index IN 0..(jsonb_array_length(alert_config.alert_stages) - 1)
    LOOP
        stage_config := alert_config.alert_stages->stage_index;
        
        -- Calculate scheduled time
        IF stage_config ? 'days_after' THEN
            scheduled_time := sales_rec.created_at + INTERVAL '1 day' * (stage_config->>'days_after')::INTEGER;
        ELSIF stage_config ? 'hours_after' THEN
            scheduled_time := sales_rec.created_at + INTERVAL '1 hour' * (stage_config->>'hours_after')::INTEGER;
        ELSIF stage_config ? 'minutes_after' THEN
            scheduled_time := sales_rec.created_at + INTERVAL '1 minute' * (stage_config->>'minutes_after')::INTEGER;
        ELSE
            CONTINUE;
        END IF;
        
        -- Insert credit alert
        INSERT INTO credit_alerts (
            sales_id,
            alert_stage,
            scheduled_at,
            alert_type,
            channels,
            recipients,
            message_template
        ) VALUES (
            sales_record_id,
            (stage_config->>'stage')::INTEGER,
            scheduled_time,
            'credit_payment_overdue',
            stage_config->'channels',
            stage_config->'recipients',
            COALESCE(stage_config->>'message_template', 'Credit payment overdue reminder')
        );
    END LOOP;
END;
$$ language 'plpgsql';

-- =================================================================
-- 7. AUTOMATIC ALERT TRIGGER FOR CREDIT SALES
-- =================================================================

CREATE OR REPLACE FUNCTION trigger_credit_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule alerts for new credit sales
    IF NEW.tender_type = 'credit' AND OLD IS NULL THEN
        PERFORM schedule_credit_alerts(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sales_credit_alert_trigger 
    AFTER INSERT ON sales
    FOR EACH ROW 
    EXECUTE FUNCTION trigger_credit_alerts();

-- =================================================================
-- 8. VOUCHER BALANCE UPDATE FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION update_voucher_balance(
    voucher_id UUID,
    redemption_amount DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    voucher_rec RECORD;
    new_balance DECIMAL(10,2);
BEGIN
    -- Get current voucher details
    SELECT * INTO voucher_rec FROM gift_vouchers WHERE id = voucher_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voucher not found';
    END IF;
    
    IF voucher_rec.status != 'active' THEN
        RAISE EXCEPTION 'Voucher is not active';
    END IF;
    
    IF voucher_rec.current_balance < redemption_amount THEN
        RAISE EXCEPTION 'Insufficient voucher balance';
    END IF;
    
    -- Calculate new balance
    new_balance := voucher_rec.current_balance - redemption_amount;
    
    -- Update voucher
    UPDATE gift_vouchers 
    SET 
        current_balance = new_balance,
        status = CASE WHEN new_balance = 0 THEN 'redeemed' ELSE 'active' END,
        updated_at = NOW()
    WHERE id = voucher_id;
    
    RETURN TRUE;
END;
$$ language 'plpgsql';

-- =================================================================
-- 9. EXPENSE CATEGORY AUTO-DETECTION (ML Placeholder)
-- =================================================================

CREATE OR REPLACE FUNCTION auto_categorize_expense(
    expense_description TEXT,
    expense_amount DECIMAL(10,2)
)
RETURNS TABLE (
    suggested_category VARCHAR(50),
    confidence DECIMAL(3,2)
) AS $$
BEGIN
    -- Simple rule-based categorization (placeholder for ML)
    -- In a real implementation, this would call ML model
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN LOWER(expense_description) LIKE '%tea%' OR LOWER(expense_description) LIKE '%coffee%' 
                THEN 'staff_welfare'
            WHEN LOWER(expense_description) LIKE '%transport%' OR LOWER(expense_description) LIKE '%fuel%' 
                THEN 'logistics'
            WHEN LOWER(expense_description) LIKE '%repair%' OR LOWER(expense_description) LIKE '%maintenance%' 
                THEN 'maintenance'
            WHEN LOWER(expense_description) LIKE '%stationery%' OR LOWER(expense_description) LIKE '%office%' 
                THEN 'office_supplies'
            ELSE 'miscellaneous'
        END::VARCHAR(50) as category,
        CASE 
            WHEN LOWER(expense_description) LIKE '%tea%' OR LOWER(expense_description) LIKE '%coffee%' 
                THEN 0.85
            WHEN LOWER(expense_description) LIKE '%transport%' OR LOWER(expense_description) LIKE '%fuel%' 
                THEN 0.80
            ELSE 0.60
        END::DECIMAL(3,2) as conf;
END;
$$ language 'plpgsql';