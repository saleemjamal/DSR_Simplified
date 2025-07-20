import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Button
} from '@mui/material'
import { FilterList, Clear } from '@mui/icons-material'
import { Store } from '../types'
import { storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface FilterBarProps {
  onFilterChange: (filters: { store_id: string; store_name?: string }) => void
  currentFilter: { store_id: string; store_name?: string }
}

const FilterBar = ({ onFilterChange, currentFilter }: FilterBarProps) => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()
  
  // Only show filter bar for super users and accounts
  const canViewAllStores = user?.role === 'super_user' || user?.role === 'accounts_incharge'
  
  useEffect(() => {
    if (canViewAllStores) {
      loadStores()
    }
  }, [canViewAllStores])

  const loadStores = async () => {
    try {
      setLoading(true)
      const storesData = await storesApi.getAll()
      setStores(storesData)
    } catch (error: any) {
      console.error('Failed to load stores for filtering:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStoreChange = (storeId: string) => {
    const selectedStore = stores.find(s => s.id === storeId)
    onFilterChange({
      store_id: storeId,
      store_name: selectedStore ? `${selectedStore.store_code} - ${selectedStore.store_name}` : undefined
    })
  }

  const handleClearFilter = () => {
    onFilterChange({ store_id: '' })
  }

  // Don't render for store managers/cashiers
  if (!canViewAllStores) {
    return null
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <FilterList color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            View Transactions:
          </Typography>
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Store</InputLabel>
            <Select
              value={currentFilter.store_id}
              onChange={(e) => handleStoreChange(e.target.value)}
              label="Filter by Store"
              disabled={loading}
            >
              <MenuItem value="">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography>All Stores</Typography>
                  <Chip label="Multi-Store" size="small" color="primary" variant="outlined" />
                </Box>
              </MenuItem>
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.store_code} - {store.store_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {currentFilter.store_id && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClearFilter}
              color="secondary"
            >
              Clear Filter
            </Button>
          )}

          {/* Filter Status Display */}
          <Box flex={1} display="flex" justifyContent="flex-end" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Showing: {currentFilter.store_name || 'All Stores'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default FilterBar