import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, LoginCredentials, AuthResponse } from '../types'
import { authApi } from '../services/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  loginGoogle: (token: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (roles: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const userData = localStorage.getItem('user_data')
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      const authResponse: AuthResponse = await authApi.loginLocal(credentials)
      
      localStorage.setItem('auth_token', authResponse.token)
      localStorage.setItem('user_data', JSON.stringify(authResponse.user))
      setUser(authResponse.user)
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const loginGoogle = async (token: string) => {
    try {
      setLoading(true)
      console.log('Sending token to backend:', token?.substring(0, 50) + '...')
      const authResponse: AuthResponse = await authApi.loginGoogle(token)
      
      localStorage.setItem('auth_token', authResponse.token)
      localStorage.setItem('user_data', JSON.stringify(authResponse.user))
      setUser(authResponse.user)
    } catch (error: any) {
      console.error('Google login error:', error)
      console.error('Error details:', error.response?.data)
      throw new Error(error.response?.data?.error || 'Google login failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      setUser(null)
    }
  }

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    return allowedRoles.includes(user.role)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    loginGoogle,
    logout,
    isAuthenticated: !!user,
    hasRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}