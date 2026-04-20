import axios from 'axios'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/v1'

// Admin API instance — for protected routes
export const adminApi = axios.create({
  baseURL: `${API_URL}/admin`,
  withCredentials: true,
})

// Auth API instance — for public routes (login, forgot-password)
export const authApi = axios.create({
  baseURL: `${API_URL}/admin`,
  withCredentials: true,
})

// Request interceptor — token add karo
adminApi.interceptors.request.use((config) => {
  // Get current admin type
  const adminType = localStorage.getItem('currentAdminType') || 'admin'
  const token = sessionStorage.getItem(`adminAccessToken-${adminType}`) || useAuthStore.getState().accessToken
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — errors handle karo (protected routes only)
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const adminType = localStorage.getItem('currentAdminType') || 'admin'

    // Token expired — refresh karo
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const res = await axios.post(
          `${API_URL}/admin/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = res.data.data.accessToken
        sessionStorage.setItem(`adminAccessToken-${adminType}`, newToken)
        useAuthStore.getState().setAccessToken(newToken, adminType)
        original.headers.Authorization = `Bearer ${newToken}`
        return adminApi(original)
      } catch {
        sessionStorage.removeItem(`adminAccessToken-${adminType}`)
        localStorage.removeItem(`adminAccessToken-${adminType}`)
        localStorage.removeItem(`adminData-${adminType}`)
        localStorage.removeItem('currentAdminType')
        window.location.href = adminType === 'support' ? '/support/login' : '/admin/login'
      }
    }

    // Error message show karo
    const message = error.response?.data?.message || 'Something went wrong'
    if (error.response?.status !== 401) {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

// Auth API interceptor — only show errors, no redirects
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong'
    toast.error(message)
    return Promise.reject(error)
  }
)

export default adminApi
