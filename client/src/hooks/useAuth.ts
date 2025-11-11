
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import type { User, LoginRequest, RegisterRequest, AcceptInviteRequest } from '@shared/types'
import { api } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  acceptInvite: (data: AcceptInviteRequest) => Promise<void>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const currentUser = await api.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch CSRF token on mount
    api.fetchCsrfToken().then(() => {
      fetchUser()
    })
  }, [])

  const login = async (data: LoginRequest) => {
    const user = await api.login(data)
    setUser(user)
  }

  const register = async (data: RegisterRequest) => {
    const user = await api.register(data)
    setUser(user)
  }

  const acceptInvite = async (data: AcceptInviteRequest) => {
    const user = await api.acceptInvite(data)
    setUser(user)
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  const refetch = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, acceptInvite, logout, refetch }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}