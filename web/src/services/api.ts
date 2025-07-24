import axios from 'axios'
import { 
  User, 
  Store, 
  Sale, 
  Expense, 
  GiftVoucher, 
  DamageReport,
  AuthResponse,
  LoginCredentials,
  SalesFormData,
  ExpenseFormData,
  VoucherFormData,
  ApiResponse,
  Customer,
  CustomerFormData,
  SalesOrder,
  SalesOrderFormData,
  Deposit,
  DepositFormData,
  HandBill,
  HandBillFormData,
  Return,
  ReturnFormData
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  loginLocal: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/local', credentials)
    return response.data
  },

  loginGoogle: async (token: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/google', { token })
    return response.data
  },

  createUser: async (userData: {
    role: string
    email: string
    password?: string
    first_name: string
    last_name: string
  }): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/auth/users', userData)
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/profile')
    return response.data
  },

  updatePreferences: async (preferences: Record<string, any>): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>('/auth/profile/preferences', { preferences })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
  },

  // User management endpoints
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/auth/users')
    return response.data
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(`/auth/users/${userId}/status`, { 
      is_active: isActive 
    })
    return response.data
  },

  resetUserPassword: async (userId: string, newPassword: string): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(`/auth/users/${userId}/password`, { 
      new_password: newPassword 
    })
    return response.data
  },

  updateUser: async (userId: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(`/auth/users/${userId}`, userData)
    return response.data
  },

  syncStoreAssignments: async (): Promise<{
    message: string
    results: Array<{
      store_code: string
      manager_id: string
      manager_name?: string
      status: 'synced' | 'failed'
      error?: string
    }>
    total_stores: number
    total_synced: number
  }> => {
    const response = await api.post('/auth/sync-store-assignments')
    return response.data
  },

  debug: async (): Promise<any> => {
    const response = await api.get('/auth/debug')
    return response.data
  }
}

// Stores API
export const storesApi = {
  getAll: async (): Promise<Store[]> => {
    const response = await api.get<Store[]>('/stores')
    return response.data
  },

  create: async (storeData: {
    store_code: string
    store_name: string
    address?: string
    phone?: string
    manager_id?: string
    petty_cash_limit?: number
    timezone?: string
    daily_deadline_time?: string
  }): Promise<ApiResponse<Store>> => {
    const response = await api.post<ApiResponse<Store>>('/stores', storeData)
    return response.data
  },

  getCurrent: async (): Promise<Store> => {
    const response = await api.get<Store>('/stores/current')
    return response.data
  },

  getById: async (storeId: string): Promise<Store> => {
    const response = await api.get<Store>(`/stores/${storeId}`)
    return response.data
  },

  update: async (storeId: string, storeData: Partial<Store>): Promise<ApiResponse<Store>> => {
    const response = await api.patch<ApiResponse<Store>>(`/stores/${storeId}`, storeData)
    return response.data
  },

  updateConfig: async (storeId: string, configuration: Record<string, any>): Promise<ApiResponse<Store>> => {
    const response = await api.patch<ApiResponse<Store>>(`/stores/${storeId}/config`, { configuration })
    return response.data
  },

  getDropdown: async (): Promise<{ id: string; store_code: string; store_name: string }[]> => {
    const response = await api.get('/stores/dropdown')
    return response.data
  }
}

// Sales API
export const salesApi = {
  getAll: async (params?: {
    date?: string
    tender_type?: string
    store_id?: string
    page?: number
    limit?: number
  }): Promise<Sale[]> => {
    const response = await api.get<Sale[]>('/sales', { params })
    return response.data
  },

  create: async (saleData: SalesFormData & { store_id?: string }): Promise<ApiResponse<Sale>> => {
    const response = await api.post<ApiResponse<Sale>>('/sales', saleData)
    return response.data
  },

  createBatch: async (batchData: {
    sale_date: string
    store_id?: string
    tenders: Array<{
      tender_type: string
      amount: number
      transaction_reference?: string
      customer_reference?: string
      notes?: string
    }>
  }): Promise<ApiResponse<Sale[]>> => {
    const response = await api.post<ApiResponse<Sale[]>>('/sales/batch', batchData)
    return response.data
  },

  update: async (saleId: string, saleData: Partial<SalesFormData>): Promise<ApiResponse<Sale>> => {
    const response = await api.patch<ApiResponse<Sale>>(`/sales/${saleId}`, saleData)
    return response.data
  },

  approve: async (saleId: string, approval: {
    approval_status: 'approved' | 'rejected'
    approval_notes?: string
  }): Promise<ApiResponse<Sale>> => {
    const response = await api.patch<ApiResponse<Sale>>(`/sales/${saleId}/approval`, approval)
    return response.data
  },

  convertHandBill: async (saleId: string, systemReference: string): Promise<ApiResponse<Sale>> => {
    const response = await api.patch<ApiResponse<Sale>>(`/sales/${saleId}/convert-handbill`, {
      system_transaction_reference: systemReference
    })
    return response.data
  },

  getSummary: async (date?: string): Promise<{ tender_type: string; total_amount: number; count: number }[]> => {
    const response = await api.get('/sales/summary', { params: { date } })
    return response.data
  }
}

// Expenses API
export const expensesApi = {
  getAll: async (params?: {
    date?: string
    category?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<Expense[]> => {
    const response = await api.get<Expense[]>('/expenses', { params })
    return response.data
  },

  create: async (expenseData: ExpenseFormData): Promise<ApiResponse<Expense>> => {
    const response = await api.post<ApiResponse<Expense>>('/expenses', expenseData)
    return response.data
  },

  createBatch: async (batchData: {
    expense_date: string
    expenses: Array<{
      category: string
      description: string
      amount: number
      voucher_number?: string
      expense_owner?: string
      payment_method?: string
    }>
  }): Promise<ApiResponse<Expense[]>> => {
    const response = await api.post<ApiResponse<Expense[]>>('/expenses/batch', batchData)
    return response.data
  },

  approve: async (expenseId: string, approval: {
    approval_status: 'approved' | 'rejected'
    approval_notes?: string
  }): Promise<ApiResponse<Expense>> => {
    const response = await api.patch<ApiResponse<Expense>>(`/expenses/${expenseId}/approval`, approval)
    return response.data
  }
}

// Gift Vouchers API
export const vouchersApi = {
  getAll: async (params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<GiftVoucher[]> => {
    const response = await api.get<GiftVoucher[]>('/vouchers', { params })
    return response.data
  },

  create: async (voucherData: VoucherFormData): Promise<ApiResponse<GiftVoucher>> => {
    const response = await api.post<ApiResponse<GiftVoucher>>('/vouchers', voucherData)
    return response.data
  },

  search: async (voucherNumber: string): Promise<GiftVoucher> => {
    const response = await api.get<GiftVoucher>(`/vouchers/search/${voucherNumber}`)
    return response.data
  },
  
  redeem: async (voucherNumber: string, redeemed_by_user_id?: string): Promise<ApiResponse<GiftVoucher>> => {
    const response = await api.patch<ApiResponse<GiftVoucher>>(`/vouchers/${voucherNumber}/redeem`, { redeemed_by_user_id })
    return response.data
  },
  
  cancel: async (voucherNumber: string, reason?: string): Promise<ApiResponse<GiftVoucher>> => {
    const response = await api.patch<ApiResponse<GiftVoucher>>(`/vouchers/${voucherNumber}/cancel`, { reason })
    return response.data
  },
  
  updateExpired: async (): Promise<{ message: string; expired_count: number }> => {
    const response = await api.post<{ message: string; expired_count: number }>('/vouchers/update-expired')
    return response.data
  }
}

// Damage Reports API
export const damageApi = {
  getAll: async (): Promise<DamageReport[]> => {
    const response = await api.get<DamageReport[]>('/damage')
    return response.data
  },

  create: async (damageData: {
    supplier_name: string
    item_name: string
    quantity: number
    damage_category?: string
    [key: string]: any
  }): Promise<ApiResponse<DamageReport>> => {
    const response = await api.post<ApiResponse<DamageReport>>('/damage', damageData)
    return response.data
  }
}

// Dashboard API (consolidated endpoint for better performance)
export const dashboardApi = {
  getData: async (params?: {
    date?: string
    dateFrom?: string
    dateTo?: string
    store_id?: string
  }): Promise<{
    salesSummary: { tender_type: string; total_amount: number; count: number }[]
    dashboardStats: {
      todayTotal: number
      pendingApprovals: number
      cashVariance: number
      overdueCredits: number
    }
  }> => {
    const response = await api.get('/dashboard', { params })
    return response.data
  }
}

// Reports API
export const reportsApi = {
  getDailySales: async (date?: string): Promise<{
    date: string
    summary: Record<string, { total: number; count: number; approved: number; pending: number }>
  }> => {
    const response = await api.get('/reports/daily-sales', { params: { date } })
    return response.data
  },

  getCashReconciliation: async (date?: string): Promise<{
    date: string
    reconciliation: {
      opening_cash: number
      total_cash_sales: number
      total_expenses: number
      expected_closing: number
      petty_cash_balance: number
    }
  }> => {
    const response = await api.get('/reports/cash-reconciliation', { params: { date } })
    return response.data
  }
}

// Admin API
export const adminApi = {
  getSettings: async (module?: string): Promise<any[]> => {
    const response = await api.get('/admin/settings', { params: { module_name: module } })
    return response.data
  },

  updateSetting: async (settingId: string, value: string): Promise<ApiResponse<any>> => {
    const response = await api.patch<ApiResponse<any>>(`/admin/settings/${settingId}`, { setting_value: value })
    return response.data
  },

  getAuditLogs: async (params?: {
    table_name?: string
    action_type?: string
    page?: number
    limit?: number
  }): Promise<any[]> => {
    const response = await api.get('/admin/audit-logs', { params })
    return response.data
  }
}

// Customers API
export const customersApi = {
  getAll: async (params?: {
    search?: string
    page?: number
    limit?: number
  }): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/customers', { params })
    return response.data
  },

  getById: async (customerId: string): Promise<Customer> => {
    const response = await api.get<Customer>(`/customers/${customerId}`)
    return response.data
  },

  create: async (customerData: CustomerFormData): Promise<ApiResponse<Customer>> => {
    const response = await api.post<ApiResponse<Customer>>('/customers', customerData)
    return response.data
  },

  update: async (customerId: string, customerData: Partial<CustomerFormData>): Promise<ApiResponse<Customer>> => {
    const response = await api.patch<ApiResponse<Customer>>(`/customers/${customerId}`, customerData)
    return response.data
  },

  searchByPhone: async (phone: string): Promise<Customer> => {
    const response = await api.get<Customer>(`/customers/search/phone/${phone}`)
    return response.data
  },

  getTransactions: async (customerId: string, limit?: number): Promise<{
    sales: any[]
    orders: any[]
    deposits: any[]
  }> => {
    const response = await api.get(`/customers/${customerId}/transactions`, { 
      params: { limit } 
    })
    return response.data
  }
}

// Sales Orders API
export const salesOrdersApi = {
  getAll: async (params?: {
    status?: string
    customer_id?: string
    start_date?: string
    end_date?: string
    page?: number
    limit?: number
    store_id?: string
  }): Promise<SalesOrder[]> => {
    const response = await api.get<SalesOrder[]>('/sales-orders', { params })
    return response.data
  },

  getById: async (orderId: string): Promise<SalesOrder> => {
    const response = await api.get<SalesOrder>(`/sales-orders/${orderId}`)
    return response.data
  },

  create: async (orderData: SalesOrderFormData & { store_id?: string }): Promise<ApiResponse<SalesOrder>> => {
    const response = await api.post<ApiResponse<SalesOrder>>('/sales-orders', orderData)
    return response.data
  },

  update: async (orderId: string, orderData: Partial<SalesOrderFormData>): Promise<ApiResponse<SalesOrder>> => {
    const response = await api.patch<ApiResponse<SalesOrder>>(`/sales-orders/${orderId}`, orderData)
    return response.data
  },

  convert: async (orderId: string, data: {
    erp_sale_bill_number: string
    notes?: string
  }): Promise<ApiResponse<SalesOrder>> => {
    const response = await api.patch<ApiResponse<SalesOrder>>(`/sales-orders/${orderId}/convert`, data)
    return response.data
  },

  cancel: async (orderId: string, reason?: string): Promise<ApiResponse<SalesOrder>> => {
    const response = await api.patch<ApiResponse<SalesOrder>>(`/sales-orders/${orderId}/cancel`, { reason })
    return response.data
  },

  getSummary: async (params?: {
    start_date?: string
    end_date?: string
    store_id?: string
  }): Promise<any> => {
    const response = await api.get('/sales-orders/stats/summary', { params })
    return response.data
  }
}

// Deposits API
export const depositsApi = {
  getAll: async (params?: {
    deposit_type?: string
    customer_id?: string
    start_date?: string
    end_date?: string
    payment_method?: string
    page?: number
    limit?: number
    store_id?: string
  }): Promise<Deposit[]> => {
    const response = await api.get<Deposit[]>('/deposits', { params })
    return response.data
  },

  getById: async (depositId: string): Promise<Deposit> => {
    const response = await api.get<Deposit>(`/deposits/${depositId}`)
    return response.data
  },

  create: async (depositData: DepositFormData & { store_id?: string }): Promise<ApiResponse<Deposit>> => {
    const response = await api.post<ApiResponse<Deposit>>('/deposits', depositData)
    return response.data
  },

  update: async (depositId: string, depositData: Partial<DepositFormData>): Promise<ApiResponse<Deposit>> => {
    const response = await api.patch<ApiResponse<Deposit>>(`/deposits/${depositId}`, depositData)
    return response.data
  },

  delete: async (depositId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/deposits/${depositId}`)
    return response.data
  },

  getSummary: async (params?: {
    start_date?: string
    end_date?: string
    store_id?: string
  }): Promise<any> => {
    const response = await api.get('/deposits/stats/summary', { params })
    return response.data
  }
}

// Hand Bills API
export const handBillsApi = {
  getAll: async (params?: {
    status?: string
    customer_id?: string
    start_date?: string
    end_date?: string
    page?: number
    limit?: number
    store_id?: string
  }): Promise<HandBill[]> => {
    const response = await api.get<HandBill[]>('/hand-bills', { params })
    return response.data
  },

  getById: async (handBillId: string): Promise<HandBill> => {
    const response = await api.get<HandBill>(`/hand-bills/${handBillId}`)
    return response.data
  },

  create: async (handBillData: HandBillFormData & { store_id?: string; customer_id?: string }): Promise<ApiResponse<HandBill>> => {
    const response = await api.post<ApiResponse<HandBill>>('/hand-bills', handBillData)
    return response.data
  },

  update: async (handBillId: string, handBillData: Partial<HandBillFormData>): Promise<ApiResponse<HandBill>> => {
    const response = await api.patch<ApiResponse<HandBill>>(`/hand-bills/${handBillId}`, handBillData)
    return response.data
  },

  convert: async (handBillId: string, data: {
    erp_sale_bill_number: string
    sale_bill_image_url?: string
    notes?: string
  }): Promise<ApiResponse<HandBill>> => {
    const response = await api.patch<ApiResponse<HandBill>>(`/hand-bills/${handBillId}/convert`, data)
    return response.data
  },

  cancel: async (handBillId: string, reason?: string): Promise<ApiResponse<HandBill>> => {
    const response = await api.patch<ApiResponse<HandBill>>(`/hand-bills/${handBillId}/cancel`, { reason })
    return response.data
  },

  uploadImage: async (handBillId: string, data: {
    image_url: string
    image_type: 'original' | 'sale_bill'
  }): Promise<ApiResponse<HandBill>> => {
    const response = await api.post<ApiResponse<HandBill>>(`/hand-bills/${handBillId}/upload-image`, data)
    return response.data
  },

  getSummary: async (params?: {
    start_date?: string
    end_date?: string
    store_id?: string
  }): Promise<any> => {
    const response = await api.get('/hand-bills/stats/summary', { params })
    return response.data
  }
}

// Returns API
export const returnsApi = {
  getAll: async (params?: {
    customer_id?: string
    start_date?: string
    end_date?: string
    payment_method?: string
    page?: number
    limit?: number
    store_id?: string
  }): Promise<Return[]> => {
    const response = await api.get<Return[]>('/returns', { params })
    return response.data
  },

  getById: async (returnId: string): Promise<Return> => {
    const response = await api.get<Return>(`/returns/${returnId}`)
    return response.data
  },

  create: async (returnData: ReturnFormData & { store_id?: string; customer_id?: string }): Promise<ApiResponse<Return>> => {
    const response = await api.post<ApiResponse<Return>>('/returns', returnData)
    return response.data
  },

  update: async (returnId: string, returnData: Partial<ReturnFormData>): Promise<ApiResponse<Return>> => {
    const response = await api.patch<ApiResponse<Return>>(`/returns/${returnId}`, returnData)
    return response.data
  },

  delete: async (returnId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/returns/${returnId}`)
    return response.data
  },

  searchByBill: async (billRef: string): Promise<Return[]> => {
    const response = await api.get<Return[]>(`/returns/search/bill/${billRef}`)
    return response.data
  },

  getSummary: async (params?: {
    start_date?: string
    end_date?: string
    store_id?: string
  }): Promise<any> => {
    const response = await api.get('/returns/stats/summary', { params })
    return response.data
  },

  getDailyReport: async (params?: {
    date?: string
    store_id?: string
  }): Promise<any> => {
    const response = await api.get('/returns/daily-report', { params })
    return response.data
  }
}

export default api