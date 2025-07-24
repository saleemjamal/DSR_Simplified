-- =================================================================
-- CASH RECONCILIATION CALCULATION FUNCTION
-- File: 02-cash-reconciliation-function.sql
-- Purpose: Create comprehensive cash variance calculation function
-- =================================================================

-- Description:
-- This script creates a PostgreSQL function to calculate daily cash variance
-- based on all cash transactions across different transaction types.
-- 
-- Formula: Cash Variance = Cash Sales + HB Cash + GV Cash + SO Advance Cash 
--                         - Petty Cash Expenses - RRN Cash

-- =================================================================
-- 1. MAIN CASH VARIANCE CALCULATION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION calculate_daily_cash_variance(
    p_store_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    calculation_date DATE,
    store_id UUID,
    cash_sales DECIMAL(10,2),
    hand_bill_cash DECIMAL(10,2),
    gift_voucher_cash DECIMAL(10,2),
    sales_order_advance_cash DECIMAL(10,2),
    petty_cash_expenses DECIMAL(10,2),
    return_cash DECIMAL(10,2),
    total_cash_in DECIMAL(10,2),
    total_cash_out DECIMAL(10,2),
    net_cash_variance DECIMAL(10,2),
    variance_status VARCHAR(20)
) AS $$
DECLARE
    v_cash_sales DECIMAL(10,2) := 0;
    v_hb_cash DECIMAL(10,2) := 0;
    v_gv_cash DECIMAL(10,2) := 0;
    v_so_advance_cash DECIMAL(10,2) := 0;
    v_petty_cash_expenses DECIMAL(10,2) := 0;
    v_return_cash DECIMAL(10,2) := 0;
    v_total_in DECIMAL(10,2);
    v_total_out DECIMAL(10,2);
    v_variance DECIMAL(10,2);
    v_status VARCHAR(20);
BEGIN
    -- 1. Calculate Cash Sales from daily sales entries
    SELECT COALESCE(SUM(tender_amount), 0)
    INTO v_cash_sales
    FROM sales 
    WHERE store_id = p_store_id 
      AND sale_date = p_date 
      AND tender_type = 'cash';

    -- 2. Calculate Hand Bill Cash payments
    SELECT COALESCE(SUM(amount), 0)
    INTO v_hb_cash
    FROM hand_bills 
    WHERE store_id = p_store_id 
      AND sale_date = p_date 
      AND payment_method = 'cash'
      AND status != 'cancelled';

    -- 3. Calculate Gift Voucher Cash purchases
    SELECT COALESCE(SUM(original_amount), 0)
    INTO v_gv_cash
    FROM gift_vouchers 
    WHERE store_id = p_store_id 
      AND issued_date = p_date 
      AND payment_method = 'cash'
      AND status != 'cancelled';

    -- 4. Calculate Sales Order Advance Cash payments
    SELECT COALESCE(SUM(d.amount), 0)
    INTO v_so_advance_cash
    FROM deposits d
    JOIN sales_orders so ON d.sales_order_id = so.id
    WHERE so.store_id = p_store_id 
      AND d.deposit_date = p_date 
      AND d.payment_method = 'cash';

    -- 5. Calculate Petty Cash Expenses (cash out)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_petty_cash_expenses
    FROM expenses 
    WHERE store_id = p_store_id 
      AND expense_date = p_date 
      AND payment_method = 'petty_cash'
      AND status IN ('approved', 'pending'); -- Include pending expenses

    -- 6. Calculate Return Cash payments (cash out)
    SELECT COALESCE(SUM(return_amount), 0)
    INTO v_return_cash
    FROM returns 
    WHERE store_id = p_store_id 
      AND return_date = p_date 
      AND payment_method = 'cash'
      AND status != 'cancelled';

    -- 7. Calculate totals and variance
    v_total_in := v_cash_sales + v_hb_cash + v_gv_cash + v_so_advance_cash;
    v_total_out := v_petty_cash_expenses + v_return_cash;
    v_variance := v_total_in - v_total_out;

    -- 8. Determine variance status
    IF v_variance = 0 THEN
        v_status := 'balanced';
    ELSIF v_variance > 0 THEN
        v_status := 'surplus';
    ELSE
        v_status := 'deficit';
    END IF;

    -- 9. Return results
    RETURN QUERY
    SELECT 
        p_date,
        p_store_id,
        v_cash_sales,
        v_hb_cash,
        v_gv_cash,
        v_so_advance_cash,
        v_petty_cash_expenses,
        v_return_cash,
        v_total_in,
        v_total_out,
        v_variance,
        v_status;

END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 2. SIMPLIFIED CASH VARIANCE FUNCTION (FOR DASHBOARD)
-- =================================================================

CREATE OR REPLACE FUNCTION get_cash_variance_summary(
    p_store_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    variance_amount DECIMAL(10,2),
    variance_status VARCHAR(20),
    total_cash_transactions INTEGER
) AS $$
DECLARE
    v_variance DECIMAL(10,2);
    v_status VARCHAR(20);
    v_transaction_count INTEGER;
BEGIN
    -- Get variance from main calculation function
    SELECT net_cash_variance, variance_status
    INTO v_variance, v_status
    FROM calculate_daily_cash_variance(p_store_id, p_date);

    -- Count total cash transactions for the day
    SELECT 
        (
            (SELECT COUNT(*) FROM sales WHERE store_id = p_store_id AND sale_date = p_date AND tender_type = 'cash') +
            (SELECT COUNT(*) FROM hand_bills WHERE store_id = p_store_id AND sale_date = p_date AND payment_method = 'cash' AND status != 'cancelled') +
            (SELECT COUNT(*) FROM gift_vouchers WHERE store_id = p_store_id AND issued_date = p_date AND payment_method = 'cash' AND status != 'cancelled') +
            (SELECT COUNT(*) FROM expenses WHERE store_id = p_store_id AND expense_date = p_date AND payment_method = 'petty_cash') +
            (SELECT COUNT(*) FROM returns WHERE store_id = p_store_id AND return_date = p_date AND payment_method = 'cash' AND status != 'cancelled')
        )
    INTO v_transaction_count;

    RETURN QUERY
    SELECT 
        COALESCE(v_variance, 0::DECIMAL(10,2)),
        COALESCE(v_status, 'no_transactions'),
        COALESCE(v_transaction_count, 0);
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 3. CASH RECONCILIATION HISTORY FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION get_cash_variance_history(
    p_store_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    calculation_date DATE,
    variance_amount DECIMAL(10,2),
    variance_status VARCHAR(20),
    cash_in DECIMAL(10,2),
    cash_out DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        generate_series::DATE as calculation_date,
        cvd.net_cash_variance,
        cvd.variance_status,
        cvd.total_cash_in,
        cvd.total_cash_out
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) 
    LEFT JOIN calculate_daily_cash_variance(p_store_id, generate_series::DATE) cvd ON true
    ORDER BY calculation_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 4. GRANTS AND PERMISSIONS
-- =================================================================

-- Grant execute permissions to application roles
-- GRANT EXECUTE ON FUNCTION calculate_daily_cash_variance(UUID, DATE) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_cash_variance_summary(UUID, DATE) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_cash_variance_history(UUID, DATE, DATE) TO authenticated;

-- =================================================================
-- 5. TESTING QUERIES
-- =================================================================

-- Test the main cash variance calculation
-- SELECT * FROM calculate_daily_cash_variance('your-store-id', CURRENT_DATE);

-- Test the summary function  
-- SELECT * FROM get_cash_variance_summary('your-store-id', CURRENT_DATE);

-- Test the history function
-- SELECT * FROM get_cash_variance_history('your-store-id', CURRENT_DATE - 7, CURRENT_DATE);

-- =================================================================
-- 6. PERFORMANCE OPTIMIZATION INDEXES
-- =================================================================

-- Indexes for cash variance query performance
CREATE INDEX IF NOT EXISTS idx_sales_cash_variance 
ON sales(store_id, sale_date, tender_type) 
WHERE tender_type = 'cash';

CREATE INDEX IF NOT EXISTS idx_expenses_cash_variance 
ON expenses(store_id, expense_date, payment_method) 
WHERE payment_method = 'petty_cash';

CREATE INDEX IF NOT EXISTS idx_returns_cash_variance 
ON returns(store_id, return_date, payment_method) 
WHERE payment_method = 'cash';

CREATE INDEX IF NOT EXISTS idx_deposits_cash_variance 
ON deposits(deposit_date, payment_method) 
WHERE payment_method = 'cash';

-- =================================================================
-- USAGE EXAMPLES
-- =================================================================
--
-- 1. Get today's cash variance for a specific store:
-- SELECT * FROM get_cash_variance_summary('store-uuid', CURRENT_DATE);
--
-- 2. Get detailed breakdown for today:
-- SELECT * FROM calculate_daily_cash_variance('store-uuid', CURRENT_DATE);
--
-- 3. Get 7-day cash variance history:
-- SELECT * FROM get_cash_variance_history('store-uuid');
--
-- 4. Check variance status:
-- SELECT 
--   calculation_date,
--   net_cash_variance,
--   CASE 
--     WHEN variance_status = 'balanced' THEN '✅ Balanced'
--     WHEN variance_status = 'surplus' THEN '📈 Surplus'
--     WHEN variance_status = 'deficit' THEN '📉 Deficit'
--   END as status_display
-- FROM calculate_daily_cash_variance('store-uuid', CURRENT_DATE);
--
-- =================================================================