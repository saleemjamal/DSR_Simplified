import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Alert
} from '@mui/material'
import { Add, PersonAdd } from '@mui/icons-material'
import { customersApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface Customer {
  id: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  total_outstanding: number
  credit_limit: number
}

interface CustomerSelectorProps {
  value?: Customer | null
  onChange: (customer: Customer | null) => void
  label?: string
  required?: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
  allowQuickAdd?: boolean
  store_id?: string // For super users to specify which store the customer belongs to
}

interface QuickAddFormData {
  customer_name: string
  customer_phone: string
  customer_email: string
  credit_limit: number
  notes: string
}

const CustomerSelector = ({
  value,
  onChange,
  label = 'Customer',
  required = false,
  disabled = false,
  size = 'medium',
  allowQuickAdd = true,
  store_id
}: CustomerSelectorProps) => {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  
  // Quick add modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState<QuickAddFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    credit_limit: 0,
    notes: ''
  })
  const [error, setError] = useState('')

  // Load customers when component mounts or search term changes
  useEffect(() => {
    if (open || searchTerm) {
      loadCustomers(searchTerm)
    }
  }, [open, searchTerm])

  const loadCustomers = async (search = '') => {
    try {
      setLoading(true)
      const data = await customersApi.getAll({ search, limit: 20 })
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdd = async () => {
    try {
      setQuickAddLoading(true)
      setError('')

      if (!quickAddForm.customer_name.trim()) {
        setError('Customer name is required')
        return
      }

      // Determine origin_store_id for the customer
      const getOriginStoreId = () => {
        // If store_id prop is provided (for super users), use it
        if (store_id) {
          return store_id
        }
        // Otherwise, use the current user's assigned store
        return user?.store_id
      }

      const customerData = {
        ...quickAddForm,
        origin_store_id: getOriginStoreId()
      }

      const result = await customersApi.create(customerData)
      const newCustomer = result.data

      if (!newCustomer) {
        throw new Error('Failed to create customer')
      }

      // Add to customers list and select it
      setCustomers(prev => [newCustomer, ...prev])
      onChange(newCustomer)
      
      // Reset form and close modal
      setQuickAddForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        credit_limit: 0,
        notes: ''
      })
      setQuickAddOpen(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setQuickAddLoading(false)
    }
  }

  const getCustomerLabel = (customer: Customer) => {
    const name = customer.customer_name
    const phone = customer.customer_phone ? ` (${customer.customer_phone})` : ''
    return `${name}${phone}`
  }

  const getCustomerOptionLabel = (customer: Customer) => {
    return getCustomerLabel(customer)
  }

  const renderCustomerOption = (props: any, customer: Customer) => (
    <Box component="li" {...props} key={customer.id}>
      <Box>
        <Typography variant="body2">
          {customer.customer_name}
        </Typography>
        {customer.customer_phone && (
          <Typography variant="caption" color="text.secondary">
            {customer.customer_phone}
          </Typography>
        )}
        {customer.total_outstanding > 0 && (
          <Chip
            label={`Outstanding: ₹${customer.total_outstanding.toLocaleString()}`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        )}
        {customer.credit_limit > 0 && (
          <Chip
            label={`Credit: ₹${customer.credit_limit.toLocaleString()}`}
            size="small"
            color="info"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        )}
      </Box>
    </Box>
  )

  return (
    <>
      <Box display="flex" alignItems="center" gap={1}>
        <Autocomplete
          value={value}
          onChange={(_, newValue) => onChange(newValue)}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          onInputChange={(_, newInputValue) => setSearchTerm(newInputValue)}
          options={customers}
          getOptionLabel={getCustomerOptionLabel}
          renderOption={renderCustomerOption}
          loading={loading}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="No customers found"
          loadingText="Loading customers..."
          size={size}
          disabled={disabled}
          sx={{ flex: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              required={required}
              placeholder="Search by name or phone..."
            />
          )}
        />
        
        {allowQuickAdd && !disabled && (
          <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setQuickAddOpen(true)}
            size={size}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            Add
          </Button>
        )}
      </Box>

      {/* Quick Add Customer Modal */}
      <Dialog 
        open={quickAddOpen} 
        onClose={() => setQuickAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
            <TextField
              label="Customer Name"
              value={quickAddForm.customer_name}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, customer_name: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Phone Number"
              value={quickAddForm.customer_phone}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, customer_phone: e.target.value })}
              fullWidth
              placeholder="+91 9876543210"
            />
            
            <TextField
              label="Email"
              type="email"
              value={quickAddForm.customer_email}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, customer_email: e.target.value })}
              fullWidth
              placeholder="customer@example.com"
            />
            
            <TextField
              label="Credit Limit"
              type="number"
              value={quickAddForm.credit_limit || ''}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, credit_limit: parseFloat(e.target.value) || 0 })}
              fullWidth
              inputProps={{ min: 0, step: 100 }}
            />
            
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={quickAddForm.notes}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, notes: e.target.value })}
              fullWidth
              placeholder="Additional notes about the customer"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setQuickAddOpen(false)}>Cancel</Button>
          <Button
            onClick={handleQuickAdd}
            variant="contained"
            disabled={quickAddLoading || !quickAddForm.customer_name.trim()}
          >
            {quickAddLoading ? 'Adding...' : 'Add Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default CustomerSelector