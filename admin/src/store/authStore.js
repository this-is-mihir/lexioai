import { create } from 'zustand'

const getTokenKey = (adminType = 'admin') => `adminAccessToken-${adminType}`
const getAdminDataKey = (adminType = 'admin') => `adminData-${adminType}`
const getSessionIdKey = (adminType = 'admin') => `adminSessionId-${adminType}`
const clearLegacyTokenStorage = (adminType = 'admin') => {
  localStorage.removeItem(getTokenKey(adminType))
}

const useAuthStore = create((set, get) => ({
  admin: null,
  accessToken: null,
  isAuthenticated: false,
  adminType: null, // 'admin' or 'support'
  sessionId: null,
  isInitialized: false, // NEW: Track if initAuth has finished

  setAuth: (admin, accessToken, adminType = 'admin') => {
    const sessionId = `${admin._id}-${Date.now()}`
    sessionStorage.setItem(getTokenKey(adminType), accessToken)
    clearLegacyTokenStorage(adminType)
    localStorage.setItem(getAdminDataKey(adminType), JSON.stringify(admin))
    localStorage.setItem(getSessionIdKey(adminType), sessionId)
    localStorage.setItem('currentAdminType', adminType)
    set({ admin, accessToken, isAuthenticated: true, adminType, sessionId })
  },

  setAccessToken: (accessToken, adminType = null) => {
    const type = adminType || get().adminType || 'admin'
    if (!accessToken) {
      sessionStorage.removeItem(getTokenKey(type))
      return set({ accessToken: null, isAuthenticated: false })
    }
    sessionStorage.setItem(getTokenKey(type), accessToken)
    clearLegacyTokenStorage(type)
    set({ accessToken, isAuthenticated: Boolean(get().admin) })
  },

  updateAdmin: (admin) => {
    const { adminType } = get()
    // Update both state and localStorage so avatar persists
    localStorage.setItem(getAdminDataKey(adminType), JSON.stringify(admin))
    set({ admin })
  },

  logout: (adminType = null) => {
    const type = adminType || get().adminType || 'admin'
    sessionStorage.removeItem(getTokenKey(type))
    clearLegacyTokenStorage(type)
    localStorage.removeItem(getAdminDataKey(type))
    localStorage.removeItem(getSessionIdKey(type))
    
    // Check if other admin types are still logged in
    const adminToken = sessionStorage.getItem(getTokenKey('admin'))
    const supportToken = sessionStorage.getItem(getTokenKey('support'))
    
    if (!adminToken && !supportToken) {
      localStorage.removeItem('currentAdminType')
      set({ admin: null, accessToken: null, isAuthenticated: false, adminType: null, sessionId: null })
    } else {
      // Switch to another available admin type
      const nextType = type === 'admin' && supportToken ? 'support' : 'admin'
      const token = sessionStorage.getItem(getTokenKey(nextType))
      const adminData = localStorage.getItem(getAdminDataKey(nextType))
      
      if (token && adminData) {
        localStorage.setItem('currentAdminType', nextType)
        set({
          admin: JSON.parse(adminData),
          accessToken: token,
          isAuthenticated: true,
          adminType: nextType,
        })
      }
    }
  },

  switchAdmin: (adminType) => {
    const { admin } = get()
    
    // Support staff ko switch nahi de sakta
    if (admin?.role !== 'superadmin') {
      return false
    }
    
    const token = sessionStorage.getItem(getTokenKey(adminType))
    const adminData = localStorage.getItem(getAdminDataKey(adminType))
    if (token && adminData) {
      localStorage.setItem('currentAdminType', adminType)
      set({
        admin: JSON.parse(adminData),
        accessToken: token,
        isAuthenticated: true,
        adminType,
      })
      return true
    }
    return false
  },

  initAuth: async () => {
    clearLegacyTokenStorage('admin')
    clearLegacyTokenStorage('support')

    const adminType = localStorage.getItem('currentAdminType') || 'admin'
    const token = sessionStorage.getItem(getTokenKey(adminType))
    const adminData = localStorage.getItem(getAdminDataKey(adminType))
    
    if (token && adminData) {
      try {
        const parsedAdmin = JSON.parse(adminData)
        set({
          admin: parsedAdmin,
          accessToken: token,
          isAuthenticated: true,
          adminType,
          isInitialized: true, // NEW
        })
      } catch {
        // Corrupted data, clear everything
        sessionStorage.removeItem(getTokenKey(adminType))
        localStorage.removeItem(getAdminDataKey(adminType))
        localStorage.removeItem('currentAdminType')
        set({ isInitialized: true })
      }
    } else if (adminData) {
      // Access token localStorage/sessionStorage mein persist nahi karte.
      // Page refresh pe refresh-cookie se naya token lo.
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
        const response = await fetch(`${API_URL}/admin/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          throw new Error('Refresh failed')
        }

        const payload = await response.json()
        const newToken = payload?.data?.accessToken
        if (!newToken) {
          throw new Error('No access token returned')
        }

        const parsedAdmin = JSON.parse(adminData)
        sessionStorage.setItem(getTokenKey(adminType), newToken)
        set({
          admin: parsedAdmin,
          accessToken: newToken,
          isAuthenticated: true,
          adminType,
          isInitialized: true,
        })
      } catch {
        sessionStorage.removeItem(getTokenKey(adminType))
        localStorage.removeItem(getAdminDataKey(adminType))
        localStorage.removeItem('currentAdminType')
        set({ admin: null, accessToken: null, isAuthenticated: false, adminType: null, sessionId: null, isInitialized: true })
      }
    } else {
      set({ isInitialized: true })
    }
  },

  hasPermission: (module, action) => {
    const { admin } = get()
    if (!admin) return false
    if (admin.role === 'superadmin') return true
    return admin.permissions?.[module]?.[action] === true
  },

  isSuperAdmin: () => {
    const { admin } = get()
    return admin?.role === 'superadmin'
  },

  getAvailableSessions: () => {
    const { admin, adminType } = get()
    
    // Support staff sirf apne portal dekh shakta hai
    if (admin?.role !== 'superadmin') {
      return [{ type: adminType, data: admin }]
    }
    
    // SuperAdmin ke liye dono sessions available
    const sessions = []
    const adminToken = sessionStorage.getItem(getTokenKey('admin'))
    const supportToken = sessionStorage.getItem(getTokenKey('support'))
    
    if (adminToken) {
      const adminData = localStorage.getItem(getAdminDataKey('admin'))
      if (adminData) {
        sessions.push({ type: 'admin', data: JSON.parse(adminData) })
      }
    }
    
    if (supportToken) {
      const supportData = localStorage.getItem(getAdminDataKey('support'))
      if (supportData) {
        sessions.push({ type: 'support', data: JSON.parse(supportData) })
      }
    }
    
    return sessions
  },
}))

export default useAuthStore
