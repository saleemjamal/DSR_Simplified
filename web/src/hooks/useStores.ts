import { useState, useEffect, useCallback } from 'react'
import { storesApi } from '../services/api'

interface Store {
  id: string
  store_name: string
  store_code: string
}

interface StoresCache {
  data: Store[]
  timestamp: number
}

// 5-minute cache duration to match backend cache headers
const CACHE_DURATION = 5 * 60 * 1000

// In-memory cache (shared across all hook instances)
let storesCache: StoresCache | null = null

export const useStores = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidCache = useCallback(() => {
    if (!storesCache) return false
    const now = Date.now()
    return (now - storesCache.timestamp) < CACHE_DURATION
  }, [])

  const loadStores = useCallback(async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isValidCache() && storesCache) {
      setStores(storesCache.data)
      return storesCache.data
    }

    try {
      setLoading(true)
      setError(null)
      
      // Use full stores endpoint for now (TODO: switch to /dropdown when available)
      const storesData = await storesApi.getAll()
      
      // Update cache
      storesCache = {
        data: storesData,
        timestamp: Date.now()
      }
      
      setStores(storesData)
      return storesData
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load stores'
      setError(errorMessage)
      console.error('useStores - Failed to load stores:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [isValidCache])

  const refreshStores = useCallback(() => {
    return loadStores(true)
  }, [loadStores])

  const clearCache = useCallback(() => {
    storesCache = null
  }, [])

  // Load stores on mount if cache is empty or expired
  useEffect(() => {
    if (!isValidCache() || stores.length === 0) {
      loadStores()
    } else if (storesCache) {
      setStores(storesCache.data)
    }
  }, [loadStores, isValidCache, stores.length])

  return {
    stores,
    loading,
    error,
    loadStores,
    refreshStores,
    clearCache,
    isCacheValid: isValidCache()
  }
}

export default useStores