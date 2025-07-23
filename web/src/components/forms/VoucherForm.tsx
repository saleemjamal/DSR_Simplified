import { useState } from 'react'
import {
  Box,
  TextField,
  Grid,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { VoucherFormData } from '../../types'
import { useAuth } from '../../hooks/useAuth'

interface VoucherFormProps {
  initialData?: Partial<VoucherFormData>
  onSubmit: (data: VoucherFormData & { store_id?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string
  storeId?: string // For super users
  mode?: 'create' | 'edit'
  showStoreSelector?: boolean
  requireCustomer?: boolean
}

const VoucherForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  error: externalError,
  storeId,
  mode = 'create',
  showStoreSelector = false,
  requireCustomer = true
}: VoucherFormProps) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<VoucherFormData>({
    original_amount: initialData.original_amount || 0,
    expiry_date: initialData.expiry_date || '',
    customer_name: initialData.customer_name || '',
    customer_phone: initialData.customer_phone || '',
    notes: initialData.notes || ''
  })
  const [internalError, setInternalError] = useState('')

  const displayError = externalError || internalError

  const handleInputChange = (field: keyof VoucherFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (internalError) setInternalError('')
  }

  const validateForm = (): boolean => {
    if (!formData.original_amount || formData.original_amount <= 0) {
      setInternalError('Please enter a valid amount')
      return false
    }

    if (!formData.expiry_date) {
      setInternalError('Please select an expiry date')
      return false
    }

    if (requireCustomer) {
      if (!formData.customer_name.trim()) {
        setInternalError('Customer name is required')
        return false
      }

      if (!formData.customer_phone.trim()) {
        setInternalError('Customer phone is required')
        return false
      }

      // Basic phone validation
      const phoneRegex = /^[+]?[\d\s\-()]+$/
      if (!phoneRegex.test(formData.customer_phone)) {
        setInternalError('Please enter a valid phone number')
        return false
      }
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
      const submitData: VoucherFormData & { store_id?: string } = {
        ...formData,
        original_amount: parseFloat(formData.original_amount.toString())
      }

      // Add store_id for super users or use current user's store
      if (showStoreSelector && storeId) {
        submitData.store_id = storeId
      } else if (user?.store_id) {
        submitData.store_id = user.store_id
      }

      await onSubmit(submitData)
    } catch (error: any) {
      setInternalError(error.message || 'Failed to save voucher')
    }
  }

  const handleReset = () => {
    setFormData({
      original_amount: 0,
      expiry_date: '',
      customer_name: '',
      customer_phone: '',
      notes: ''
    })
    setInternalError('')
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>
          {mode === 'create' ? 'Create Gift Voucher' : 'Edit Gift Voucher'}
        </Typography>

        {displayError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {displayError}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Voucher Amount */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Voucher Amount"
              type="number"
              value={formData.original_amount}
              onChange={(e) => handleInputChange('original_amount', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>
              }}
              inputProps={{ min: 0, step: 0.01 }}
              required
              disabled={loading}
            />
          </Grid>

          {/* Expiry Date */}
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Expiry Date"
              value={formData.expiry_date ? new Date(formData.expiry_date) : null}
              onChange={(date) => {
                const dateString = date ? date.toISOString().split('T')[0] : ''
                handleInputChange('expiry_date', dateString)
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  disabled: loading
                }
              }}
              minDate={new Date()}
            />
          </Grid>

          {/* Customer Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Customer Name"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              required={requireCustomer}
              disabled={loading}
              placeholder="Enter customer name"
            />
          </Grid>

          {/* Customer Phone */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Customer Phone"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange('customer_phone', e.target.value)}
              required={requireCustomer}
              disabled={loading}
              placeholder="Enter customer phone number"
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={loading}
              placeholder="Optional notes about the voucher"
            />
          </Grid>
        </Grid>

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
            {loading ? 'Saving...' : mode === 'create' ? 'Create Voucher' : 'Update Voucher'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  )
}

export default VoucherForm