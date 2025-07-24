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
  Receipt,
  CardGiftcard,
  CheckCircle,
  Cancel,
  Refresh,
  Info
} from '@mui/icons-material'
import { format, addDays } from 'date-fns'
import { GiftVoucher, VoucherFormData } from '../types'
import { vouchersApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useStores } from '../hooks/useStores'
import VoucherForm from '../components/forms/VoucherForm'

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
      id={`voucher-tabpanel-${index}`}
      aria-labelledby={`voucher-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const Vouchers = () => {
  const [vouchers, setVouchers] = useState<GiftVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tabValue, setTabValue] = useState(0)
  
  // Create voucher state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState<VoucherFormData>({
    original_amount: 0,
    expiry_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'), // Default 30 days
    customer_name: '',     // Required field
    customer_phone: '',    // Required field
    notes: '',
    voucher_number: ''
  })
  
  // Store selection state
  const { stores, loading: storesLoading } = useStores()
  const [selectedStoreId, setSelectedStoreId] = useState('')

  // Auto-select store if only one available
  useEffect(() => {
    if (needsStoreSelection && stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id)
    }
  }, [stores, needsStoreSelection, selectedStoreId])

  // Get current store name for display
  const getCurrentStoreName = () => {
    if (needsStoreSelection) return undefined
    
    // Try nested user.stores first (from backend join)
    if (user?.stores?.store_name) {
      return user.stores.store_name
    }
    
    // Fallback: look up store name from stores array using user.store_id
    if (user?.store_id && stores.length > 0) {
      const userStore = stores.find(store => store.id === user.store_id)
      return userStore?.store_name
    }
    
    return undefined
  }
  
  // Search voucher state
  const [searchNumber, setSearchNumber] = useState('')
  const [searchResult, setSearchResult] = useState<GiftVoucher | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Redeem voucher state
  const [redeemModalOpen, setRedeemModalOpen] = useState(false)
  const [voucherToRedeem, setVoucherToRedeem] = useState<GiftVoucher | null>(null)
  const [redeemLoading, setRedeemLoading] = useState(false)

  const { user } = useAuth()
  
  // Check if user can create vouchers (everyone except accounts_incharge)
  const canCreateVouchers = user?.role !== 'accounts_incharge'
  const canCancelVouchers = user?.role === 'super_user' || user?.role === 'accounts_incharge'
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    loadVouchers()
  }, [])

  const loadVouchers = async () => {
    try {
      setLoading(true)
      setError('')
      const vouchersData = await vouchersApi.getAll()
      setVouchers(vouchersData)
    } catch (error) {
      console.error('Error loading vouchers:', error)
      setError('Failed to load vouchers')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Wrapper function for VoucherForm component
  const handleVoucherFormSubmit = async (data: VoucherFormData & { store_id?: string }) => {
    try {
      setCreateLoading(true)
      setError('')
      
      const requestData: any = {
        ...data
      }
      
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      const newVoucher = await vouchersApi.create(requestData)
      
      setSuccess('Gift voucher created successfully!')
      loadVouchers()
      setCreateModalOpen(false)
      setCreateForm({
        original_amount: 0,
        expiry_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        customer_name: '',
        customer_phone: '',
        notes: '',
        voucher_number: ''
      })
      setSelectedStoreId('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create voucher')
      throw err // Re-throw to let the form component handle it
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateVoucher = async () => {
    try {
      setCreateLoading(true)
      setError('')
      
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }

      if (!createForm.original_amount || createForm.original_amount <= 0) {
        setError('Please enter a valid amount')
        return
      }

      if (!createForm.expiry_date) {
        setError('Please enter an expiry date')
        return
      }

      if (!createForm.customer_name || createForm.customer_name.trim() === '') {
        setError('Customer name is required')
        return
      }

      if (!createForm.customer_phone || createForm.customer_phone.trim() === '') {
        setError('Customer phone is required')
        return
      }

      const requestData: any = { ...createForm }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await vouchersApi.create(requestData)
      setSuccess('Gift voucher created successfully!')
      setCreateModalOpen(false)
      setCreateForm({
        original_amount: 0,
        expiry_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        customer_name: '',     // Required field
        customer_phone: '',    // Required field
        notes: '',
        voucher_number: ''
      })
      setSelectedStoreId('')
      loadVouchers()
    } catch (error: any) {
      console.error('Error creating voucher:', error)
      setError(error.response?.data?.error || 'Failed to create voucher')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSearchVoucher = async () => {
    if (!searchNumber.trim()) return
    
    try {
      setSearchLoading(true)
      setError('')
      const voucher = await vouchersApi.search(searchNumber.trim())
      setSearchResult(voucher)
    } catch (error: any) {
      console.error('Error searching voucher:', error)
      setError(error.response?.data?.error || 'Voucher not found')
      setSearchResult(null)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleRedeemVoucher = async () => {
    if (!voucherToRedeem) return
    
    try {
      setRedeemLoading(true)
      setError('')
      
      await vouchersApi.redeem(voucherToRedeem.voucher_number)
      setSuccess(`Voucher ${voucherToRedeem.voucher_number} redeemed successfully!`)
      setRedeemModalOpen(false)
      setVoucherToRedeem(null)
      loadVouchers()
      
      // If this voucher is in search results, update it
      if (searchResult && searchResult.voucher_number === voucherToRedeem.voucher_number) {
        setSearchResult({ ...searchResult, status: 'redeemed', current_balance: 0 })
      }
    } catch (error: any) {
      console.error('Error redeeming voucher:', error)
      setError(error.response?.data?.error || 'Failed to redeem voucher')
    } finally {
      setRedeemLoading(false)
    }
  }

  const handleCancelVoucher = async (voucher: GiftVoucher) => {
    const reason = prompt('Enter cancellation reason (optional):')
    
    try {
      setError('')
      await vouchersApi.cancel(voucher.voucher_number, reason || undefined)
      setSuccess(`Voucher ${voucher.voucher_number} cancelled successfully!`)
      loadVouchers()
    } catch (error: any) {
      console.error('Error cancelling voucher:', error)
      setError(error.response?.data?.error || 'Failed to cancel voucher')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'redeemed': return 'info'
      case 'expired': return 'warning'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const filterVouchersByStatus = (status: string) => {
    return vouchers.filter(voucher => voucher.status === status)
  }

  const activeVouchers = filterVouchersByStatus('active')
  const redeemedVouchers = filterVouchersByStatus('redeemed')
  const expiredVouchers = filterVouchersByStatus('expired')
  const cancelledVouchers = filterVouchersByStatus('cancelled')

  const isVoucherExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gift Voucher Management</Typography>
        <Box display="flex" gap={2}>
          {canCreateVouchers && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateModalOpen(true)}
              size="large"
            >
              Create Voucher
            </Button>
          )}
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

      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Voucher
          </Typography>
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <TextField
              label="Voucher Number"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="Enter voucher number..."
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearchVoucher} disabled={searchLoading}>
                      <Search />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchVoucher()
                }
              }}
            />
            <Button
              variant="outlined"
              onClick={handleSearchVoucher}
              disabled={searchLoading || !searchNumber.trim()}
              startIcon={<Search />}
            >
              Search
            </Button>
          </Box>

          {searchResult && (
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" color="primary">
                      {searchResult.voucher_number}
                    </Typography>
                    <Typography color="text.secondary">
                      Customer: {searchResult.customer_name || 'N/A'}
                    </Typography>
                    <Typography color="text.secondary">
                      Phone: {searchResult.customer_phone || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6">
                      ₹{searchResult.original_amount.toLocaleString()}
                    </Typography>
                    <Typography color="text.secondary">
                      Issued: {format(new Date(searchResult.issued_date), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography color="text.secondary">
                      Expires: {searchResult.expiry_date ? format(new Date(searchResult.expiry_date), 'MMM dd, yyyy') : 'No expiry'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        label={searchResult.status.toUpperCase()}
                        color={getStatusColor(searchResult.status) as any}
                        icon={<CardGiftcard />}
                      />
                      {searchResult.status === 'active' && !isVoucherExpired(searchResult.expiry_date || '') && (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => {
                            setVoucherToRedeem(searchResult)
                            setRedeemModalOpen(true)
                          }}
                        >
                          Redeem Voucher
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Active Vouchers
              </Typography>
              <Typography variant="h4">
                {activeVouchers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value: ₹{activeVouchers.reduce((sum, v) => sum + v.current_balance, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                Redeemed
              </Typography>
              <Typography variant="h4">
                {redeemedVouchers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value: ₹{redeemedVouchers.reduce((sum, v) => sum + v.original_amount, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Expired
              </Typography>
              <Typography variant="h4">
                {expiredVouchers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lost Value: ₹{expiredVouchers.reduce((sum, v) => sum + v.current_balance, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Cancelled
              </Typography>
              <Typography variant="h4">
                {cancelledVouchers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cancelled Value: ₹{cancelledVouchers.reduce((sum, v) => sum + v.current_balance, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vouchers Table with Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Active (${activeVouchers.length})`} />
            <Tab label={`Redeemed (${redeemedVouchers.length})`} />
            <Tab label={`Expired (${expiredVouchers.length})`} />
            <Tab label={`Cancelled (${cancelledVouchers.length})`} />
          </Tabs>
        </Box>

        {/* Active Vouchers Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <VoucherTable 
              vouchers={activeVouchers} 
              loading={loading}
              canCancel={canCancelVouchers}
              onCancel={handleCancelVoucher}
              onRedeem={(voucher) => {
                setVoucherToRedeem(voucher)
                setRedeemModalOpen(true)
              }}
            />
          </CardContent>
        </TabPanel>

        {/* Redeemed Vouchers Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <VoucherTable vouchers={redeemedVouchers} loading={loading} />
          </CardContent>
        </TabPanel>

        {/* Expired Vouchers Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            <VoucherTable vouchers={expiredVouchers} loading={loading} />
          </CardContent>
        </TabPanel>

        {/* Cancelled Vouchers Tab */}
        <TabPanel value={tabValue} index={3}>
          <CardContent>
            <VoucherTable vouchers={cancelledVouchers} loading={loading} />
          </CardContent>
        </TabPanel>
      </Card>

      {/* Create Voucher Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Gift Voucher</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <VoucherForm
              initialData={createForm}
              onSubmit={handleVoucherFormSubmit}
              onCancel={() => {
                setCreateModalOpen(false)
                setSelectedStoreId('')
              }}
              loading={createLoading}
              error={error}
              storeId={needsStoreSelection ? selectedStoreId : undefined}
              showStoreSelector={needsStoreSelection}
              currentStoreName={getCurrentStoreName()}
              stores={stores}
              onStoreChange={setSelectedStoreId}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Redeem Voucher Modal */}
      <Dialog open={redeemModalOpen} onClose={() => setRedeemModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Redeem Gift Voucher</DialogTitle>
        <DialogContent>
          {voucherToRedeem && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  You are about to redeem the <strong>full amount</strong> of this voucher. 
                  This action cannot be undone.
                </Typography>
              </Alert>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Typography variant="h6">
                  Voucher: {voucherToRedeem.voucher_number}
                </Typography>
                <Typography>
                  Customer: {voucherToRedeem.customer_name || 'N/A'}
                </Typography>
                <Typography>
                  Amount: ₹{voucherToRedeem.original_amount.toLocaleString()}
                </Typography>
                <Typography>
                  Issued: {format(new Date(voucherToRedeem.issued_date), 'MMM dd, yyyy')}
                </Typography>
                <Typography>
                  Expires: {voucherToRedeem.expiry_date ? format(new Date(voucherToRedeem.expiry_date), 'MMM dd, yyyy') : 'No expiry'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedeemModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRedeemVoucher}
            variant="contained"
            color="success"
            disabled={redeemLoading}
          >
            {redeemLoading ? 'Redeeming...' : 'Redeem Full Amount'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// Voucher Table Component
interface VoucherTableProps {
  vouchers: GiftVoucher[]
  loading: boolean
  canCancel?: boolean
  onCancel?: (voucher: GiftVoucher) => void
  onRedeem?: (voucher: GiftVoucher) => void
}

const VoucherTable = ({ vouchers, loading, canCancel, onCancel, onRedeem }: VoucherTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'redeemed': return 'info'
      case 'expired': return 'warning'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const isVoucherExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  if (loading) {
    return <LinearProgress />
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Voucher Number</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Issued Date</TableCell>
            <TableCell>Expiry Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Notes</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vouchers.map((voucher) => (
            <TableRow key={voucher.id}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {voucher.voucher_number}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {voucher.customer_name || '-'}
                </Typography>
                {voucher.customer_phone && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {voucher.customer_phone}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  ₹{voucher.original_amount.toLocaleString()}
                </Typography>
                {voucher.current_balance !== voucher.original_amount && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Balance: ₹{voucher.current_balance.toLocaleString()}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(voucher.issued_date), 'MMM dd, yyyy')}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {voucher.expiry_date ? format(new Date(voucher.expiry_date), 'MMM dd, yyyy') : 'No expiry'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={voucher.status.toUpperCase()}
                  color={getStatusColor(voucher.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" style={{ maxWidth: 150, wordWrap: 'break-word' }}>
                  {voucher.notes || '-'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box display="flex" gap={0.5}>
                  {voucher.status === 'active' && !isVoucherExpired(voucher.expiry_date || '') && onRedeem && (
                    <IconButton
                      color="success"
                      size="small"
                      onClick={() => onRedeem(voucher)}
                      title="Redeem Voucher"
                    >
                      <CheckCircle />
                    </IconButton>
                  )}
                  {voucher.status === 'active' && canCancel && onCancel && (
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => onCancel(voucher)}
                      title="Cancel Voucher"
                    >
                      <Cancel />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {vouchers.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  No vouchers found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default Vouchers