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
  Divider,
  Avatar
} from '@mui/material'
import {
  Add,
  Search,
  Receipt,
  CheckCircle,
  Cancel,
  Refresh,
  Info,
  Image,
  CloudUpload,
  Visibility,
  TrendingUp,
  Warning
} from '@mui/icons-material'
import { format, differenceInDays } from 'date-fns'
import { HandBill, Customer, Store, HandBillFormData } from '../types'
import { handBillsApi, storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import CustomerSelector from '../components/CustomerSelector'
import HandBillForm from '../components/forms/HandBillForm'

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
      id={`handbills-tabpanel-${index}`}
      aria-labelledby={`handbills-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const HandBills = () => {
  const [handBills, setHandBills] = useState<HandBill[]>([])
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
  const [billToConvert, setBillToConvert] = useState<HandBill | null>(null)
  const [erpBillNumber, setErpBillNumber] = useState('')
  const [saleBillImageUrl, setSaleBillImageUrl] = useState('')
  const [conversionNotes, setConversionNotes] = useState('')
  const [convertLoading, setConvertLoading] = useState(false)
  
  // Image viewer modal state
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [viewingBill, setViewingBill] = useState<HandBill | null>(null)
  
  // Create hand bill modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState<HandBillFormData>({
    amount: 0,
    items_description: '',
    original_image_url: '',
    notes: ''
  })
  const [selectedCreateCustomer, setSelectedCreateCustomer] = useState<Customer | null>(null)
  
  // Store selection state
  const [stores, setStores] = useState<Store[]>([])
  const [selectedCreateStoreId, setSelectedCreateStoreId] = useState('')

  const { user } = useAuth()
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'
  const canCreateHandBills = user?.role === 'store_manager' || user?.role === 'super_user'

  useEffect(() => {
    loadHandBills()
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

  const loadHandBills = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (storeFilter) params.store_id = storeFilter
      
      const billsData = await handBillsApi.getAll(params)
      setHandBills(billsData)
    } catch (error) {
      console.error('Error loading hand bills:', error)
      setError('Failed to load hand bills')
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

  const handleConvertBill = async () => {
    if (!billToConvert || !erpBillNumber.trim()) {
      setError('ERP bill number is required')
      return
    }
    
    try {
      setConvertLoading(true)
      setError('')
      
      await handBillsApi.convert(billToConvert.id, {
        erp_sale_bill_number: erpBillNumber.trim(),
        sale_bill_image_url: saleBillImageUrl.trim() || undefined,
        notes: conversionNotes.trim() || undefined
      })
      
      setSuccess(`Hand Bill ${billToConvert.hand_bill_number} converted successfully!`)
      setConvertModalOpen(false)
      setBillToConvert(null)
      setErpBillNumber('')
      setSaleBillImageUrl('')
      setConversionNotes('')
      loadHandBills()
    } catch (error: any) {
      console.error('Error converting hand bill:', error)
      setError(error.response?.data?.error || 'Failed to convert hand bill')
    } finally {
      setConvertLoading(false)
    }
  }

  const handleCancelBill = async (bill: HandBill) => {
    const reason = prompt('Enter cancellation reason (optional):')
    
    try {
      setError('')
      await handBillsApi.cancel(bill.id, reason || undefined)
      setSuccess(`Hand Bill ${bill.hand_bill_number} cancelled successfully!`)
      loadHandBills()
    } catch (error: any) {
      console.error('Error cancelling hand bill:', error)
      setError(error.response?.data?.error || 'Failed to cancel hand bill')
    }
  }

  // Wrapper function for HandBillForm component
  const handleHandBillFormSubmit = async (data: HandBillFormData & { store_id?: string }) => {
    try {
      setCreateLoading(true)
      setError('')
      
      const requestData: any = {
        ...data
      }
      
      if (needsStoreSelection && selectedCreateStoreId) {
        requestData.store_id = selectedCreateStoreId
      }
      
      await handBillsApi.create(requestData)
      
      setSuccess('Hand bill created successfully!')
      await loadHandBills()
      setCreateModalOpen(false)
      setCreateForm({
        amount: 0,
        items_description: '',
        notes: '',
        original_image_url: ''
      })
      setSelectedCreateStoreId('')
      setSelectedCreateCustomer(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create hand bill')
      throw err
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateHandBill = async () => {
    try {
      setCreateLoading(true)
      setError('')
      
      if (needsStoreSelection && !selectedCreateStoreId) {
        setError('Please select a store')
        return
      }

      if (!createForm.amount || createForm.amount <= 0) {
        setError('Please enter a valid amount')
        return
      }

      if (!createForm.items_description || createForm.items_description.trim() === '') {
        setError('Please enter items description')
        return
      }

      const requestData: any = {
        ...createForm,
        customer_id: selectedCreateCustomer?.id || null
      }
      
      if (needsStoreSelection && selectedCreateStoreId) {
        requestData.store_id = selectedCreateStoreId
      }

      await handBillsApi.create(requestData)
      
      setSuccess('Hand Bill created successfully!')
      setCreateModalOpen(false)
      resetCreateForm()
      loadHandBills()
    } catch (error: any) {
      console.error('Error creating hand bill:', error)
      setError(error.response?.data?.error || 'Failed to create hand bill')
    } finally {
      setCreateLoading(false)
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      amount: 0,
      items_description: '',
      original_image_url: '',
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

  const getBillAge = (saleDate: string) => {
    return differenceInDays(new Date(), new Date(saleDate))
  }

  const isBillOverdue = (saleDate: string) => {
    return getBillAge(saleDate) > 1 // Consider bills over 24 hours as overdue
  }

  const filterBillsByStatus = (status: string) => {
    return handBills.filter(bill => bill.status === status)
  }

  const filteredBills = handBills.filter(bill => {
    const matchesSearch = !searchTerm || 
      bill.hand_bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.items_description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const pendingBills = filterBillsByStatus('pending')
  const convertedBills = filterBillsByStatus('converted')
  const cancelledBills = filterBillsByStatus('cancelled')
  const overdueBills = pendingBills.filter(bill => isBillOverdue(bill.sale_date))

  // Calculate summary statistics
  const totalPendingValue = pendingBills.reduce((sum, bill) => sum + bill.amount, 0)
  const averageBillValue = pendingBills.length > 0 ? totalPendingValue / pendingBills.length : 0

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Hand Bills Management</Typography>
        <Box display="flex" gap={2}>
          {canCreateHandBills && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateModalOpen(true)}
              size="large"
            >
              Create Hand Bill
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadHandBills}
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

      {/* Manager Only Note */}
      {!canCreateHandBills && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Hand Bill creation is restricted to Store Managers and Super Users only.
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Pending Bills
              </Typography>
              <Typography variant="h4">
                {pendingBills.length}
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
                Converted Bills
              </Typography>
              <Typography variant="h4">
                {convertedBills.length}
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
                Average Bill Value
              </Typography>
              <Typography variant="h4">
                ₹{Math.round(averageBillValue).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Bills
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Overdue Bills
              </Typography>
              <Typography variant="h4">
                {overdueBills.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Over 24 Hours
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
                label="Search Hand Bills"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Bill number, customer, items..."
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

      {/* Hand Bills Table with Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Pending (${pendingBills.length})`} />
            <Tab label={`Converted (${convertedBills.length})`} />
            <Tab label={`Cancelled (${cancelledBills.length})`} />
          </Tabs>
        </Box>

        {/* Pending Bills Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <HandBillsTable 
              bills={filteredBills.filter(bill => bill.status === 'pending')} 
              loading={loading}
              onConvert={(bill) => {
                setBillToConvert(bill)
                setConvertModalOpen(true)
              }}
              onCancel={handleCancelBill}
              onViewImages={(bill) => {
                setViewingBill(bill)
                setImageViewerOpen(true)
              }}
              showActions={true}
            />
          </CardContent>
        </TabPanel>

        {/* Converted Bills Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <HandBillsTable 
              bills={filteredBills.filter(bill => bill.status === 'converted')} 
              loading={loading}
              onViewImages={(bill) => {
                setViewingBill(bill)
                setImageViewerOpen(true)
              }}
            />
          </CardContent>
        </TabPanel>

        {/* Cancelled Bills Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            <HandBillsTable 
              bills={filteredBills.filter(bill => bill.status === 'cancelled')} 
              loading={loading}
            />
          </CardContent>
        </TabPanel>
      </Card>

      {/* Convert Hand Bill Modal */}
      <Dialog open={convertModalOpen} onClose={() => setConvertModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert Hand Bill to ERP</DialogTitle>
        <DialogContent>
          {billToConvert && (
            <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  Converting hand bill <strong>{billToConvert.hand_bill_number}</strong> to ERP system.
                  This action cannot be undone.
                </Typography>
              </Alert>
              
              <Typography variant="h6">
                Customer: {billToConvert.customers?.customer_name || 'Walk-in Customer'}
              </Typography>
              <Typography>
                Items: {billToConvert.items_description}
              </Typography>
              <Typography>
                Amount: ₹{billToConvert.amount.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sale Date: {format(new Date(billToConvert.sale_date), 'MMM dd, yyyy')}
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
                label="Sale Bill Image URL"
                value={saleBillImageUrl}
                onChange={(e) => setSaleBillImageUrl(e.target.value)}
                placeholder="URL to converted sale bill image"
                helperText="Optional: Link to the ERP-generated sale bill image"
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
            onClick={handleConvertBill}
            variant="contained"
            color="success"
            disabled={convertLoading || !erpBillNumber.trim()}
          >
            {convertLoading ? 'Converting...' : 'Convert to ERP'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={imageViewerOpen} onClose={() => setImageViewerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Hand Bill Images</DialogTitle>
        <DialogContent>
          {viewingBill && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {viewingBill.hand_bill_number} - {viewingBill.customers?.customer_name || 'Walk-in Customer'}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Original Hand Bill
                      </Typography>
                      {viewingBill.original_image_url ? (
                        <Box
                          component="img"
                          src={viewingBill.original_image_url}
                          alt="Original Hand Bill"
                          sx={{
                            width: '100%',
                            height: 300,
                            objectFit: 'contain',
                            border: '1px solid #e0e0e0',
                            borderRadius: 1
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed #ccc',
                            borderRadius: 1,
                            color: 'text.secondary'
                          }}
                        >
                          <Typography>No original image available</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Converted Sale Bill
                      </Typography>
                      {viewingBill.sale_bill_image_url ? (
                        <Box
                          component="img"
                          src={viewingBill.sale_bill_image_url}
                          alt="Converted Sale Bill"
                          sx={{
                            width: '100%',
                            height: 300,
                            objectFit: 'contain',
                            border: '1px solid #e0e0e0',
                            borderRadius: 1
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed #ccc',
                            borderRadius: 1,
                            color: 'text.secondary'
                          }}
                        >
                          <Typography>
                            {viewingBill.status === 'converted' 
                              ? 'No sale bill image available' 
                              : 'Bill not yet converted'
                            }
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {viewingBill.erp_sale_bill_number && (
                <Box mt={2}>
                  <Typography variant="body2" color="success.main">
                    ERP Bill Number: {viewingBill.erp_sale_bill_number}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageViewerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Hand Bill Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Hand Bill</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <HandBillForm
              initialData={createForm}
              onSubmit={handleHandBillFormSubmit}
              onCancel={() => {
                setCreateModalOpen(false)
                setSelectedCreateStoreId('')
                setSelectedCreateCustomer(null)
              }}
              loading={createLoading}
              error={error}
              storeId={needsStoreSelection ? selectedCreateStoreId : undefined}
              showStoreSelector={needsStoreSelection}
              currentStoreName={!needsStoreSelection ? user?.stores?.store_name : undefined}
              stores={stores}
              onStoreChange={setSelectedCreateStoreId}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

// Hand Bills Table Component
interface HandBillsTableProps {
  bills: HandBill[]
  loading: boolean
  onConvert?: (bill: HandBill) => void
  onCancel?: (bill: HandBill) => void
  onViewImages?: (bill: HandBill) => void
  showActions?: boolean
}

const HandBillsTable = ({ bills, loading, onConvert, onCancel, onViewImages, showActions = false }: HandBillsTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'converted': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getBillAge = (saleDate: string) => {
    return differenceInDays(new Date(), new Date(saleDate))
  }

  const isBillOverdue = (saleDate: string) => {
    return getBillAge(saleDate) > 1
  }

  if (loading) {
    return <LinearProgress />
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Bill Number</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Items</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Sale Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Images</TableCell>
            {showActions && <TableCell align="center">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id} sx={{ 
              backgroundColor: isBillOverdue(bill.sale_date) && bill.status === 'pending' 
                ? 'rgba(255, 193, 7, 0.1)' 
                : 'inherit' 
            }}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {bill.hand_bill_number}
                </Typography>
                {isBillOverdue(bill.sale_date) && bill.status === 'pending' && (
                  <Typography variant="caption" color="warning.main" display="block">
                    {getBillAge(bill.sale_date)} days old
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {bill.customers?.customer_name || 'Walk-in Customer'}
                </Typography>
                {bill.customers?.customer_phone && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {bill.customers.customer_phone}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" style={{ maxWidth: 200, wordWrap: 'break-word' }}>
                  {bill.items_description}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  ₹{bill.amount.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(bill.sale_date), 'MMM dd, yyyy')}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={bill.status.toUpperCase()}
                  color={getStatusColor(bill.status) as any}
                  size="small"
                />
                {bill.erp_sale_bill_number && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    ERP: {bill.erp_sale_bill_number}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Box display="flex" gap={0.5} justifyContent="center">
                  {onViewImages && (
                    <IconButton
                      size="small"
                      onClick={() => onViewImages(bill)}
                      title="View Images"
                    >
                      <Visibility />
                    </IconButton>
                  )}
                  <Avatar sx={{ width: 24, height: 24, bgcolor: bill.original_image_url ? 'success.main' : 'grey.300' }}>
                    <Image sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
              </TableCell>
              {showActions && (
                <TableCell align="center">
                  <Box display="flex" gap={0.5}>
                    {bill.status === 'pending' && onConvert && (
                      <IconButton
                        color="success"
                        size="small"
                        onClick={() => onConvert(bill)}
                        title="Convert to ERP"
                      >
                        <CheckCircle />
                      </IconButton>
                    )}
                    {bill.status === 'pending' && onCancel && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onCancel(bill)}
                        title="Cancel Bill"
                      >
                        <Cancel />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
          {bills.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 8 : 7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  No hand bills found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default HandBills