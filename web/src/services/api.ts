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
  ApiResponse
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

  redeem: async (voucherNumber: string, amount: number): Promise<ApiResponse<GiftVoucher>> => {
    const response = await api.patch<ApiResponse<GiftVoucher>>(`/vouchers/${voucherNumber}/redeem`, { amount })
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

export default api