import React, { useState } from 'react'
import RegisterForm from './RegisterForm'
import LoginForm from './LoginForm'

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-2">
            BudgetBites
          </h1>
          <p className="text-gray-600 text-sm">Smart food budgeting made easy</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${
              activeTab === 'login'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${
              activeTab === 'register'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Container */}
        <div className="flex justify-center">
          {activeTab === 'login' && (
            <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
          )}
          {activeTab === 'register' && (
            <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
          )}
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-gray-500 mt-6 px-4">
          By using BudgetBites, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default AuthPage
