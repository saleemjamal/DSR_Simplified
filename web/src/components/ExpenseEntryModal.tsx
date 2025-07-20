import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  Alert,
  Typography
} from '@mui/material'
import { format } from 'date-fns'
import { ExpenseFormData, Store } from '../types'
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

interface ExpenseEntryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const ExpenseEntryModal = ({ open, onClose, onSuccess }: ExpenseEntryModalProps) => {
  const [tabValue, setTabValue] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Daily entry state
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
  
  // Single entry state
  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'miscellaneous',
    description: '',
    amount: 0,
    voucher_number: '',
    expense_owner: ''
  })

  const { user } = useAuth()
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    if (open && needsStoreSelection) {
      loadStores()
    }
  }, [open, needsStoreSelection])

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

  const resetForm = () => {
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'))
    setDailyExpenses([
      { category: 'staff_welfare', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
      { category: 'logistics', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
      { category: 'maintenance', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
      { category: 'office_supplies', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
      { category: 'utilities', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
      { category: 'marketing', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' },
      { category: 'miscellaneous', description: '', amount: 0, voucher_number: '', expense_owner: '', payment_method: 'petty_cash' }
    ])
    setFormData({
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      category: 'miscellaneous',
      description: '',
      amount: 0,
      voucher_number: '',
      expense_owner: ''
    })
    setSelectedStoreId('')
    setError('')
    setTabValue(0)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleDailySubmit = async () => {
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
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create expense entries')
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleSingleSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      // Validate store selection for super users/accounts
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }
      
      if (!formData.description.trim()) {
        setError('Please enter a description')
        return
      }
      
      if (!formData.amount || formData.amount <= 0) {
        setError('Please enter a valid amount')
        return
      }
      
      const requestData: any = { ...formData }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await expensesApi.create(requestData)
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create expense entry')
    } finally {
      setSubmitting(false)
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Add Expense Entry</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Store Selection for Super Users/Accounts */}
        {needsStoreSelection && (
          <Box mb={3}>
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>Select Store *</InputLabel>
              <Select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                label="Select Store *"
                required
              >
                {stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.store_code} - {store.store_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Entry Type Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Daily Entry" />
            <Tab label="Single Entry" />
          </Tabs>
        </Box>

        {/* Daily Entry Tab */}
        {tabValue === 0 && (
          <Box>
            <Box mb={3}>
              <TextField
                label="Expense Date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Box>
            
            <Typography variant="subtitle1" gutterBottom>
              Enter expenses for each category:
            </Typography>
            
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
                          placeholder="Owner"
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ width: 140 }}>
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
          </Box>
        )}

        {/* Single Entry Tab */}
        {tabValue === 1 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Expense Date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Category"
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
              placeholder="Describe the expense"
            />

            <TextField
              label="Amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="Voucher Number"
              value={formData.voucher_number}
              onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
              fullWidth
              placeholder="Receipt or voucher number"
            />

            <TextField
              label="Expense Owner"
              value={formData.expense_owner}
              onChange={(e) => setFormData({ ...formData, expense_owner: e.target.value })}
              fullWidth
              placeholder="Person responsible for the expense"
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          variant="contained"
          onClick={tabValue === 0 ? handleDailySubmit : handleSingleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Save Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ExpenseEntryModal