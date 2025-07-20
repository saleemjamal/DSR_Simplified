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
  Typography,
  InputAdornment,
  Grid,
  Divider
} from '@mui/material'
import { 
  CardGiftcard, 
  Receipt, 
  ShoppingCart, 
  Undo,
  Upload,
  AttachMoney 
} from '@mui/icons-material'
import { format, addDays } from 'date-fns'
import { 
  SalesFormData, 
  Store, 
  Customer, 
  VoucherFormData,
  HandBillFormData,
  SalesOrderFormData,
  ReturnFormData
} from '../types'
import { salesApi, storesApi, vouchersApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import CustomerSelector from './CustomerSelector'

interface DailyTender {
  tender_type: string
  amount: number
  transaction_reference: string
  customer_reference: string
  notes: string
}

interface SalesEntryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const SalesEntryModal = ({ open, onClose, onSuccess }: SalesEntryModalProps) => {
  const [tabValue, setTabValue] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Daily entry state
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dailyTenders, setDailyTenders] = useState<DailyTender[]>([
    { tender_type: 'cash', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
    { tender_type: 'credit', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
    { tender_type: 'credit_card', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
    { tender_type: 'upi', amount: 0, transaction_reference: '', customer_reference: '', notes: '' }
  ])

  // Gift Voucher state
  const [voucherForm, setVoucherForm] = useState<VoucherFormData>({
    original_amount: 0,
    expiry_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    customer_name: '',     // Required field
    customer_phone: '',    // Required field
    notes: '',
    voucher_number: ''
  })

  // Hand Bill state
  const [handBillForm, setHandBillForm] = useState<HandBillFormData>({
    amount: 0,
    items_description: '',
    notes: ''
  })
  const [selectedHandBillCustomer, setSelectedHandBillCustomer] = useState<Customer | null>(null)

  // Sales Order state
  const [salesOrderForm, setSalesOrderForm] = useState<SalesOrderFormData>({
    customer_id: '',
    items_description: '',
    total_estimated_amount: 0,
    advance_paid: 0,
    notes: ''
  })
  const [selectedOrderCustomer, setSelectedOrderCustomer] = useState<Customer | null>(null)

  // Return (RRN) state
  const [returnForm, setReturnForm] = useState<ReturnFormData>({
    return_amount: 0,
    return_reason: '',
    original_bill_reference: '',
    payment_method: 'cash',
    notes: ''
  })
  const [selectedReturnCustomer, setSelectedReturnCustomer] = useState<Customer | null>(null)

  const { user } = useAuth()
  const needsStoreSelection = user?.role === 'super_user' || user?.role === 'accounts_incharge'

  useEffect(() => {
    if (open && needsStoreSelection) {
      loadStores()
    }
  }, [open, needsStoreSelection])

  useEffect(() => {
    if (selectedOrderCustomer) {
      setSalesOrderForm(prev => ({ ...prev, customer_id: selectedOrderCustomer.id }))
    }
  }, [selectedOrderCustomer])

  const loadStores = async () => {
    try {
      const storesData = await storesApi.getAll()
      setStores(storesData)
      if (storesData.length === 1) {
        setSelectedStoreId(storesData[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load stores:', err)
      setError('Failed to load stores')
    }
  }

  const resetAllForms = () => {
    setSaleDate(format(new Date(), 'yyyy-MM-dd'))
    setDailyTenders([
      { tender_type: 'cash', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
      { tender_type: 'credit', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
      { tender_type: 'credit_card', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
      { tender_type: 'upi', amount: 0, transaction_reference: '', customer_reference: '', notes: '' }
    ])
    setVoucherForm({
      original_amount: 0,
      expiry_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      customer_name: '',     // Required field
      customer_phone: '',    // Required field
      notes: '',
      voucher_number: ''
    })
    setHandBillForm({
      amount: 0,
      items_description: '',
      notes: ''
    })
    setSalesOrderForm({
      customer_id: '',
      items_description: '',
      total_estimated_amount: 0,
      advance_paid: 0,
      notes: ''
    })
    setReturnForm({
      return_amount: 0,
      return_reason: '',
      original_bill_reference: '',
      payment_method: 'cash',
      notes: ''
    })
    setSelectedHandBillCustomer(null)
    setSelectedOrderCustomer(null)
    setSelectedReturnCustomer(null)
    setSelectedStoreId('')
    setError('')
    setTabValue(0)
  }

  const handleClose = () => {
    resetAllForms()
    onClose()
  }

  const handleDailySubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }
      
      const validTenders = dailyTenders.filter(tender => tender.amount > 0)
      
      if (validTenders.length === 0) {
        setError('Please enter at least one tender amount')
        return
      }
      
      const requestData: any = {
        sale_date: saleDate,
        tenders: validTenders
      }
      
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await salesApi.createBatch(requestData)
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sales entries')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGiftVoucherSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }

      if (!voucherForm.original_amount || voucherForm.original_amount <= 0) {
        setError('Please enter a valid amount')
        return
      }

      if (!voucherForm.expiry_date) {
        setError('Please enter an expiry date')
        return
      }

      if (!voucherForm.customer_name || voucherForm.customer_name.trim() === '') {
        setError('Customer name is required')
        return
      }

      if (!voucherForm.customer_phone || voucherForm.customer_phone.trim() === '') {
        setError('Customer phone is required')
        return
      }

      const requestData: any = { ...voucherForm }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }

      await vouchersApi.create(requestData)
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create gift voucher')
    } finally {
      setSubmitting(false)
    }
  }

  const handleHandBillSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }

      if (!handBillForm.amount || handBillForm.amount <= 0) {
        setError('Please enter a valid amount')
        return
      }

      const requestData: any = {
        ...handBillForm,
        customer_id: selectedHandBillCustomer?.id || null
      }
      
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }

      const response = await fetch('/api/v1/hand-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create hand bill')
      }
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create hand bill')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSalesOrderSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }

      if (!selectedOrderCustomer) {
        setError('Please select a customer')
        return
      }

      if (!salesOrderForm.items_description || salesOrderForm.items_description.trim() === '') {
        setError('Please enter items description')
        return
      }

      if (!salesOrderForm.total_estimated_amount || salesOrderForm.total_estimated_amount <= 0) {
        setError('Please enter a valid estimated amount')
        return
      }

      if (salesOrderForm.advance_paid && salesOrderForm.advance_paid > salesOrderForm.total_estimated_amount) {
        setError('Advance payment cannot exceed total estimated amount')
        return
      }

      const requestData: any = {
        ...salesOrderForm,
        customer_id: selectedOrderCustomer.id
      }
      
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }

      const response = await fetch('/api/v1/sales-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create sales order')
      }
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create sales order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReturnSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (needsStoreSelection && !selectedStoreId) {
        setError('Please select a store')
        return
      }

      if (!returnForm.return_amount || returnForm.return_amount <= 0) {
        setError('Please enter a valid return amount')
        return
      }

      if (!returnForm.return_reason || returnForm.return_reason.trim() === '') {
        setError('Please enter a return reason')
        return
      }

      const requestData: any = {
        ...returnForm,
        customer_id: selectedReturnCustomer?.id || null
      }
      
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }

      const response = await fetch('/api/v1/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create return')
      }
      
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create return')
    } finally {
      setSubmitting(false)
    }
  }
  
  const updateDailyTender = (index: number, field: keyof DailyTender, value: string | number) => {
    const updated = [...dailyTenders]
    updated[index] = { ...updated[index], [field]: value }
    setDailyTenders(updated)
  }

  const getTenderTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      cash: 'Cash',
      credit: 'Credit',
      credit_card: 'Credit Card',
      upi: 'UPI'
    }
    return types[type] || type
  }

  const getCurrentSubmitHandler = () => {
    switch (tabValue) {
      case 0: return handleDailySubmit
      case 1: return handleGiftVoucherSubmit
      case 2: return handleHandBillSubmit
      case 3: return handleSalesOrderSubmit
      case 4: return handleReturnSubmit
      default: return handleDailySubmit
    }
  }

  const getSubmitButtonText = () => {
    if (submitting) return 'Submitting...'
    
    switch (tabValue) {
      case 0: return 'Save Daily Entry'
      case 1: return 'Create Gift Voucher'
      case 2: return 'Create Hand Bill'
      case 3: return 'Create Sales Order'
      case 4: return 'Create Return'
      default: return 'Save Entry'
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Sales & Transaction Entry</DialogTitle>
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
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} variant="scrollable" scrollButtons="auto">
            <Tab label="Daily Entry" />
            <Tab label="Gift Voucher" icon={<CardGiftcard />} iconPosition="start" />
            <Tab label="Hand Bill" icon={<Receipt />} iconPosition="start" />
            <Tab label="Sales Order" icon={<ShoppingCart />} iconPosition="start" />
            <Tab label="Return (RRN)" icon={<Undo />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Daily Entry Tab */}
        {tabValue === 0 && (
          <Box>
            <Box mb={3}>
              <TextField
                label="Sale Date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Box>
            
            <Typography variant="subtitle1" gutterBottom>
              Enter amounts for each tender type:
            </Typography>
            
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
          </Box>
        )}

        {/* Gift Voucher Tab */}
        {tabValue === 1 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CardGiftcard />
              Create Gift Voucher
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Amount"
                  type="number"
                  value={voucherForm.original_amount || ''}
                  onChange={(e) => setVoucherForm({ ...voucherForm, original_amount: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Expiry Date"
                  type="date"
                  value={voucherForm.expiry_date}
                  onChange={(e) => setVoucherForm({ ...voucherForm, expiry_date: e.target.value })}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: format(new Date(), 'yyyy-MM-dd') }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Voucher Number (Optional)"
                  value={voucherForm.voucher_number}
                  onChange={(e) => setVoucherForm({ ...voucherForm, voucher_number: e.target.value })}
                  fullWidth
                  placeholder="Leave empty to auto-generate"
                  helperText="If empty, system will auto-generate voucher number"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Customer Name *"
                  value={voucherForm.customer_name}
                  onChange={(e) => setVoucherForm({ ...voucherForm, customer_name: e.target.value })}
                  fullWidth
                  required
                  placeholder="Enter customer name"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Customer Phone *"
                  value={voucherForm.customer_phone}
                  onChange={(e) => setVoucherForm({ ...voucherForm, customer_phone: e.target.value })}
                  fullWidth
                  required
                  placeholder="+91 9876543210"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={2}
                  value={voucherForm.notes}
                  onChange={(e) => setVoucherForm({ ...voucherForm, notes: e.target.value })}
                  fullWidth
                  placeholder="Additional notes for the voucher"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Hand Bill Tab */}
        {tabValue === 2 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Receipt />
              Create Hand Bill
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <CustomerSelector
                  value={selectedHandBillCustomer}
                  onChange={setSelectedHandBillCustomer}
                  label="Customer (Optional)"
                  allowQuickAdd={true}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Amount"
                  type="number"
                  value={handBillForm.amount || ''}
                  onChange={(e) => setHandBillForm({ ...handBillForm, amount: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Original Image URL"
                  value={handBillForm.original_image_url || ''}
                  onChange={(e) => setHandBillForm({ ...handBillForm, original_image_url: e.target.value })}
                  fullWidth
                  placeholder="URL to hand bill image"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Upload /></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Items Description"
                  multiline
                  rows={3}
                  value={handBillForm.items_description}
                  onChange={(e) => setHandBillForm({ ...handBillForm, items_description: e.target.value })}
                  fullWidth
                  placeholder="Describe the items/services in this hand bill"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={2}
                  value={handBillForm.notes}
                  onChange={(e) => setHandBillForm({ ...handBillForm, notes: e.target.value })}
                  fullWidth
                  placeholder="Additional notes"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Sales Order Tab */}
        {tabValue === 3 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCart />
              Create Sales Order
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <CustomerSelector
                  value={selectedOrderCustomer}
                  onChange={setSelectedOrderCustomer}
                  label="Customer"
                  required={true}
                  allowQuickAdd={true}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Items Description"
                  multiline
                  rows={3}
                  value={salesOrderForm.items_description}
                  onChange={(e) => setSalesOrderForm({ ...salesOrderForm, items_description: e.target.value })}
                  fullWidth
                  required
                  placeholder="Describe the items to be ordered"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Total Estimated Amount"
                  type="number"
                  value={salesOrderForm.total_estimated_amount || ''}
                  onChange={(e) => setSalesOrderForm({ ...salesOrderForm, total_estimated_amount: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Advance Payment"
                  type="number"
                  value={salesOrderForm.advance_paid || ''}
                  onChange={(e) => setSalesOrderForm({ ...salesOrderForm, advance_paid: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  inputProps={{ min: 0, step: 0.01, max: salesOrderForm.total_estimated_amount }}
                  helperText="Optional advance payment received"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={2}
                  value={salesOrderForm.notes}
                  onChange={(e) => setSalesOrderForm({ ...salesOrderForm, notes: e.target.value })}
                  fullWidth
                  placeholder="Additional notes for the order"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Return (RRN) Tab */}
        {tabValue === 4 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Undo />
              Create Return (RRN)
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <CustomerSelector
                  value={selectedReturnCustomer}
                  onChange={setSelectedReturnCustomer}
                  label="Customer (Optional)"
                  allowQuickAdd={true}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Return Amount"
                  type="number"
                  value={returnForm.return_amount || ''}
                  onChange={(e) => setReturnForm({ ...returnForm, return_amount: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={returnForm.payment_method}
                    onChange={(e) => setReturnForm({ ...returnForm, payment_method: e.target.value as any })}
                    label="Payment Method"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="store_credit">Store Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Original Bill Reference"
                  value={returnForm.original_bill_reference}
                  onChange={(e) => setReturnForm({ ...returnForm, original_bill_reference: e.target.value })}
                  fullWidth
                  placeholder="Original bill/receipt number"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Return Reason"
                  value={returnForm.return_reason}
                  onChange={(e) => setReturnForm({ ...returnForm, return_reason: e.target.value })}
                  fullWidth
                  required
                  placeholder="Reason for return"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={2}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  fullWidth
                  placeholder="Additional notes about the return"
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          variant="contained"
          onClick={getCurrentSubmitHandler()}
          disabled={submitting}
        >
          {getSubmitButtonText()}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SalesEntryModal