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
import { SalesFormData, Store } from '../types'
import { salesApi, storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

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
  
  // Occasional entry state
  const [formData, setFormData] = useState<SalesFormData>({
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    tender_type: 'hand_bill',
    amount: 0,
    transaction_reference: '',
    customer_reference: '',
    notes: ''
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
    setSaleDate(format(new Date(), 'yyyy-MM-dd'))
    setDailyTenders([
      { tender_type: 'cash', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
      { tender_type: 'credit', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
      { tender_type: 'credit_card', amount: 0, transaction_reference: '', customer_reference: '', notes: '' },
      { tender_type: 'upi', amount: 0, transaction_reference: '', customer_reference: '', notes: '' }
    ])
    setFormData({
      sale_date: format(new Date(), 'yyyy-MM-dd'),
      tender_type: 'hand_bill',
      amount: 0,
      transaction_reference: '',
      customer_reference: '',
      notes: ''
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
      
      onSuccess()
      handleClose()
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
      
      if (!formData.amount || formData.amount <= 0) {
        setError('Please enter a valid amount')
        return
      }
      
      const requestData: any = { ...formData }
      
      // Add store_id for super users/accounts
      if (needsStoreSelection && selectedStoreId) {
        requestData.store_id = selectedStoreId
      }
      
      await salesApi.create(requestData)
      
      onSuccess()
      handleClose()
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
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Add Sales Entry</DialogTitle>
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
            <Tab label="Occasional Entry" />
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

        {/* Occasional Entry Tab */}
        {tabValue === 1 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Sale Date"
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Tender Type</InputLabel>
              <Select
                value={formData.tender_type}
                onChange={(e) => setFormData({ ...formData, tender_type: e.target.value })}
                label="Tender Type"
              >
                <MenuItem value="hand_bill">Hand Bill</MenuItem>
                <MenuItem value="rrn">RRN</MenuItem>
                <MenuItem value="gift_voucher">Gift Voucher</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="Transaction Reference"
              value={formData.transaction_reference}
              onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              fullWidth
              placeholder="Bill number, UPI reference, etc."
            />

            <TextField
              label="Customer Reference"
              value={formData.customer_reference}
              onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
              fullWidth
              placeholder="Customer name or reference"
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
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          variant="contained"
          onClick={tabValue === 0 ? handleDailySubmit : handleOccasionalSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Save Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SalesEntryModal