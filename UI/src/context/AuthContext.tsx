import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiHandleUrl } from '../config/api'

export interface UserSession {
  id: string
  name: string
  email: string
  role: 'organization' | 'user'
  organization_id?: string
  organization_name?: string
  phone_number?: string
}

interface AuthContextType {
  user: UserSession | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, role: 'organization' | 'user') => Promise<void>
  logout: () => void
  requestOrgSignupOtp: (data: any) => Promise<any>
  verifyOrgSignupOtp: (email: string, otpCode: string) => Promise<any>
  requestUserSignupOtp: (data: any) => Promise<any>
  verifyUserSignupOtp: (email: string, otpCode: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('stack360_token'))
  const [loading, setLoading] = useState<boolean>(true)

  // Verify token on load
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('stack360_token')
      if (!storedToken) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(apiHandleUrl('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        })

        if (response.ok) {
          const payload = await response.json()
          setUser({
            id: payload.id,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            organization_id: payload.organization_id,
            organization_name: payload.organization_name,
            phone_number: payload.phone_number
          })
          setToken(storedToken)
        } else {
          // Token is invalid/expired
          localStorage.removeItem('stack360_token')
          setToken(null)
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to verify token:', error)
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [])

  const login = async (email: string, password: string, role: 'organization' | 'user') => {
    const response = await fetch(apiHandleUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, role })
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.detail || 'Login failed')
    }

    const data = await response.json()
    localStorage.setItem('stack360_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('stack360_token')
    setToken(null)
    setUser(null)
  }

  const requestOrgSignupOtp = async (data: any) => {
    const response = await fetch(apiHandleUrl('/api/auth/organization/signup-otp'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const resData = await response.json()
    if (!response.ok) {
      throw new Error(resData.detail || 'Failed to send OTP')
    }
    return resData
  }

  const verifyOrgSignupOtp = async (email: string, otpCode: string) => {
    const response = await fetch(apiHandleUrl('/api/auth/organization/verify-otp'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, otp_code: otpCode })
    })

    const resData = await response.json()
    if (!response.ok) {
      throw new Error(resData.detail || 'OTP verification failed')
    }
    return resData
  }

  const requestUserSignupOtp = async (data: any) => {
    const response = await fetch(apiHandleUrl('/api/auth/user/signup-otp'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const resData = await response.json()
    if (!response.ok) {
      throw new Error(resData.detail || 'Failed to send OTP')
    }
    return resData
  }

  const verifyUserSignupOtp = async (email: string, otpCode: string) => {
    const response = await fetch(apiHandleUrl('/api/auth/user/verify-otp'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, otp_code: otpCode })
    })

    const resData = await response.json()
    if (!response.ok) {
      throw new Error(resData.detail || 'OTP verification failed')
    }
    return resData
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        requestOrgSignupOtp,
        verifyOrgSignupOtp,
        requestUserSignupOtp,
        verifyUserSignupOtp
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
