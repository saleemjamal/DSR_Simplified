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
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Grid,
  Divider
} from '@mui/material'
import {
  Add,
  Search,
  ShoppingCart,
  CheckCircle,
  Cancel,
  Refresh,
  Info,
  Edit,
  History,
  TrendingUp
} from '@mui/icons-material'
import { format, differenceInDays } from 'date-fns'
import { SalesOrder, Customer, Store, SalesOrderFormData } from '../types'
import { salesOrdersApi, storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import CustomerSelector from '../components/CustomerSelector'
import SalesOrderForm from '../components/forms/SalesOrderForm'

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
      id={`orders-tabpanel-${index}`}
      aria-labelledby={`orders-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const SalesOrders = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tabValue, setTabValue] = useState(0)
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('')
  
  // Conversion modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [orderToConvert, setOrderToConvert] = useState<SalesOrder | null>(null)
  const [erpBillNumber, setErpBillNumber] = useState('')
  const [conversionNotes, setConversionNotes] = useState('')
  const [convertLoading, setConvertLoading] = useState(false)
  
  // Create sales order modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState<SalesOrderFormData>({
    customer_id: '',
    items_description: '',
    total_estimated_amount: 0,
    advance_paid: 0,
    notes: ''
  })
  const [selectedCreateCustomer, setSelectedCreateCustomer] = useState<Customer | null>(null)
  const [selectedCreateStoreId, setSelectedCreateStoreId] = useState('')
  
  // Store selection state
  const [stores, setStores] = useState<Store[]>([])

  const { user } = useAuth()
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    loadOrders()
  }, [statusFilter, storeFilter])
  
  useEffect(() => {
    if (needsStoreSelection) {
      loadStores()
    }
  }, [needsStoreSelection])

  useEffect(() => {
    if (needsStoreSelection && createModalOpen) {
      loadStores()
    }
  }, [needsStoreSelection, createModalOpen])

  useEffect(() => {
    if (selectedCreateCustomer) {
      setCreateForm(prev => ({ ...prev, customer_id: selectedCreateCustomer.id }))
    }
  }, [selectedCreateCustomer])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (storeFilter) params.store_id = storeFilter
      
      const ordersData = await salesOrdersApi.getAll(params)
      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
      setError('Failed to load sales orders')
    } finally {
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      const storesData = await storesApi.getAll()
      setStores(storesData)
    } catch (err: any) {
      console.error('Failed to load stores:', err)
      setError('Failed to load stores')
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleConvertOrder = async () => {
    if (!orderToConvert || !erpBillNumber.trim()) {
      setError('ERP bill number is required')
      return
    }
    
    try {
      setConvertLoading(true)
      setError('')
      
      await salesOrdersApi.convert(orderToConvert.id, {
        erp_sale_bill_number: erpBillNumber.trim(),
        notes: conversionNotes.trim() || undefined
      })
      
      setSuccess(`Order ${orderToConvert.order_number} converted successfully!`)
      setConvertModalOpen(false)
      setOrderToConvert(null)
      setErpBillNumber('')
      setConversionNotes('')
      loadOrders()
    } catch (error: any) {
      console.error('Error converting order:', error)
      setError(error.response?.data?.error || 'Failed to convert order')
    } finally {
      setConvertLoading(false)
    }
  }

  const handleCancelOrder = async (order: SalesOrder) => {
    const reason = prompt('Enter cancellation reason (optional):')
    
    try {
      setError('')
      await salesOrdersApi.cancel(order.id, reason || undefined)
      setSuccess(`Order ${order.order_number} cancelled successfully!`)
      loadOrders()
    } catch (error: any) {
      console.error('Error cancelling order:', error)
      setError(error.response?.data?.error || 'Failed to cancel order')
    }
  }

  // Wrapper function for SalesOrderForm component
  const handleSalesOrderFormSubmit = async (data: SalesOrderFormData & { store_id?: string }) => {
    try {
      setCreateLoading(true)
      setError('')
      
      const requestData: any = {
        ...data
      }
      
      if (needsStoreSelection && selectedCreateStoreId) {
        requestData.store_id = selectedCreateStoreId
      }
      
      await salesOrdersApi.create(requestData)
      
      setSuccess('Sales order created successfully!')
      await loadOrders()
      setCreateModalOpen(false)
      setCreateForm({
        customer_id: '',
        items_description: '',
        total_estimated_amount: 0,
        advance_paid: 0,
        notes: ''
      })
      setSelectedCreateStoreId('')
      setSelectedCreateCustomer(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sales order')
      throw err
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateSalesOrder = async () => {
    try {
      setCreateLoading(true)
      setError('')
      
      if (needsStoreSelection && !selectedCreateStoreId) {
        setError('Please select a store')
        return
      }

      if (!selectedCreateCustomer) {
        setError('Please select a customer')
        return
      }

      if (!createForm.items_description || createForm.items_description.trim() === '') {
        setError('Please enter items description')
        return
      }

      if (!createForm.total_estimated_amount || createForm.total_estimated_amount <= 0) {
        setError('Please enter a valid estimated amount')
        return
      }

      if (createForm.advance_paid && createForm.advance_paid > createForm.total_estimated_amount) {
        setError('Advance payment cannot exceed total estimated amount')
        return
      }

      const requestData: any = {
        ...createForm,
        customer_id: selectedCreateCustomer.id
      }
      
      if (needsStoreSelection && selectedCreateStoreId) {
        requestData.store_id = selectedCreateStoreId
      }

      await salesOrdersApi.create(requestData)
      
      setSuccess('Sales Order created successfully!')
      setCreateModalOpen(false)
      resetCreateForm()
      loadOrders()
    } catch (error: any) {
      console.error('Error creating sales order:', error)
      setError(error.response?.data?.error || 'Failed to create sales order')
    } finally {
      setCreateLoading(false)
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      customer_id: '',
      items_description: '',
      total_estimated_amount: 0,
      advance_paid: 0,
      notes: ''
    })
    setSelectedCreateCustomer(null)
    setSelectedCreateStoreId('')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'converted': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getOrderAge = (orderDate: string) => {
    return differenceInDays(new Date(), new Date(orderDate))
  }

  const isOrderOverdue = (orderDate: string) => {
    return getOrderAge(orderDate) > 7 // Consider orders over 7 days as overdue
  }

  const filterOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status)
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items_description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const pendingOrders = filterOrdersByStatus('pending')
  const convertedOrders = filterOrdersByStatus('converted')
  const cancelledOrders = filterOrdersByStatus('cancelled')
  const overdueOrders = pendingOrders.filter(order => isOrderOverdue(order.order_date))

  // Calculate summary statistics
  const totalPendingValue = pendingOrders.reduce((sum, order) => sum + order.total_estimated_amount, 0)
  const totalAdvancesReceived = pendingOrders.reduce((sum, order) => sum + order.advance_paid, 0)
  const averageOrderValue = pendingOrders.length > 0 ? totalPendingValue / pendingOrders.length : 0

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Orders Management</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateModalOpen(true)}
            size="large"
          >
            Create Sales Order
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Pending Orders
              </Typography>
              <Typography variant="h4">
                {pendingOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value: ₹{totalPendingValue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Converted Orders
              </Typography>
              <Typography variant="h4">
                {convertedOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                Advances Received
              </Typography>
              <Typography variant="h4">
                ₹{totalAdvancesReceived.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Overdue Orders
              </Typography>
              <Typography variant="h4">
                {overdueOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Over 7 Days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label="Search Orders"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order number, customer, items..."
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="converted">Converted</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {needsStoreSelection && (
              <Grid item xs={12} md={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Store</InputLabel>
                  <Select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    label="Store"
                  >
                    <MenuItem value="">All Stores</MenuItem>
                    {stores.map((store) => (
                      <MenuItem key={store.id} value={store.id}>
                        {store.store_code} - {store.store_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Table with Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Pending (${pendingOrders.length})`} />
            <Tab label={`Converted (${convertedOrders.length})`} />
            <Tab label={`Cancelled (${cancelledOrders.length})`} />
          </Tabs>
        </Box>

        {/* Pending Orders Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <OrdersTable 
              orders={filteredOrders.filter(order => order.status === 'pending')} 
              loading={loading}
              onConvert={(order) => {
                setOrderToConvert(order)
                setConvertModalOpen(true)
              }}
              onCancel={handleCancelOrder}
              showActions={true}
            />
          </CardContent>
        </TabPanel>

        {/* Converted Orders Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <OrdersTable 
              orders={filteredOrders.filter(order => order.status === 'converted')} 
              loading={loading}
            />
          </CardContent>
        </TabPanel>

        {/* Cancelled Orders Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            <OrdersTable 
              orders={filteredOrders.filter(order => order.status === 'cancelled')} 
              loading={loading}
            />
          </CardContent>
        </TabPanel>
      </Card>

      {/* Convert Order Modal */}
      <Dialog open={convertModalOpen} onClose={() => setConvertModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert Sales Order to ERP</DialogTitle>
        <DialogContent>
          {orderToConvert && (
            <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  Converting order <strong>{orderToConvert.order_number}</strong> to ERP system.
                  This action cannot be undone.
                </Typography>
              </Alert>
              
              <Typography variant="h6">
                Customer: {orderToConvert.customers?.customer_name}
              </Typography>
              <Typography>
                Items: {orderToConvert.items_description}
              </Typography>
              <Typography>
                Amount: ₹{orderToConvert.total_estimated_amount.toLocaleString()}
              </Typography>
              <Typography>
                Advance Paid: ₹{orderToConvert.advance_paid.toLocaleString()}
              </Typography>
              
              <Divider />
              
              <TextField
                label="ERP Sale Bill Number *"
                value={erpBillNumber}
                onChange={(e) => setErpBillNumber(e.target.value)}
                required
                placeholder="Enter ERP bill number"
              />
              
              <TextField
                label="Conversion Notes"
                value={conversionNotes}
                onChange={(e) => setConversionNotes(e.target.value)}
                multiline
                rows={3}
                placeholder="Additional notes about the conversion"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConvertOrder}
            variant="contained"
            color="success"
            disabled={convertLoading || !erpBillNumber.trim()}
          >
            {convertLoading ? 'Converting...' : 'Convert to ERP'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Sales Order Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Sales Order</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <SalesOrderForm
              initialData={createForm}
              onSubmit={handleSalesOrderFormSubmit}
              onCancel={() => {
                setCreateModalOpen(false)
                setSelectedCreateStoreId('')
                setSelectedCreateCustomer(null)
              }}
              loading={createLoading}
              error={error}
              storeId={needsStoreSelection ? selectedCreateStoreId : undefined}
              showStoreSelector={needsStoreSelection}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

// Orders Table Component
interface OrdersTableProps {
  orders: SalesOrder[]
  loading: boolean
  onConvert?: (order: SalesOrder) => void
  onCancel?: (order: SalesOrder) => void
  showActions?: boolean
}

const OrdersTable = ({ orders, loading, onConvert, onCancel, showActions = false }: OrdersTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'converted': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getOrderAge = (orderDate: string) => {
    return differenceInDays(new Date(), new Date(orderDate))
  }

  const isOrderOverdue = (orderDate: string) => {
    return getOrderAge(orderDate) > 7
  }

  if (loading) {
    return <LinearProgress />
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order Number</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Items</TableCell>
            <TableCell align="right">Estimated Amount</TableCell>
            <TableCell align="right">Advance Paid</TableCell>
            <TableCell>Order Date</TableCell>
            <TableCell>Status</TableCell>
            {showActions && <TableCell align="center">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} sx={{ 
              backgroundColor: isOrderOverdue(order.order_date) && order.status === 'pending' 
                ? 'rgba(255, 193, 7, 0.1)' 
                : 'inherit' 
            }}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {order.order_number}
                </Typography>
                {isOrderOverdue(order.order_date) && order.status === 'pending' && (
                  <Typography variant="caption" color="warning.main" display="block">
                    {getOrderAge(order.order_date)} days old
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {order.customers?.customer_name || 'N/A'}
                </Typography>
                {order.customers?.customer_phone && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {order.customers.customer_phone}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" style={{ maxWidth: 200, wordWrap: 'break-word' }}>
                  {order.items_description}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  ₹{order.total_estimated_amount.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={order.advance_paid > 0 ? 'success.main' : 'text.secondary'}>
                  ₹{order.advance_paid.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(order.order_date), 'MMM dd, yyyy')}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={order.status.toUpperCase()}
                  color={getStatusColor(order.status) as any}
                  size="small"
                />
                {order.erp_sale_bill_number && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    ERP: {order.erp_sale_bill_number}
                  </Typography>
                )}
              </TableCell>
              {showActions && (
                <TableCell align="center">
                  <Box display="flex" gap={0.5}>
                    {order.status === 'pending' && onConvert && (
                      <IconButton
                        color="success"
                        size="small"
                        onClick={() => onConvert(order)}
                        title="Convert to ERP"
                      >
                        <CheckCircle />
                      </IconButton>
                    )}
                    {order.status === 'pending' && onCancel && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onCancel(order)}
                        title="Cancel Order"
                      >
                        <Cancel />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 8 : 7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  No orders found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default SalesOrders