import React, { useEffect, useRef, useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

const AuthModal = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const modalRef = useRef(null)
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    const computePosition = () => {
      const hero = document.getElementById('hero')
      if (!hero) {
        setPosition(null)
        return
      }

      const rect = hero.getBoundingClientRect()
      const top = rect.top + window.scrollY + rect.height / 2
      const left = rect.left + rect.width / 2
      setPosition({ top, left })
    }

    // compute immediately
    computePosition()

    // update on resize/scroll to keep modal positioned over hero
    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition)
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop blur overlay (full viewport) */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal container (keeps pointer-events none to allow backdrop clicks) */}
      <div className="fixed inset-0 z-50 p-4 pointer-events-none">
        {/* Modal box — positioned over hero center when possible, otherwise center of viewport */}
        <div
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md pointer-events-auto relative transition-all"
          style={position ? {
            position: 'absolute',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -50%)'
          } : {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              className={`flex-1 py-3 font-semibold text-lg ${
                activeTab === 'login'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500'
              }`}
              onClick={() => onTabChange('login')}
            >
              Login
            </button>
            <button
              className={`flex-1 py-3 font-semibold text-lg ${
                activeTab === 'register'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500'
              }`}
              onClick={() => onTabChange('register')}
            >
              Register
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'login' ? (
            <LoginForm onSwitchToRegister={() => onTabChange('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => onTabChange('login')} />
          )}
        </div>
      </div>
    </>
  )
}

export default AuthModal

