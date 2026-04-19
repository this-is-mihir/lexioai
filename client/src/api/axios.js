import axios from 'axios'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const authApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

const clientApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

let isRefreshing = false
let queue = []

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Request failed. Please try again.'
    toast.error(message)
    return Promise.reject(error)
  },
)

const processQueue = (token) => {
  queue.forEach((cb) => cb(token))
  queue = []
}

clientApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

clientApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`
            resolve(clientApi(original))
          })
        })
      }

      isRefreshing = true

      try {
        const refreshRes = await authApi.post('/auth/refresh')
        const newToken = refreshRes?.data?.data?.accessToken

        if (!newToken) {
          throw new Error('No access token from refresh endpoint')
        }

        useAuthStore.getState().setToken(newToken)
        processQueue(newToken)

        original.headers.Authorization = `Bearer ${newToken}`
        return clientApi(original)
      } catch {
        useAuthStore.getState().logout(false)
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    const message = error.response?.data?.message || 'Network error. Please try again.'
    // Don't show toast for 403 Forbidden (plan-related restrictions)
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      toast.error(message)
    }

    return Promise.reject(error)
  },
)

export default clientApi
