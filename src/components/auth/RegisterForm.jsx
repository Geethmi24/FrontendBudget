import React, { useState, useEffect, useId } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: 'bg-gray-200' }
  let strength = 0
  if (password.length >= 6) strength++
  if (password.length >= 10) strength++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[!@#$%^&*]/.test(password)) strength++
  if (strength <= 1) return { strength: 1, label: 'Weak', color: 'bg-red-500' }
  if (strength <= 2) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' }
  if (strength <= 3) return { strength: 3, label: 'Good', color: 'bg-blue-500' }
  return { strength: 4, label: 'Strong', color: 'bg-green-500' }
}

const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()
  const uid = useId()

  useEffect(() => {
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '', role: 'customer' })
    setError('')
    setSuccess('')
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { fullName, email, password, role } = formData
      const result = await register({ fullName, email, password, role })
      if (!result.success) {
        setError(result.message)
      } else {
        setSuccess('Registration successful. Please log in with your credentials.')
        setFormData({ fullName: '', email: '', password: '', confirmPassword: '', role: 'customer' })
        navigate('/')
      }
    } catch (err) {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg shadow-md p-5" autoComplete="off">
        <input type="text" name="___hidden_username" autoComplete="username" style={{ display: 'none' }} />
        <input type="password" name="___hidden_password" autoComplete="new-password" style={{ display: 'none' }} />

        <div className="text-center mt-4 mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Create Account</h3>
          <p className="text-xs text-gray-500">Sign up to get started</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 py-2 rounded-r text-xs flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-3 py-2 rounded-r text-xs flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              autoComplete="off"
              data-lpignore="true"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-email`} className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id={`${uid}-email`}
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="off"
              data-lpignore="true"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id={`${uid}-password`}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="off"
              data-lpignore="true"
              className="w-full px-2.5 py-1.5 pr-8 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition-all"
              placeholder="Min. 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600 transition-colors p-0.5"
            >
              {showPassword ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M15.171 11.586a4 4 0 11-5.757-5.757l5.757 5.757z" />
                </svg>
              )}
            </button>
          </div>
          {formData.password && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-600">Strength</span>
                <span className="font-semibold text-gray-700">{getPasswordStrength(formData.password).label}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${getPasswordStrength(formData.password).color}`}
                  style={{ width: `${(getPasswordStrength(formData.password).strength / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="off"
              data-lpignore="true"
              className="w-full px-2.5 py-1.5 pr-8 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 transition-all"
              placeholder="Re-enter password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600 transition-colors p-0.5"
            >
              {showConfirmPassword ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M15.171 11.586a4 4 0 11-5.757-5.757l5.757 5.757z" />
                </svg>
              )}
            </button>
          </div>
          {formData.confirmPassword && (
            <div className="mt-1 text-xs">
              {formData.password === formData.confirmPassword ? (
                <div className="flex items-center text-green-600 gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Match
                </div>
              ) : (
                <div className="flex items-center text-red-600 gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Mismatch
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Type</label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'customer' }))}
              className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${formData.role === 'customer' ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'restaurant_owner' }))}
              className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${formData.role === 'restaurant_owner' ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Restaurant
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 text-xs"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </>
          ) : (
            'Create Account'
          )}
        </button>

        <div className="relative flex items-center my-2">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-2 text-xs text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full bg-white border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold py-2 px-3 rounded-md transition-colors text-xs"
        >
          Sign In
        </button>
      </form>
    </div>
  )
}

export default RegisterForm