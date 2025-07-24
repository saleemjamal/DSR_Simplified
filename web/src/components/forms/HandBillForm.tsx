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
import { HandBillFormData, Customer } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import CustomerSelector from '../CustomerSelector'

interface HandBillFormProps {
  initialData?: Partial<HandBillFormData>
  onSubmit: (data: HandBillFormData & { store_id?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string
  storeId?: string // For super users
  mode?: 'create' | 'edit'
  showStoreSelector?: boolean
  allowImageUpload?: boolean
}

const HandBillForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  error: externalError,
  storeId,
  mode = 'create',
  showStoreSelector = false,
  allowImageUpload = true
}: HandBillFormProps) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<HandBillFormData>({
    customer_id: initialData.customer_id || undefined,
    amount: initialData.amount || 0,
    items_description: initialData.items_description || '',
    original_image_url: initialData.original_image_url || '',
    notes: initialData.notes || ''
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [internalError, setInternalError] = useState('')

  const displayError = externalError || internalError

  const handleInputChange = (field: keyof HandBillFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (internalError) setInternalError('')
  }

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({ ...prev, customer_id: customer?.id }))
  }

  const validateForm = (): boolean => {
    if (!formData.amount || formData.amount <= 0) {
      setInternalError('Please enter a valid amount')
      return false
    }

    if (!formData.items_description?.trim()) {
      setInternalError('Please describe the items')
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
      const submitData: HandBillFormData & { store_id?: string } = {
        ...formData,
        amount: parseFloat(formData.amount.toString())
      }

      // Add store_id for super users or use current user's store
      if (showStoreSelector && storeId) {
        submitData.store_id = storeId
      } else if (user?.store_id) {
        submitData.store_id = user.store_id
      }

      await onSubmit(submitData)
    } catch (error: any) {
      setInternalError(error.message || 'Failed to save hand bill')
    }
  }

  const handleReset = () => {
    setFormData({
      customer_id: undefined,
      amount: 0,
      items_description: '',
      original_image_url: '',
      notes: ''
    })
    setSelectedCustomer(null)
    setInternalError('')
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        {mode === 'create' ? 'Create Hand Bill' : 'Edit Hand Bill'}
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

        {/* Amount */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Hand Bill Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            inputProps={{ min: 0, step: 0.01 }}
            required
            disabled={loading}
          />
        </Grid>

        {/* Items Description */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Items Description"
            value={formData.items_description}
            onChange={(e) => handleInputChange('items_description', e.target.value)}
            required
            disabled={loading}
            placeholder="Describe the items sold"
          />
        </Grid>

        {/* Original Image URL */}
        {allowImageUpload && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Original Image URL"
              value={formData.original_image_url}
              onChange={(e) => handleInputChange('original_image_url', e.target.value)}
              disabled={loading}
              placeholder="URL of the original hand bill image"
              helperText="Optional: Upload the hand bill image and paste the URL here"
            />
          </Grid>
        )}

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
            placeholder="Optional notes about the hand bill"
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
          {loading ? 'Saving...' : mode === 'create' ? 'Create Hand Bill' : 'Update Hand Bill'}
        </Button>
      </Box>
    </Box>
  )
}

export default HandBillForm