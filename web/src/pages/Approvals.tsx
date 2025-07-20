import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
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
  LinearProgress,
  Tabs,
  Tab,
  Checkbox,
  Button,
  FormControlLabel,
  Divider
} from '@mui/material'
import {
  Check,
  Close,
  Receipt,
  PointOfSale,
  CheckCircle
} from '@mui/icons-material'
import { format } from 'date-fns'
import { Sale, Expense } from '../types'
import { salesApi, expensesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import FilterBar from '../components/FilterBar'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const Approvals = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [selectedSales, setSelectedSales] = useState<string[]>([])
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  
  // Filter state for viewing transactions
  const [viewFilter, setViewFilter] = useState({
    period: 'today',
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    store_id: '',
    store_name: undefined as string | undefined
  })

  const { user } = useAuth()
  
  // Only super_user and accounts_incharge should access this page
  const canApprove = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    if (canApprove) {
      loadApprovalData()
    }
  }, [viewFilter, canApprove])

  const loadApprovalData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params: any = { 
        limit: 100,  // Higher limit for approval dashboard
        status: 'pending'  // Only load pending items
      }
      
      // Add date filtering based on current filter state
      if (viewFilter.dateFrom && viewFilter.dateTo) {
        if (viewFilter.dateFrom === viewFilter.dateTo) {
          params.date = viewFilter.dateFrom
        } else {
          params.dateFrom = viewFilter.dateFrom
          params.dateTo = viewFilter.dateTo
        }
      }
      
      // Add store filter if selected
      if (viewFilter.store_id) {
        params.store_id = viewFilter.store_id
      }
      
      // Load both sales and expenses data in parallel
      const [salesData, expensesData] = await Promise.all([
        salesApi.getAll(params),
        expensesApi.getAll(params)
      ])
      
      // Filter only pending items
      setSales(salesData.filter(sale => sale.approval_status === 'pending'))
      setExpenses(expensesData.filter(expense => expense.approval_status === 'pending'))
    } catch (error) {
      console.error('Error loading approval data:', error)
      setError('Failed to load approval data')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    // Clear selections when switching tabs
    setSelectedSales([])
    setSelectedExpenses([])
  }

  const handleSaleSelection = (saleId: string) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    )
  }

  const handleExpenseSelection = (expenseId: string) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    )
  }

  const handleSelectAllSales = () => {
    if (selectedSales.length === sales.length) {
      setSelectedSales([])
    } else {
      setSelectedSales(sales.map(sale => sale.id))
    }
  }

  const handleSelectAllExpenses = () => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([])
    } else {
      setSelectedExpenses(expenses.map(expense => expense.id))
    }
  }

  const handleSalesApproval = async (saleId: string, status: 'approved' | 'rejected') => {
    try {
      await salesApi.approve(saleId, { approval_status: status })
      await loadApprovalData()
    } catch (error) {
      console.error('Error updating sales approval:', error)
      setError('Failed to update sales approval status')
    }
  }

  const handleExpenseApproval = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      await expensesApi.approve(expenseId, { approval_status: status })
      await loadApprovalData()
    } catch (error) {
      console.error('Error updating expense approval:', error)
      setError('Failed to update expense approval status')
    }
  }

  const handleBulkSalesApproval = async (status: 'approved' | 'rejected') => {
    try {
      setLoading(true)
      await Promise.all(
        selectedSales.map(saleId => 
          salesApi.approve(saleId, { approval_status: status })
        )
      )
      setSelectedSales([])
      await loadApprovalData()
    } catch (error) {
      console.error('Error bulk approving sales:', error)
      setError('Failed to bulk approve sales')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkExpenseApproval = async (status: 'approved' | 'rejected') => {
    try {
      setLoading(true)
      await Promise.all(
        selectedExpenses.map(expenseId => 
          expensesApi.approve(expenseId, { approval_status: status })
        )
      )
      setSelectedExpenses([])
      await loadApprovalData()
    } catch (error) {
      console.error('Error bulk approving expenses:', error)
      setError('Failed to bulk approve expenses')
    } finally {
      setLoading(false)
    }
  }

  const getTenderTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      cash: 'Cash',
      credit: 'Credit',
      credit_card: 'Credit Card',
      upi: 'UPI',
      hand_bill: 'Hand Bill',
      rrn: 'RRN',
      gift_voucher: 'Gift Voucher'
    }
    return types[type] || type
  }

  const getCategoryDisplay = (category: string) => {
    const categories: Record<string, string> = {
      staff_welfare: 'Staff Welfare',
      logistics: 'Logistics',
      maintenance: 'Maintenance',
      office_supplies: 'Office Supplies',
      utilities: 'Utilities',
      marketing: 'Marketing',
      miscellaneous: 'Miscellaneous'
    }
    return categories[category] || category
  }

  // Redirect if user doesn't have approval permissions
  if (!canApprove) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="error">
          Access denied. Only Super Users and Accounts Incharge can access approvals.
        </Alert>
      </Box>
    )
  }

  const pendingSalesTotal = sales.reduce((sum, sale) => sum + sale.amount, 0)
  const pendingExpensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Approval Dashboard</Typography>
        <Box display="flex" gap={2}>
          <Chip 
            icon={<PointOfSale />}
            label={`${sales.length} Sales Pending`}
            color="warning"
            variant="outlined"
          />
          <Chip 
            icon={<Receipt />}
            label={`${expenses.length} Expenses Pending`}
            color="warning"
            variant="outlined"
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {/* Filter Bar */}
      <FilterBar 
        onFilterChange={setViewFilter}
        currentFilter={viewFilter}
      />

      {/* Summary Cards */}
      <Box display="flex" gap={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="warning.main">
              Pending Sales
            </Typography>
            <Typography variant="h4">
              ₹{pendingSalesTotal.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sales.length} entries awaiting approval
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="warning.main">
              Pending Expenses
            </Typography>
            <Typography variant="h4">
              ₹{pendingExpensesTotal.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {expenses.length} entries awaiting approval
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Sales (${sales.length})`} />
            <Tab label={`Expenses (${expenses.length})`} />
          </Tabs>
        </Box>

        {/* Sales Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            {/* Bulk Actions for Sales */}
            {sales.length > 0 && (
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedSales.length === sales.length && sales.length > 0}
                        indeterminate={selectedSales.length > 0 && selectedSales.length < sales.length}
                        onChange={handleSelectAllSales}
                      />
                    }
                    label={`Select All (${selectedSales.length} selected)`}
                  />
                </Box>
                {selectedSales.length > 0 && (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleBulkSalesApproval('approved')}
                      disabled={loading}
                    >
                      Approve Selected ({selectedSales.length})
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Close />}
                      onClick={() => handleBulkSalesApproval('rejected')}
                      disabled={loading}
                    >
                      Reject Selected ({selectedSales.length})
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {loading ? (
              <LinearProgress />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">Select</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Tender Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Entered By</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedSales.includes(sale.id)}
                            onChange={() => handleSaleSelection(sale.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {sale.store ? (
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {sale.store.store_code}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {sale.store.store_name}
                              </Typography>
                            </Box>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getTenderTypeDisplay(sale.tender_type)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            ₹{sale.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {sale.transaction_reference || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {sale.entered_by_user ? 
                              `${sale.entered_by_user.first_name} ${sale.entered_by_user.last_name}` : 
                              `User ID: ${sale.entered_by.substring(0, 8)}...`
                            }
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              color="success"
                              size="small"
                              onClick={() => handleSalesApproval(sale.id, 'approved')}
                              title="Approve"
                            >
                              <Check />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleSalesApproval(sale.id, 'rejected')}
                              title="Reject"
                            >
                              <Close />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sales.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No pending sales entries found for the selected period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </TabPanel>

        {/* Expenses Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            {/* Bulk Actions for Expenses */}
            {expenses.length > 0 && (
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                        indeterminate={selectedExpenses.length > 0 && selectedExpenses.length < expenses.length}
                        onChange={handleSelectAllExpenses}
                      />
                    }
                    label={`Select All (${selectedExpenses.length} selected)`}
                  />
                </Box>
                {selectedExpenses.length > 0 && (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleBulkExpenseApproval('approved')}
                      disabled={loading}
                    >
                      Approve Selected ({selectedExpenses.length})
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Close />}
                      onClick={() => handleBulkExpenseApproval('rejected')}
                      disabled={loading}
                    >
                      Reject Selected ({selectedExpenses.length})
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {loading ? (
              <LinearProgress />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">Select</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Requested By</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => handleExpenseSelection(expense.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
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
                            {expense.expense_owner || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {expense.requested_by_user ? 
                              `${expense.requested_by_user.first_name} ${expense.requested_by_user.last_name}` : 
                              `User ID: ${expense.requested_by.substring(0, 8)}...`
                            }
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              color="success"
                              size="small"
                              onClick={() => handleExpenseApproval(expense.id, 'approved')}
                              title="Approve"
                            >
                              <Check />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleExpenseApproval(expense.id, 'rejected')}
                              title="Reject"
                            >
                              <Close />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No pending expense entries found for the selected period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  )
}

export default Approvals