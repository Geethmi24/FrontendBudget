import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">B</span>
              </div>
              <span className="text-xl font-bold">BudgetBites</span>
            </Link>
            <p className="text-gray-300 mb-4 max-w-md">
              Discover delicious meals that fit your budget. BudgetBites connects food lovers with affordable dining options in their area.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/restaurants" className="text-gray-300 hover:text-white transition-colors">Restaurants</Link></li>
              <li><Link to="/meals" className="text-gray-300 hover:text-white transition-colors">Meals</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300">
              <li>Email: support@budgetbites.com</li>
              <li>Phone: +94 77 123 4567</li>
              <li>Matara, Sri Lanka</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-300">
          <p>&copy; 2024 BudgetBites. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer