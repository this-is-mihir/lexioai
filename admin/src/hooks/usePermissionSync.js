import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import adminApi from '../api/axios'

/**
 * Smart Permission Sync Hook
 * 
 * Fixes "Too Many Requests" (429) when running multiple browsers/tabs:
 * ✅ 90 second polling (less aggressive)
 * ✅ Only polls when tab is VISIBLE (stops background requests)
 * ✅ Random jitter to prevent thundering herd (2+ browsers)
 * ✅ Exponential backoff on 429 errors
 * ✅ Better error handling
 */
const usePermissionSync = () => {
  const { admin, updateAdmin, isAuthenticated } = useAuthStore()
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden)
  const [lastError, setLastError] = useState(null)

  // Track tab visibility - pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Fetch fresh admin data from server
  const { data: freshAdminData, error } = useQuery({
    queryKey: ['current-admin', admin?._id],
    queryFn: async () => {
      try {
        const res = await adminApi.get('/auth/me')
        setLastError(null)
        return res.data.data.admin
      } catch (err) {
        if (err.response?.status === 429) {
          throw err
        }
        throw err
      }
    },
    enabled: isAuthenticated && !!admin?._id && isTabVisible,
    
    // ✅ 90 seconds = less aggressive (instead of 30)
    // ✅ Adding random jitter (±30s) to prevent multiple browsers hitting at same time
    refetchInterval: () => {
      const baseInterval = 90000 // 90 seconds
      const jitter = Math.random() * 30000 - 15000 // ±15 seconds random
      return Math.max(60000, baseInterval + jitter) // Min 60 seconds
    },
    
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    
    staleTime: 85000,
    cacheTime: 0,
    
    // ✅ Better retry strategy
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized)
      if (error.response?.status === 401) return false
      // Retry max 1 time on 429 (rate limit)
      if (error.response?.status === 429) return failureCount < 1
      // Retry max 2 times on other errors
      return failureCount < 2
    },
    
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 2s, 4s, 8s, etc.
      const delay = Math.min(1000 * Math.pow(2, attemptIndex), 30000)
      return delay
    },
  })

  // Store error for debugging
  useEffect(() => {
    if (error) {
      setLastError(error)
    }
  }, [error])

  // When fresh data arrives, check if permissions changed
  useEffect(() => {
    if (freshAdminData && admin) {
      const permissionsChanged = JSON.stringify(freshAdminData.permissions) !==
                               JSON.stringify(admin.permissions)
      const roleChanged = freshAdminData.role !== admin.role
      const dataChanged = freshAdminData.name !== admin.name ||
                          freshAdminData.isBanned !== admin.isBanned ||
                          freshAdminData.isActive !== admin.isActive

      if (permissionsChanged || roleChanged || dataChanged) {
        updateAdmin(freshAdminData)
      }
    }
  }, [freshAdminData, admin, updateAdmin])

  return { isTabVisible, lastError }
}

export default usePermissionSync
