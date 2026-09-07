import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: any | null
  organizationId: string | null
  setAuth: (token: string, user: any, orgId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      organizationId: null,
      setAuth: (token, user, orgId) => set({ token, user, organizationId: orgId }),
      logout: () => set({ token: null, user: null, organizationId: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
