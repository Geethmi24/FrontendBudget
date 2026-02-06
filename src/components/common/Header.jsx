import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext'
import AuthModal from '../auth/AuthModal'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isAuthModalOpen, setIsAuthModalOpen, authModalTab, setAuthModalTab } = useAuthModal()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const adminToken = localStorage.getItem('adminToken')
  const isAdminLoggedIn = !!adminToken

  const handleLogout = () => {
    if (isAdminLoggedIn) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      navigate('/')
    } else {
      logout()
      navigate('/')
    }
  }

  const getDashboardLink = () => {
    if (isAdminLoggedIn) return '/admin'
    if (!user) return null
    switch (user.role) {
      case 'admin':
        return '/admin'
      case 'restaurant_owner':
        return '/restaurant'
      default:
        return '/customer'
    }
  }

  return (
    <header className="bg-black/80 backdrop-blur-sm shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍽️</span>
            </div>
            <span className="text-2xl font-bold text-white">  BudgetBites</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-white hover:text-orange-300 transition-colors">
              Home
            </Link>
            <Link to="/restaurants" className="text-white hover:text-orange-300 transition-colors">
              Restaurants
            </Link>
            <Link to="/meals" className="text-white hover:text-orange-300 transition-colors">
              About
            </Link>
            
            {user || isAdminLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to={getDashboardLink()} 
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-white hover:text-orange-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => {
                    setAuthModalTab('login')
                    setIsAuthModalOpen(true)
                  }}
                  className="text-gray-600 hover:text-orange-500 transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => {
                    setAuthModalTab('register')
                    setIsAuthModalOpen(true)
                  }}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-6 h-0.5 bg-gray-600 mb-1.5"></div>
            <div className="w-6 h-0.5 bg-gray-600 mb-1.5"></div>
            <div className="w-6 h-0.5 bg-gray-600"></div>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-gray-600 hover:text-orange-500">Home</Link>
              <Link to="/restaurants" className="text-gray-600 hover:text-orange-500">Restaurants</Link>
              <Link to="/meals" className="text-gray-600 hover:text-orange-500">About</Link>
              {user && (
                <>
                  <Link to={getDashboardLink()} className="text-gray-600 hover:text-orange-500">
                    Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-left text-gray-600 hover:text-orange-500"
                  >
                    Logout
                  </button>
                </>
              )}
              {!user && (
                <>
                  <button
                    onClick={() => {
                      setAuthModalTab('login')
                      setIsAuthModalOpen(true)
                      setIsMenuOpen(false)
                    }}
                    className="text-left text-gray-600 hover:text-orange-500"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalTab('register')
                      setIsAuthModalOpen(true)
                      setIsMenuOpen(false)
                    }}
                    className="text-left text-gray-600 hover:text-orange-500"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          activeTab={authModalTab}
          onTabChange={setAuthModalTab}
        />
      </div>
    </header>
  )
}

export default Header