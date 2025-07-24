import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
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
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Search as SearchIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { returnsApi, storesApi } from '../services/api'
import ReturnForm from '../components/forms/ReturnForm'
import { ReturnFormData } from '../types'

interface Return {
  id: string
  return_date: string
  customer_id?: string
  return_amount: number
  return_reason: string
  original_bill_reference?: string
  payment_method: string
  processed_by: string
  notes?: string
  stores?: {
    store_code: string
    store_name: string
  }
  customers?: {
    customer_name: string
    customer_phone: string
  }
}

interface Store {
  id: string
  store_name: string
  store_code: string
}

const Returns = () => {
  const { user } = useAuth()
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    loadReturns()
    if (needsStoreSelection) {
      loadStores()
    }
  }, [])

  const loadStores = async () => {
    try {
      const storesData = await storesApi.getAll()
      setStores(storesData)
    } catch (err) {
      console.error('Failed to load stores:', err)
    }
  }

  const loadReturns = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await returnsApi.getAll({
        store_id: needsStoreSelection && selectedStoreId ? selectedStoreId : undefined
      })
      setReturns(data)
    } catch (err: any) {
      setError('Failed to load returns')
      console.error('Error loading returns:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReturn = async (formData: ReturnFormData & { store_id?: string }) => {
    try {
      setSubmitting(true)
      
      const submitData = {
        ...formData,
        store_id: needsStoreSelection && selectedStoreId ? selectedStoreId : user?.store_id
      }
      
      await returnsApi.create(submitData)
      setCreateModalOpen(false)
      loadReturns()
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create return')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewDetails = (returnItem: Return) => {
    setSelectedReturn(returnItem)
    setDetailModalOpen(true)
  }

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Cash',
      credit_card: 'Credit Card',
      upi: 'UPI',
      store_credit: 'Store Credit'
    }
    return methods[method] || method
  }

  // Filter returns based on search criteria
  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = !searchTerm || 
      returnItem.return_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.original_bill_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDate = !dateFilter || returnItem.return_date === dateFilter
    
    return matchesSearch && matchesDate
  })

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Returns Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage customer returns and RRN documentation
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadReturns}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Return
          </Button>
        </Box>
      </Box>

      {/* Store Selection for Super Users */}
      {needsStoreSelection && (
        <Box mb={3}>
          <FormControl size="small" sx={{ minWidth: 250, mr: 2 }}>
            <InputLabel>Filter by Store</InputLabel>
            <Select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                // Auto-refresh when store changes
                setTimeout(loadReturns, 100)
              }}
              label="Filter by Store"
            >
              <MenuItem value="">All Stores</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.store_code} - {store.store_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Filters */}
      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search returns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 250 }}
        />
        <TextField
          size="small"
          type="date"
          label="Filter by Date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Returns Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Bill Reference</TableCell>
                {needsStoreSelection && <TableCell>Store</TableCell>}
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={needsStoreSelection ? 8 : 7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={needsStoreSelection ? 8 : 7} align="center" sx={{ py: 4 }}>
                    {searchTerm || dateFilter ? 'No returns found matching your filters' : 'No returns found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((returnItem) => (
                  <TableRow key={returnItem.id} hover>
                    <TableCell>
                      {format(new Date(returnItem.return_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {returnItem.customers ? (
                        <Box>
                          <Typography variant="body2">
                            {returnItem.customers.customer_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {returnItem.customers.customer_phone}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No customer
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        ₹{returnItem.return_amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {returnItem.return_reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getPaymentMethodDisplay(returnItem.payment_method)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {returnItem.original_bill_reference || 'N/A'}
                      </Typography>
                    </TableCell>
                    {needsStoreSelection && (
                      <TableCell>
                        <Typography variant="body2">
                          {returnItem.stores?.store_code}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(returnItem)}
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Return Modal */}
      <Dialog 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Return</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <ReturnForm
              onSubmit={handleCreateReturn}
              onCancel={() => setCreateModalOpen(false)}
              loading={submitting}
              storeId={needsStoreSelection ? selectedStoreId : undefined}
              showStoreSelector={needsStoreSelection}
              currentStoreName={!needsStoreSelection ? (
                user?.stores?.store_name || 
                (user?.store_id && stores.length > 0 ? stores.find(s => s.id === user.store_id)?.store_name : undefined)
              ) : undefined}
              stores={stores}
              onStoreChange={setSelectedStoreId}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Return Details Modal */}
      <Dialog 
        open={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Return Details</DialogTitle>
        <DialogContent>
          {selectedReturn && (
            <Box mt={2}>
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Return Date</Typography>
                <Typography variant="body1">
                  {format(new Date(selectedReturn.return_date), 'MMMM dd, yyyy')}
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                <Typography variant="h6" color="primary">
                  ₹{selectedReturn.return_amount.toLocaleString()}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                <Typography variant="body1">
                  {selectedReturn.customers ? (
                    <>
                      {selectedReturn.customers.customer_name}
                      <br />
                      <Typography variant="body2" color="text.secondary">
                        {selectedReturn.customers.customer_phone}
                      </Typography>
                    </>
                  ) : (
                    'No customer associated'
                  )}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Return Reason</Typography>
                <Typography variant="body1">{selectedReturn.return_reason}</Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                <Chip 
                  label={getPaymentMethodDisplay(selectedReturn.payment_method)}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {selectedReturn.original_bill_reference && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">Original Bill Reference</Typography>
                  <Typography variant="body1">{selectedReturn.original_bill_reference}</Typography>
                </Box>
              )}

              {selectedReturn.notes && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">{selectedReturn.notes}</Typography>
                </Box>
              )}

              {needsStoreSelection && selectedReturn.stores && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">Store</Typography>
                  <Typography variant="body1">
                    {selectedReturn.stores.store_code} - {selectedReturn.stores.store_name}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default Returns