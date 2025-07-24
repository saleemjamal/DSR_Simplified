import { useState } from 'react'
import {
  Box,
  TextField,
  Grid,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material'
import { ReturnFormData, Customer } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import CustomerSelector from '../CustomerSelector'

interface ReturnFormProps {
  initialData?: Partial<ReturnFormData>
  onSubmit: (data: ReturnFormData & { store_id?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string
  storeId?: string // For super users
  mode?: 'create' | 'edit'
  showStoreSelector?: boolean
  allowBillLookup?: boolean
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'store_credit', label: 'Store Credit' }
]

const ReturnForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  error: externalError,
  storeId,
  mode = 'create',
  showStoreSelector = false,
  allowBillLookup = true
}: ReturnFormProps) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<ReturnFormData>({
    customer_id: initialData.customer_id || undefined,
    return_amount: initialData.return_amount || 0,
    return_reason: initialData.return_reason || '',
    original_bill_reference: initialData.original_bill_reference || '',
    payment_method: initialData.payment_method || 'cash',
    notes: initialData.notes || ''
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [internalError, setInternalError] = useState('')

  const displayError = externalError || internalError

  const handleInputChange = (field: keyof ReturnFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (internalError) setInternalError('')
  }

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({ ...prev, customer_id: customer?.id }))
  }

  const validateForm = (): boolean => {
    if (!formData.return_amount || formData.return_amount <= 0) {
      setInternalError('Please enter a valid return amount')
      return false
    }

    if (!formData.return_reason?.trim()) {
      setInternalError('Please provide a reason for the return')
      return false
    }

    if (!formData.payment_method) {
      setInternalError('Please select a payment method')
      return false
    }

    // Store selection validation for super users and accounts incharge
    if (showStoreSelector && !storeId) {
      setInternalError('Please select a store')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInternalError('')

    if (!validateForm()) {
      return
    }

    try {
      const submitData: ReturnFormData & { store_id?: string } = {
        ...formData,
        return_amount: parseFloat(formData.return_amount.toString())
      }

      // Add store_id for super users or use current user's store
      if (showStoreSelector && storeId) {
        submitData.store_id = storeId
      } else if (user?.store_id) {
        submitData.store_id = user.store_id
      }

      await onSubmit(submitData)
    } catch (error: any) {
      setInternalError(error.message || 'Failed to save return')
    }
  }

  const handleReset = () => {
    setFormData({
      customer_id: undefined,
      return_amount: 0,
      return_reason: '',
      original_bill_reference: '',
      payment_method: 'cash',
      notes: ''
    })
    setSelectedCustomer(null)
    setInternalError('')
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        {mode === 'create' ? 'Create Return (RRN)' : 'Edit Return (RRN)'}
      </Typography>

      {displayError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {displayError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Customer Selection */}
        <Grid item xs={12}>
          <CustomerSelector
            value={selectedCustomer}
            onChange={handleCustomerChange}
            label="Customer (Optional)"
            required={false}
            disabled={loading}
            store_id={storeId}
          />
        </Grid>

        {/* Return Amount */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Return Amount"
            type="number"
            value={formData.return_amount}
            onChange={(e) => handleInputChange('return_amount', parseFloat(e.target.value) || 0)}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            inputProps={{ min: 0, step: 0.01 }}
            required
            disabled={loading}
          />
        </Grid>

        {/* Payment Method */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.payment_method}
              onChange={(e) => handleInputChange('payment_method', e.target.value)}
              label="Payment Method"
              disabled={loading}
            >
              {PAYMENT_METHODS.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Original Bill Reference */}
        {allowBillLookup && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Original Bill Reference"
              value={formData.original_bill_reference}
              onChange={(e) => handleInputChange('original_bill_reference', e.target.value)}
              disabled={loading}
              placeholder="Enter bill number or reference"
              helperText="Optional: Reference to the original sale"
            />
          </Grid>
        )}

        {/* Return Reason */}
        <Grid item xs={12} sm={allowBillLookup ? 6 : 12}>
          <TextField
            fullWidth
            label="Return Reason"
            value={formData.return_reason}
            onChange={(e) => handleInputChange('return_reason', e.target.value)}
            required
            disabled={loading}
            placeholder="e.g., Defective product, Wrong size, etc."
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Additional Notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={loading}
            placeholder="Optional notes about the return"
          />
        </Grid>
      </Grid>

      {/* Summary Box */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Return Summary
        </Typography>
        <Typography variant="body2">
          Return Amount: ₹{formData.return_amount.toLocaleString()}
        </Typography>
        <Typography variant="body2">
          Payment Method: {PAYMENT_METHODS.find(m => m.value === formData.payment_method)?.label}
        </Typography>
        {selectedCustomer && (
          <Typography variant="body2">
            Customer: {selectedCustomer.customer_name}
            {selectedCustomer.customer_phone && ` (${selectedCustomer.customer_phone})`}
          </Typography>
        )}
        {formData.original_bill_reference && (
          <Typography variant="body2">
            Bill Reference: {formData.original_bill_reference}
          </Typography>
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        
        {mode === 'create' && (
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </Button>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Return' : 'Update Return'}
        </Button>
      </Box>
    </Box>
  )
}

export default ReturnForm