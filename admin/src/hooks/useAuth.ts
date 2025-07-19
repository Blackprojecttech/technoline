import { useState, useEffect } from 'react'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin' | 'moderator'
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Проверяем токен на сервере
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Token invalid')
        }
        return res.json()
      })
      .then(data => {
        if (data._id && (data.role === 'admin' || data.role === 'moderator')) {
          setIsAuthenticated(true)
          setUser(data)
        } else {
          localStorage.removeItem('admin_token')
        }
      })
      .catch((error) => {
        console.log('Auth check error:', error)
        localStorage.removeItem('admin_token')
      })
      .finally(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      console.log('Login response:', data)
      if (response.ok && data.token && (data.role === 'admin' || data.role === 'moderator')) {
        localStorage.setItem('admin_token', data.token)
        setIsAuthenticated(true)
        setUser(data)
        console.log('Login successful, user authenticated')
        return { success: true }
      } else {
        console.log('Login failed:', data.message)
        return { success: false, message: data.message || 'Ошибка входа' }
      }
    } catch (error) {
      return { success: false, message: 'Ошибка сети' }
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setUser(null)
  }

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout
  }
} 