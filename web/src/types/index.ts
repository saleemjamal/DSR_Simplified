// User types
export interface User {
  id: string
  username: string
  email?: string
  first_name: string
  last_name: string
  role: 'store_manager' | 'accounts_incharge' | 'super_user' | 'cashier'
  store_id?: string
  authentication_type: 'google_sso' | 'local'
  is_active: boolean
  last_login?: string
  preferences: Record<string, any>
  created_at: string
  updated_at: string
  // Nested store object from backend joins
  stores?: {
    store_code: string
    store_name: string
    address?: string
    phone?: string
  }
}

// Store types
export interface Store {
  id: string
  store_code: string
  store_name: string
  address?: string
  phone?: string
  manager_id?: string
  is_active: boolean
  daily_deadline_time: string
  petty_cash_limit: number
  configuration: Record<string, any>
  created_at: string
  updated_at: string
}

// Sales types
export interface Sale {
  id: string
  store_id: string
  sale_date: string
  tender_type: 'cash' | 'credit' | 'credit_card' | 'upi' | 'hand_bill' | 'rrn' | 'gift_voucher'
  amount: number
  transaction_reference?: string
  customer_reference?: string
  notes?: string
  is_hand_bill_converted: boolean
  converted_at?: string
  converted_by?: string
  entered_by: string
  approved_by?: string
  approval_status: 'pending' | 'approved' | 'rejected'
  custom_data: Record<string, any>
  created_at: string
  updated_at: string
  // Nested objects from backend joins
  store?: {
    store_code: string
    store_name: string
  }
  entered_by_user?: {
    first_name: string
    last_name: string
  }
  approved_by_user?: {
    first_name: string
    last_name: string
  }
}

// Expense types
export interface Expense {
  id: string
  store_id: string
  expense_date: string
  category: string
  description: string
  amount: number
  voucher_number?: string
  voucher_image_url?: string
  payment_method: 'petty_cash' | 'bank_transfer' | 'credit_card'
  requested_by: string
  approved_by?: string
  approval_status: 'pending' | 'approved' | 'rejected'
  approval_notes?: string
  expense_owner?: string
  created_at: string
  updated_at: string
  // Nested objects from backend joins
  store?: {
    store_code: string
    store_name: string
  }
  requested_by_user?: {
    first_name: string
    last_name: string
  }
  approved_by_user?: {
    first_name: string
    last_name: string
  }
}

// Gift Voucher types
export interface GiftVoucher {
  id: string
  voucher_number: string
  original_amount: number
  current_balance: number
  issued_date: string
  expiry_date?: string
  status: 'active' | 'redeemed' | 'expired' | 'cancelled'
  voucher_type: 'system_generated' | 'legacy' | 'manual'
  store_id: string
  created_by?: string
  customer_id?: string       // NEW: Link to customer record
  customer_name?: string
  customer_phone?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Damage Report types
export interface DamageReport {
  id: string
  store_id: string
  report_date: string
  supplier_name: string
  dc_number?: string
  item_code?: string
  brand_name?: string
  item_name: string
  quantity: number
  damage_source?: string
  damage_category?: string
  action_taken?: string
  replacement_from_distributor: boolean
  credit_note_number?: string
  estimated_value?: number
  reported_by: string
  approved_by?: string
  status: 'reported' | 'investigating' | 'resolved' | 'closed'
  resolution_notes?: string
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  authentication_type: 'google_sso' | 'local'
}

// Form types
export interface SalesFormData {
  sale_date: string
  tender_type: Sale['tender_type']
  amount: number
  transaction_reference?: string
  customer_reference?: string
  notes?: string
}

export interface ExpenseFormData {
  expense_date: string
  category: string
  description: string
  amount: number
  voucher_number?: string
  expense_owner?: string
}

export interface VoucherFormData {
  original_amount: number
  expiry_date: string
  customer_name: string      // Now required
  customer_phone: string     // Now required
  notes?: string
  voucher_number?: string
  payment_method?: 'cash' | 'credit_card' | 'upi' | 'bank_transfer'
}

// Dashboard types
export interface DashboardStats {
  today_sales: number
  pending_approvals: number
  cash_variance: number
  overdue_credits: number
}

export interface SalesSummary {
  tender_type: string
  total_amount: number
  count: number
}

// Customer types
export interface Customer {
  id: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  address?: string
  credit_limit: number
  total_outstanding: number
  notes?: string
  origin_store_id?: string
  created_date: string
  last_transaction_date?: string
  created_at: string
  updated_at: string
}

// Sales Orders types
export interface SalesOrder {
  id: string
  store_id: string
  order_number: string
  customer_id: string
  order_date: string
  items_description: string
  total_estimated_amount: number
  advance_paid: number
  status: 'pending' | 'converted' | 'cancelled'
  erp_conversion_date?: string
  erp_sale_bill_number?: string
  notes?: string
  created_by: string
  converted_by?: string
  created_at: string
  updated_at: string
  // Nested objects from backend joins
  customers?: Customer
  stores?: {
    store_code: string
    store_name: string
  }
  deposits?: Deposit[]
}

// Deposits types
export interface Deposit {
  id: string
  store_id: string
  deposit_date: string
  deposit_type: 'sales_order' | 'other'
  reference_id?: string
  reference_type?: string
  amount: number
  payment_method: 'cash' | 'credit_card' | 'upi' | 'bank_transfer'
  customer_id?: string
  processed_by: string
  notes?: string
  created_at: string
  updated_at: string
  // Nested objects from backend joins
  customers?: Customer
  stores?: {
    store_code: string
    store_name: string
  }
  linked_sales_order?: {
    order_number: string
    total_estimated_amount: number
    items_description: string
    status: string
  }
}

// Hand Bills types
export interface HandBill {
  id: string
  store_id: string
  hand_bill_number: string
  sale_date: string
  customer_id?: string
  amount: number
  items_description?: string
  original_image_url?: string
  status: 'pending' | 'converted' | 'cancelled'
  conversion_date?: string
  erp_sale_bill_number?: string
  sale_bill_image_url?: string
  converted_by?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  // Nested objects from backend joins
  customers?: Customer
  stores?: {
    store_code: string
    store_name: string
  }
}

// Returns (RRN) types
export interface Return {
  id: string
  store_id: string
  return_date: string
  customer_id?: string
  return_amount: number
  return_reason: string
  original_bill_reference?: string
  payment_method?: 'cash' | 'credit_card' | 'upi' | 'store_credit'
  processed_by: string
  notes?: string
  created_at: string
  updated_at: string
  // Nested objects from backend joins
  customers?: Customer
  stores?: {
    store_code: string
    store_name: string
  }
}

// Enhanced form types for new entities
export interface SalesOrderFormData {
  customer_id: string
  items_description: string
  total_estimated_amount: number
  advance_paid?: number
  notes?: string
}

export interface DepositFormData {
  deposit_type: 'sales_order' | 'other'
  reference_id?: string
  reference_type?: string
  amount: number
  payment_method: 'cash' | 'credit_card' | 'upi' | 'bank_transfer'
  customer_id?: string
  notes?: string
}

export interface HandBillFormData {
  customer_id?: string
  amount: number
  items_description?: string
  original_image_url?: string
  notes?: string
  payment_method?: 'cash' | 'credit_card' | 'upi' | 'store_credit'
}

export interface ReturnFormData {
  customer_id?: string
  return_amount: number
  return_reason: string
  original_bill_reference?: string
  payment_method?: 'cash' | 'credit_card' | 'upi' | 'store_credit'
  notes?: string
}

export interface CustomerFormData {
  customer_name: string
  customer_phone?: string
  customer_email?: string
  address?: string
  credit_limit?: number
  notes?: string
  origin_store_id?: string
}