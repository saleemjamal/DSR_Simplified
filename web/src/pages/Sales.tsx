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
  Grid,
  Paper,
  Divider
} from '@mui/material'
import {
  Add,
  Edit,
  Check,
  Close,
  Receipt,
  CardGiftcard,
  Assignment
} from '@mui/icons-material'
import { format } from 'date-fns'
import { Sale, SalesFormData, Store } from '../types'
import { salesApi, storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface DailyTender {
  tender_type: string
  amount: number
  transaction_reference: string
  customer_reference: string
  notes: string
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [occasionalDialogOpen, setOccasionalDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Grid form state for daily tenders
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dailyTenders, setDailyTenders] = useState<DailyTender[]>([
    { tender_type: 'cash', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
    { tender_type: 'credit', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
    { tender_type: 'credit_card', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
    { tender_type: 'upi', amount: 0, transaction_reference: '', customer_reference: '', notes: '' }
  ])
  
  // Single form state for occasional tenders
  const [formData, setFormData] = useState<SalesFormData>({
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    tender_type: 'hand_bill',
    amount: 0,
    transaction_reference: '',
    customer_reference: '',
    notes: ''
  })

  const { user } = useAuth()

  // Check if user needs store selection
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    loadSales()
    if (needsStoreSelection) {
      loadStores()
    }
  }, [needsStoreSelection])

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

  const loadSales = async () => {
    try {
      setLoading(true)
      const salesData = await salesApi.getAll({ 
        date: format(new Date(), 'yyyy-MM-dd'),
        limit: 50 
      })
      setSales(salesData)
    } catch (error) {
      console.error('Error loading sales:', error)
      setError('Failed to load sales data')
    } finally {
      setLoading(false)
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
      
      // Filter out tenders with no amount
      const validTenders = dailyTenders.filter(tender => tender.amount > 0)
      
      if (validTenders.length === 0) {
        setError('Please enter at least one tender amount')
        return
      }
      
      const requestData: any = {
        sale_date: saleDate,
        tenders: validTenders
      }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await salesApi.createBatch(requestData)
      
      // Reset form
      setDailyTenders([
        { tender_type: 'cash', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
        { tender_type: 'credit', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
        { tender_type: 'credit_card', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
        { tender_type: 'upi', amount: 0, transaction_reference: '', customer_reference: '', notes: '' }
      ])
      
      await loadSales()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sales entries')
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
      
      await salesApi.create(requestData)
      
      setOccasionalDialogOpen(false)
      setFormData({
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        tender_type: 'hand_bill',
        amount: 0,
        transaction_reference: '',
        customer_reference: '',
        notes: ''
      })
      
      await loadSales()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sales entry')
    } finally {
      setSubmitting(false)
    }
  }
  
  const updateDailyTender = (index: number, field: keyof DailyTender, value: string | number) => {
    const updated = [...dailyTenders]
    updated[index] = { ...updated[index], [field]: value }
    setDailyTenders(updated)
  }

  const handleApproval = async (saleId: string, status: 'approved' | 'rejected') => {
    try {
      await salesApi.approve(saleId, { approval_status: status })
      await loadSales()
    } catch (error) {
      console.error('Error updating approval:', error)
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

  const canApprove = user?.role === 'store_manager' || user?.role === 'accounts_incharge'

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Management</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Receipt />}
            onClick={() => setOccasionalDialogOpen(true)}
          >
            Occasional Tenders
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Daily Tenders Grid Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Daily Sales Entry
          </Typography>
          
          <Box mb={3} display="flex" gap={2} alignItems="center">
            <TextField
              label="Sale Date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
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
            )}
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tender Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Transaction Reference</TableCell>
                  <TableCell>Customer Reference</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyTenders.map((tender, index) => (
                  <TableRow key={tender.tender_type}>
                    <TableCell>
                      <Chip
                        label={getTenderTypeDisplay(tender.tender_type)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={tender.amount || ''}
                        onChange={(e) => updateDailyTender(index, 'amount', parseFloat(e.target.value) || 0)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={tender.transaction_reference}
                        onChange={(e) => updateDailyTender(index, 'transaction_reference', e.target.value)}
                        size="small"
                        placeholder="Bill #, UPI ref"
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={tender.customer_reference}
                        onChange={(e) => updateDailyTender(index, 'customer_reference', e.target.value)}
                        size="small"
                        placeholder="Customer name"
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={tender.notes}
                        onChange={(e) => updateDailyTender(index, 'notes', e.target.value)}
                        size="small"
                        placeholder="Notes"
                        sx={{ width: 150 }}
                      />
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
              {submitting ? 'Submitting...' : 'Submit Daily Sales'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Sales Entries
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
                    <TableCell>Tender Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Reference</TableCell>
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
                      {needsStoreSelection && (
                        <TableCell>
                          {sale.store ? `${sale.store.store_code} - ${sale.store.store_name}` : '-'}
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
                        ₹{sale.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {sale.transaction_reference || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sale.approval_status.toUpperCase()}
                          color={getStatusColor(sale.approval_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {sale.entered_by_user ? 
                          `${sale.entered_by_user.first_name} ${sale.entered_by_user.last_name}` : 
                          `User ID: ${sale.entered_by.substring(0, 8)}...`
                        }
                      </TableCell>
                      {canApprove && (
                        <TableCell align="center">
                          {sale.approval_status === 'pending' && (
                            <Box>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleApproval(sale.id, 'approved')}
                              >
                                <Check />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleApproval(sale.id, 'rejected')}
                              >
                                <Close />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6 + (needsStoreSelection ? 1 : 0) + (canApprove ? 1 : 0)} align="center">
                        No sales entries found for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Occasional Tenders Dialog */}
      <Dialog open={occasionalDialogOpen} onClose={() => setOccasionalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Occasional Tender Entry</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Sale Date"
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
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
            )}

            <FormControl fullWidth>
              <InputLabel>Tender Type</InputLabel>
              <Select
                value={formData.tender_type}
                label="Tender Type"
                onChange={(e) => setFormData({ ...formData, tender_type: e.target.value as any })}
              >
                <MenuItem value="hand_bill">Hand Bill</MenuItem>
                <MenuItem value="rrn">RRN (Return)</MenuItem>
                <MenuItem value="gift_voucher">Gift Voucher</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              InputProps={{ startAdornment: '₹' }}
            />

            <TextField
              label="Transaction Reference"
              value={formData.transaction_reference}
              onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              fullWidth
              placeholder="Bill number, voucher number, etc."
            />

            <TextField
              label="Customer Reference"
              value={formData.customer_reference}
              onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
              fullWidth
              placeholder="Customer name or ID"
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Additional notes"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOccasionalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleOccasionalSubmit}
            variant="contained"
            disabled={submitting || !formData.amount}
          >
            {submitting ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Sales