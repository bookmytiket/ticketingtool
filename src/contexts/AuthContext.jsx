import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth token and validate
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (token && storedUser) {
      // Check if it's a demo token
      if (token.startsWith('demo-token-')) {
        setUser(JSON.parse(storedUser))
        setLoading(false)
        return
      }

      // Validate token by fetching current user
      authAPI.getMe()
        .then((userData) => {
          setUser(userData)
        })
        .catch(() => {
          // Token invalid, clear storage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    // Demo accounts logic
    const demoUsers = {
      'admin@demo.com': {
        id: 'demo-admin-id',
        name: 'Demo Admin',
        email: 'admin@demo.com',
        role: 'admin',
        status: 'active'
      },
      'tech@demo.com': {
        id: 'demo-tech-id',
        name: 'Demo Technician',
        email: 'tech@demo.com',
        role: 'technician',
        status: 'active'
      },
      'user@demo.com': {
        id: 'demo-user-id',
        name: 'Demo User',
        email: 'user@demo.com',
        role: 'user',
        status: 'active'
      }
    }

    if (demoUsers[email] && password === email.split('@')[0] + '123') {
      const user = demoUsers[email]
      const token = `demo-token-${user.role}`

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)

      return { token, user, mfaRequired: false }
    }

    try {
      const response = await authAPI.login(email, password)

      // Only store token and user if MFA is not required
      if (!response.mfaRequired) {
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        setUser(response.user)
      }

      // Return full response (including tempToken if MFA required)
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

