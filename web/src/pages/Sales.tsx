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
import { Sale } from '../types'
import { salesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import SalesEntryModal from '../components/SalesEntryModal'
import FilterBar from '../components/FilterBar'

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([])
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
    loadSales()
  }, [viewFilter])

  const loadSales = async () => {
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
      
      const salesData = await salesApi.getAll(params)
      setSales(salesData)
    } catch (error) {
      console.error('Error loading sales:', error)
      setError('Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }

  const handleEntrySuccess = () => {
    loadSales() // Refresh the sales list
  }

  const handleApproval = async (saleId: string, status: 'approved' | 'rejected') => {
    try {
      await salesApi.approve(saleId, { approval_status: status })
      await loadSales()
    } catch (error) {
      console.error('Error updating approval:', error)
      setError('Failed to update approval status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success'
      case 'rejected': return 'error'
      default: return 'warning'
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

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEntryModalOpen(true)}
          size="large"
        >
          Add Sale Entry
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

      {/* Sales Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Sales Entries
            </Typography>
            <Chip 
              icon={<Receipt />}
              label={`${sales.length} entries`}
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
                    <TableCell>Tender Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Entered By</TableCell>
                    {canApprove && <TableCell align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                      </TableCell>
                      {needsStoreColumn && (
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
                      )}
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
                          {sale.customer_reference || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sale.approval_status.toUpperCase()}
                          color={getStatusColor(sale.approval_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {sale.entered_by_user ? 
                            `${sale.entered_by_user.first_name} ${sale.entered_by_user.last_name}` : 
                            `User ID: ${sale.entered_by.substring(0, 8)}...`
                          }
                        </Typography>
                      </TableCell>
                      {canApprove && (
                        <TableCell align="center">
                          {sale.approval_status === 'pending' && (
                            <Box display="flex" gap={0.5}>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleApproval(sale.id, 'approved')}
                                title="Approve"
                              >
                                <Check />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleApproval(sale.id, 'rejected')}
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
                  {sales.length === 0 && !loading && (
                    <TableRow>
                      <TableCell 
                        colSpan={6 + (needsStoreColumn ? 1 : 0) + (canApprove ? 1 : 0)} 
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Typography color="text.secondary">
                          {viewFilter.store_id ? 
                            `No sales entries found for ${viewFilter.store_name}` :
                            'No sales entries found for the selected period'
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Click "Add Sale Entry" to create your first entry
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

      {/* Sales Entry Modal */}
      <SalesEntryModal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSuccess={handleEntrySuccess}
      />
    </Box>
  )
}

export default Sales