import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage on mount
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    try {
      console.log('Login attempt with:', { username: credentials.username })
      const response = await api.post('/api/auth/login', credentials)
      console.log('Login response:', response.data)
      
      if (response.data.success) {
        const { access_token, user: userData } = response.data.data
        setToken(access_token)
        setUser(userData)
        localStorage.setItem('token', access_token)
        localStorage.setItem('user', JSON.stringify(userData))
        console.log('Login successful, user:', userData)
        return true
      }
      console.log('Login failed: response not successful')
      return false
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response?.data)
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
