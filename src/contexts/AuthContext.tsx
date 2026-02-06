 import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authService.getMe()
        .then(response => {
          setUser(response.data)
        })
        .catch(() => {
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
    const response = await authService.login(email, password)
    if (response.success) {
      const { user, token } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
      return response
    }
    return response
  }

  const updateUser = (updatedUser) => {
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (e) {}
    setUser(updatedUser)
  }

  const register = async (userData) => {
    const response = await authService.register(userData)
    // Do NOT auto-login after registration. Return the response so the UI
    // can redirect the user to the login page and prompt them to sign in.
    // Keeping registration separate from authentication avoids unexpected
    // automatic navigation to dashboards immediately after signing up.
    return response
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('customerSelectedDistrict')
    localStorage.removeItem('customerDistrictConfirmed')
    localStorage.removeItem('selectedDistrict')
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}