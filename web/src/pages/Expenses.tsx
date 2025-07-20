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
  Alert,
  LinearProgress
} from '@mui/material'
import {
  Add,
  Check,
  Close,
  Receipt
} from '@mui/icons-material'
import { format } from 'date-fns'
import { Expense } from '../types'
import { expensesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import ExpenseEntryModal from '../components/ExpenseEntryModal'
import FilterBar from '../components/FilterBar'

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
  const [loading, setLoading] = useState(true)
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [error, setError] = useState('')
  
  // Filter state for viewing transactions
  const [viewFilter, setViewFilter] = useState({
    period: 'today',
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    store_id: '',
    store_name: undefined as string | undefined
  })

  const { user } = useAuth()
  const needsStoreColumn = user?.role === 'super_user' || user?.role === 'accounts_incharge'
  const canApprove = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    loadExpenses()
  }, [viewFilter])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params: any = { 
        limit: 50 
      }
      
      // Add date filtering based on current filter state
      if (viewFilter.dateFrom && viewFilter.dateTo) {
        if (viewFilter.dateFrom === viewFilter.dateTo) {
          // Single date filter
          params.date = viewFilter.dateFrom
        } else {
          // Date range filter
          params.dateFrom = viewFilter.dateFrom
          params.dateTo = viewFilter.dateTo
        }
      }
      
      // Add store filter if selected
      if (viewFilter.store_id) {
        params.store_id = viewFilter.store_id
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

  const handleEntrySuccess = () => {
    loadExpenses() // Refresh the expenses list
  }

  const handleApproval = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      await expensesApi.approve(expenseId, { approval_status: status })
      await loadExpenses()
    } catch (error) {
      console.error('Error updating approval:', error)
      setError('Failed to update approval status')
    }
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

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Expense Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEntryModalOpen(true)}
          size="large"
        >
          Add Expense Entry
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {/* Filter Bar for Super Users/Accounts */}
      <FilterBar 
        onFilterChange={setViewFilter}
        currentFilter={viewFilter}
      />

      {/* Expenses Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Expense Entries
            </Typography>
            <Chip 
              icon={<Receipt />}
              label={`${expenses.length} entries`}
              variant="outlined"
              color="primary"
            />
          </Box>
          
          {loading ? (
            <LinearProgress />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    {needsStoreColumn && <TableCell>Store</TableCell>}
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell>Owner</TableCell>
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
                      {needsStoreColumn && (
                        <TableCell>
                          {expense.store ? (
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {expense.store.store_code}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {expense.store.store_name}
                              </Typography>
                            </Box>
                          ) : '-'}
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
                        <Typography variant="body2">
                          {expense.description}
                        </Typography>
                        {expense.voucher_number && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Voucher: {expense.voucher_number}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          ₹{expense.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getPaymentMethodDisplay(expense.payment_method)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {expense.expense_owner || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.approval_status.toUpperCase()}
                          color={getStatusColor(expense.approval_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {expense.requested_by_user ? 
                            `${expense.requested_by_user.first_name} ${expense.requested_by_user.last_name}` : 
                            `User ID: ${expense.requested_by.substring(0, 8)}...`
                          }
                        </Typography>
                      </TableCell>
                      {canApprove && (
                        <TableCell align="center">
                          {expense.approval_status === 'pending' && (
                            <Box display="flex" gap={0.5}>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleApproval(expense.id, 'approved')}
                                title="Approve"
                              >
                                <Check />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleApproval(expense.id, 'rejected')}
                                title="Reject"
                              >
                                <Close />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {expenses.length === 0 && !loading && (
                    <TableRow>
                      <TableCell 
                        colSpan={7 + (needsStoreColumn ? 1 : 0) + (canApprove ? 1 : 0)} 
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Typography color="text.secondary">
                          {viewFilter.store_id ? 
                            `No expense entries found for ${viewFilter.store_name}` :
                            'No expense entries found for the selected period'
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Click "Add Expense Entry" to create your first entry
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Expense Entry Modal */}
      <ExpenseEntryModal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSuccess={handleEntrySuccess}
      />
    </Box>
  )
}

export default Expenses