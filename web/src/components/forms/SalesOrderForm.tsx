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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { SalesOrderFormData, Customer } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import CustomerSelector from '../CustomerSelector'

interface SalesOrderFormProps {
  initialData?: Partial<SalesOrderFormData>
  onSubmit: (data: SalesOrderFormData & { store_id?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
  error?: string
  storeId?: string // For super users
  mode?: 'create' | 'edit'
  showStoreSelector?: boolean
  showAdvancePayment?: boolean
  currentStoreName?: string // For store managers (read-only display)
  stores?: Array<{ id: string; store_name: string }> // Store options for dropdown
  onStoreChange?: (storeId: string) => void // Store selection callback
}

const SalesOrderForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  error: externalError,
  storeId,
  mode = 'create',
  showStoreSelector = false,
  showAdvancePayment = true,
  currentStoreName,
  stores = [],
  onStoreChange
}: SalesOrderFormProps) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<SalesOrderFormData>({
    customer_id: initialData.customer_id || '',
    items_description: initialData.items_description || '',
    total_estimated_amount: initialData.total_estimated_amount || 0,
    advance_paid: initialData.advance_paid || 0,
    notes: initialData.notes || ''
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [internalError, setInternalError] = useState('')

  const displayError = externalError || internalError

  const handleInputChange = (field: keyof SalesOrderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (internalError) setInternalError('')
  }

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({ ...prev, customer_id: customer?.id || '' }))
  }

  const validateForm = (): boolean => {
    if (!formData.customer_id) {
      setInternalError('Please select a customer')
      return false
    }

    if (!formData.items_description?.trim()) {
      setInternalError('Please describe the items')
      return false
    }

    if (!formData.total_estimated_amount || formData.total_estimated_amount <= 0) {
      setInternalError('Please enter a valid estimated amount')
      return false
    }

    if (showAdvancePayment && (formData.advance_paid || 0) < 0) {
      setInternalError('Advance payment cannot be negative')
      return false
    }

    if (showAdvancePayment && (formData.advance_paid || 0) > formData.total_estimated_amount) {
      setInternalError('Advance payment cannot exceed estimated amount')
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
      const submitData: SalesOrderFormData & { store_id?: string } = {
        ...formData,
        total_estimated_amount: parseFloat(formData.total_estimated_amount.toString()),
        advance_paid: parseFloat((formData.advance_paid || 0).toString()) || 0
      }

      // Add store_id for super users or use current user's store
      if (showStoreSelector && storeId) {
        submitData.store_id = storeId
      } else if (user?.store_id) {
        submitData.store_id = user.store_id
      }

      await onSubmit(submitData)
    } catch (error: any) {
      setInternalError(error.message || 'Failed to save sales order')
    }
  }

  const handleReset = () => {
    setFormData({
      customer_id: '',
      items_description: '',
      total_estimated_amount: 0,
      advance_paid: 0,
      notes: ''
    })
    setSelectedCustomer(null)
    setInternalError('')
  }

  const remainingAmount = formData.total_estimated_amount - (formData.advance_paid || 0)

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        {mode === 'create' ? 'Create Sales Order' : 'Edit Sales Order'}
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
            label="Customer"
            required={true}
            disabled={loading}
            store_id={storeId}
          />
        </Grid>

        {/* Store Selection */}
        {(showStoreSelector || currentStoreName) && (
          <Grid item xs={12} sm={6}>
            {showStoreSelector ? (
              // Dropdown for super user/accounts incharge
              <FormControl fullWidth required disabled={loading}>
                <InputLabel>Store</InputLabel>
                <Select
                  value={storeId || ''}
                  onChange={(e) => onStoreChange?.(e.target.value)}
                  label="Store"
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.store_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : currentStoreName ? (
              // Read-only display for store managers
              <TextField
                fullWidth
                label="Store"
                value={currentStoreName}
                disabled
                InputProps={{
                  readOnly: true,
                }}
                helperText="Your assigned store"
              />
            ) : null}
          </Grid>
        )}

        {/* Items Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Items Description"
            multiline
            rows={3}
            value={formData.items_description}
            onChange={(e) => handleInputChange('items_description', e.target.value)}
            required
            disabled={loading}
            placeholder="Describe the items to be ordered"
          />
        </Grid>

        {/* Total Estimated Amount */}
        <Grid item xs={12} sm={showAdvancePayment ? 4 : 6}>
          <TextField
            fullWidth
            label="Total Estimated Amount"
            type="number"
            value={formData.total_estimated_amount}
            onChange={(e) => handleInputChange('total_estimated_amount', parseFloat(e.target.value) || 0)}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            inputProps={{ min: 0, step: 0.01 }}
            required
            disabled={loading}
          />
        </Grid>

        {/* Advance Paid */}
        {showAdvancePayment && (
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Advance Paid"
              type="number"
              value={formData.advance_paid}
              onChange={(e) => handleInputChange('advance_paid', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>
              }}
              inputProps={{ min: 0, step: 0.01, max: formData.total_estimated_amount }}
              disabled={loading}
            />
          </Grid>
        )}

        {/* Remaining Amount (Display Only) */}
        {showAdvancePayment && (
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Remaining Amount"
              value={remainingAmount.toFixed(2)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                readOnly: true
              }}
              disabled
            />
          </Grid>
        )}

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Order Notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={loading}
            placeholder="Optional notes about the sales order"
          />
        </Grid>
      </Grid>

      {/* Summary Box */}
      {selectedCustomer && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Order Summary
          </Typography>
          <Typography variant="body2">
            Customer: {selectedCustomer.customer_name}
            {selectedCustomer.customer_phone && ` (${selectedCustomer.customer_phone})`}
          </Typography>
          <Typography variant="body2">
            Estimated Amount: ₹{formData.total_estimated_amount.toLocaleString()}
          </Typography>
          {showAdvancePayment && (
            <>
              <Typography variant="body2">
                Advance Paid: ₹{(formData.advance_paid || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                Remaining: ₹{remainingAmount.toLocaleString()}
              </Typography>
            </>
          )}
        </Box>
      )}

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
          {loading ? 'Saving...' : mode === 'create' ? 'Create Order' : 'Update Order'}
        </Button>
      </Box>
    </Box>
  )
}

export default SalesOrderForm