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
  Button,
  ButtonGroup,
  Divider
} from '@mui/material'
import { FilterList, Clear, DateRange } from '@mui/icons-material'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Store } from '../types'
import { storesApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface FilterState {
  // Date filtering
  period: string
  dateFrom?: string
  dateTo?: string
  // Store filtering
  store_id: string
  store_name?: string
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void
  currentFilter: FilterState
}

const FilterBar = ({ onFilterChange, currentFilter }: FilterBarProps) => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()
  
  // Role-based feature access
  const canViewAllStores = user?.role === 'super_user' || user?.role === 'accounts_incharge'
  const isCashier = user?.role === 'cashier'
  
  // Date period options based on user role
  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    ...(isCashier ? [] : [
      { value: 'this_week', label: 'This Week' },
      { value: 'last_week', label: 'Last Week' },
      { value: 'this_month', label: 'This Month' },
      { value: 'last_month', label: 'Last Month' }
    ])
  ]
  
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

  const calculateDateRange = (period: string) => {
    const today = new Date()
    
    switch (period) {
      case 'today':
        return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
      case 'yesterday':
        const yesterday = subDays(today, 1)
        return { from: format(yesterday, 'yyyy-MM-dd'), to: format(yesterday, 'yyyy-MM-dd') }
      case 'last_7_days':
        return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
      case 'this_week':
        return { from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
      case 'last_week':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 })
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 })
        return { from: format(lastWeekStart, 'yyyy-MM-dd'), to: format(lastWeekEnd, 'yyyy-MM-dd') }
      case 'this_month':
        return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') }
      case 'last_month':
        const lastMonth = subDays(startOfMonth(today), 1)
        return { from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), to: format(endOfMonth(lastMonth), 'yyyy-MM-dd') }
      default:
        return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    }
  }

  const handlePeriodChange = (period: string) => {
    const dateRange = calculateDateRange(period)
    onFilterChange({
      ...currentFilter,
      period,
      dateFrom: dateRange.from,
      dateTo: dateRange.to
    })
  }

  const handleStoreChange = (storeId: string) => {
    const selectedStore = stores.find(s => s.id === storeId)
    onFilterChange({
      ...currentFilter,
      store_id: storeId,
      store_name: selectedStore ? `${selectedStore.store_code} - ${selectedStore.store_name}` : undefined
    })
  }

  const handleClearAll = () => {
    const defaultPeriod = 'today'
    const dateRange = calculateDateRange(defaultPeriod)
    onFilterChange({
      period: defaultPeriod,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      store_id: '',
      store_name: undefined
    })
  }

  const getDateDisplayText = () => {
    const option = dateOptions.find(opt => opt.value === currentFilter.period)
    return option?.label || 'Today'
  }

  const getStoreDisplayText = () => {
    return currentFilter.store_name || 'All Stores'
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FilterList color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Filter Transactions:
          </Typography>
          
          {/* Date Filter Section */}
          <Box display="flex" alignItems="center" gap={1}>
            <DateRange fontSize="small" color="action" />
            <ButtonGroup size="small" variant="outlined">
              {dateOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={currentFilter.period === option.value ? "contained" : "outlined"}
                  onClick={() => handlePeriodChange(option.value)}
                  sx={{ 
                    minWidth: 'auto',
                    px: 1.5,
                    ...(currentFilter.period === option.value && {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      }
                    })
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </Box>

          {/* Store Filter Section (conditional) */}
          {canViewAllStores && (
            <>
              <Divider orientation="vertical" flexItem />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Store</InputLabel>
                <Select
                  value={currentFilter.store_id}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  label="Store"
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
            </>
          )}

          {/* Clear All Button */}
          {(currentFilter.period !== 'today' || currentFilter.store_id) && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClearAll}
              color="secondary"
            >
              Clear All
            </Button>
          )}

          {/* Filter Status Display */}
          <Box flex={1} display="flex" justifyContent="flex-end" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Showing: {getDateDisplayText()}
              {canViewAllStores && ` • ${getStoreDisplayText()}`}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default FilterBar