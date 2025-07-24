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
  Alert,
  Typography
} from '@mui/material'
import { AttachMoney } from '@mui/icons-material'
import { format } from 'date-fns'
import { Store } from '../types'
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
    setSelectedStoreId('')
    setError('')
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
    return handleDailySubmit
  }

  const getSubmitButtonText = () => {
    return submitting ? 'Submitting...' : 'Save Daily Entry'
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Daily Sales Entry</DialogTitle>
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

        {/* Daily Sales Entry */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 2 }}>
            <AttachMoney />
            Daily Sales Entry
          </Typography>
        </Box>

        {/* Daily Entry Content */}
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