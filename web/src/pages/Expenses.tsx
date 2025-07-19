import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Paper
} from '@mui/material'
import {
  Add,
  Check,
  Close,
  Receipt
} from '@mui/icons-material'
import { format } from 'date-fns'
import { Expense, ExpenseFormData, Store } from '../types'
import { expensesApi, storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface DailyExpense {
  category: string
  description: string
  amount: number
  voucher_number: string
  expense_owner: string
  payment_method: string
}

const EXPENSE_CATEGORIES = [
  { value: 'staff_welfare', label: 'Staff Welfare' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
]

const PAYMENT_METHODS = [
  { value: 'petty_cash', label: 'Petty Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' }
]

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [occasionalDialogOpen, setOccasionalDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Grid form state for daily expenses
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([
    { category: 'staff_welfare', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
    { category: 'logistics', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
    { category: 'maintenance', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
    { category: 'office_supplies', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
    { category: 'utilities', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
    { category: 'marketing', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
    { category: 'miscellaneous', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' }
  ])
  
  // Single form state for occasional expenses
  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'miscellaneous',
    description: '',
    amount: 0,
    voucher_number: '',
    expense_owner: '',
    payment_method: 'petty_cash'
  })

  const { user } = useAuth()
  
  // Check if user needs store selection
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    loadExpenses()
    if (needsStoreSelection) {
      loadStores()
    }
  }, [needsStoreSelection])

  // Reload expenses when store selection changes
  useEffect(() => {
    if (needsStoreSelection && selectedStoreId) {
      loadExpenses()
    }
  }, [selectedStoreId])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const params: any = { 
        date: format(new Date(), 'yyyy-MM-dd'),
        limit: 50 
      }
      
      // Add store filter for super users/accounts if store is selected
      if (needsStoreSelection && selectedStoreId) {
        params.store_id = selectedStoreId
      }
      
      const expensesData = await expensesApi.getAll(params)
      setExpenses(expensesData)
    } catch (error) {
      console.error('Error loading expenses:', error)
      setError('Failed to load expenses data')
    } finally {
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      const storesData = await storesApi.getAll()
      setStores(storesData)
      // Auto-select first store if only one exists
      if (storesData.length === 1) {
        setSelectedStoreId(storesData[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load stores:', err)
      setError('Failed to load stores')
    }
  }

  const handleBatchSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      // Validate store selection for super users/accounts
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }
      
      // Filter out expenses with no amount or missing description
      const validExpenses = dailyExpenses.filter(expense => 
        expense.amount > 0 && expense.description.trim() !== ''
      )
      
      if (validExpenses.length === 0) {
        setError('Please enter at least one expense with amount and description')
        return
      }
      
      const requestData: any = {
        expense_date: expenseDate,
        expenses: validExpenses
      }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await expensesApi.createBatch(requestData)
      
      // Reset form
      setDailyExpenses([
        { category: 'staff_welfare', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
        { category: 'logistics', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
        { category: 'maintenance', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
        { category: 'office_supplies', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
        { category: 'utilities', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
        { category: 'marketing', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
        { category: 'miscellaneous', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' }
      ])
      
      await loadExpenses()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create expense entries')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOccasionalSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      // Validate store selection for super users/accounts
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }
      
      const requestData: any = { ...formData }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await expensesApi.create(requestData)
      
      setOccasionalDialogOpen(false)
      setFormData({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'miscellaneous',
        description: '',
        amount: 0,
        voucher_number: '',
        expense_owner: '',
        payment_method: 'petty_cash'
      })
      
      await loadExpenses()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create expense entry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproval = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      await expensesApi.approve(expenseId, { approval_status: status })
      await loadExpenses()
    } catch (error) {
      console.error('Error updating approval:', error)
    }
  }

  const updateDailyExpense = (index: number, field: keyof DailyExpense, value: string | number) => {
    const updated = [...dailyExpenses]
    updated[index] = { ...updated[index], [field]: value }
    setDailyExpenses(updated)
  }

  const getCategoryDisplay = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category)
    return cat ? cat.label : category
  }

  const getPaymentMethodDisplay = (method: string) => {
    const pm = PAYMENT_METHODS.find(p => p.value === method)
    return pm ? pm.label : method
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success'
      case 'rejected': return 'error'
      default: return 'warning'
    }
  }

  const canApprove = user?.role === 'store_manager' || user?.role === 'accounts_incharge'

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Expense Management</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Receipt />}
            onClick={() => setOccasionalDialogOpen(true)}
          >
            Add Single Expense
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Daily Expenses Grid Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Daily Expense Entry
          </Typography>
          
          <Box mb={3} display="flex" gap={2} alignItems="center">
            <TextField
              label="Expense Date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            
            {/* Store Selection for Super Users/Accounts */}
            {needsStoreSelection && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Store *</InputLabel>
                <Select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  required
                  label="Select Store *"
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.store_code} - {store.store_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Voucher #</TableCell>
                  <TableCell>Expense Owner</TableCell>
                  <TableCell>Payment Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyExpenses.map((expense, index) => (
                  <TableRow key={expense.category}>
                    <TableCell>
                      <Chip
                        label={getCategoryDisplay(expense.category)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={expense.description}
                        onChange={(e) => updateDailyExpense(index, 'description', e.target.value)}
                        size="small"
                        placeholder="Expense description"
                        sx={{ width: 200 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={expense.amount || ''}
                        onChange={(e) => updateDailyExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={expense.voucher_number}
                        onChange={(e) => updateDailyExpense(index, 'voucher_number', e.target.value)}
                        size="small"
                        placeholder="Voucher #"
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={expense.expense_owner}
                        onChange={(e) => updateDailyExpense(index, 'expense_owner', e.target.value)}
                        size="small"
                        placeholder="Owner name"
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ width: 120 }}>
                        <Select
                          value={expense.payment_method}
                          onChange={(e) => updateDailyExpense(index, 'payment_method', e.target.value)}
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <MenuItem key={method.value} value={method.value}>
                              {method.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="contained"
              onClick={handleBatchSubmit}
              disabled={submitting}
              size="large"
            >
              {submitting ? 'Submitting...' : 'Submit Daily Expenses'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Expense Entries
          </Typography>
          
          {loading ? (
            <LinearProgress />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    {needsStoreSelection && <TableCell>Store</TableCell>}
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Requested By</TableCell>
                    {canApprove && <TableCell align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                      </TableCell>
                      {needsStoreSelection && (
                        <TableCell>
                          {expense.store ? `${expense.store.store_code} - ${expense.store.store_name}` : '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip 
                          label={getCategoryDisplay(expense.category)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {expense.description}
                      </TableCell>
                      <TableCell align="right">
                        ₹{expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodDisplay(expense.payment_method)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.approval_status.toUpperCase()}
                          color={getStatusColor(expense.approval_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {expense.requested_by_user ? 
                          `${expense.requested_by_user.first_name} ${expense.requested_by_user.last_name}` : 
                          `User ID: ${expense.requested_by.substring(0, 8)}...`
                        }
                      </TableCell>
                      {canApprove && (
                        <TableCell align="center">
                          {expense.approval_status === 'pending' && (
                            <Box>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleApproval(expense.id, 'approved')}
                              >
                                <Check />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleApproval(expense.id, 'rejected')}
                              >
                                <Close />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7 + (needsStoreSelection ? 1 : 0) + (canApprove ? 1 : 0)} align="center">
                        No expense entries found for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Single Expense Dialog */}
      <Dialog open={occasionalDialogOpen} onClose={() => setOccasionalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Single Expense</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Expense Date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            {/* Store Selection for Super Users/Accounts */}
            {needsStoreSelection && (
              <FormControl fullWidth>
                <InputLabel>Select Store *</InputLabel>
                <Select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  required
                  label="Select Store *"
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.store_code} - {store.store_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              required
              placeholder="What was this expense for?"
            />

            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              InputProps={{ startAdornment: '₹' }}
            />

            <TextField
              label="Voucher Number"
              value={formData.voucher_number}
              onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
              fullWidth
              placeholder="Receipt or bill number"
            />

            <TextField
              label="Expense Owner"
              value={formData.expense_owner}
              onChange={(e) => setFormData({ ...formData, expense_owner: e.target.value })}
              fullWidth
              placeholder="Who incurred this expense?"
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.payment_method}
                label="Payment Method"
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              >
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOccasionalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleOccasionalSubmit}
            variant="contained"
            disabled={submitting || !formData.description || !formData.amount}
          >
            {submitting ? 'Saving...' : 'Save Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Expenses