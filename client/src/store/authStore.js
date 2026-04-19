import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      pendingVerification: null,

      login: ({ user, token }) => {
        set({ user, token, isAuthenticated: Boolean(token && user) })
      },

      setToken: (token) => {
        set({ token, isAuthenticated: Boolean(token && get().user) })
      },

      setPendingVerification: (payload) => {
        set({ pendingVerification: payload })
      },

      updateUser: (partial) => {
        const current = get().user || {}
        set({ user: { ...current, ...partial } })
      },

      setCredits: (credits) => {
        const current = get().user || {}
        set({ user: { ...current, chatCredits: credits } })
      },

      clearPendingVerification: () => {
        set({ pendingVerification: null })
      },

      logout: (clearStorage = true) => {
        set({ user: null, token: null, isAuthenticated: false, pendingVerification: null })
        if (clearStorage) {
          localStorage.removeItem('lexioai-auth')
        }
      },

      isPlanActive: () => {
        const user = get().user
        if (!user?.planExpiry) {
          return user?.plan === 'free'
        }
        return new Date(user.planExpiry).getTime() > Date.now()
      },

      isPaidPlan: () => {
        const plan = get().user?.plan
        return Boolean(plan && plan !== 'free')
      },

      planLabel: () => {
        const plan = get().user?.plan || 'free'
        return plan.charAt(0).toUpperCase() + plan.slice(1)
      },
    }),
    {
      name: 'lexioai-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        pendingVerification: state.pendingVerification,
      }),
    },
  ),
)

export default useAuthStore
