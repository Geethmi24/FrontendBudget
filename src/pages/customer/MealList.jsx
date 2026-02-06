import React from 'react';
import { Users, Store, Utensils, Clock, MapPin, TrendingUp, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuthModal } from '../../contexts/AuthModalContext';

const MealList = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalTab, setAuthModalTab } = useAuthModal();

  const handleCustomerSignUp = () => {
    setAuthModalTab('register');
    setIsAuthModalOpen(true);
  };

  const handleOwnerSignUp = () => {
    setAuthModalTab('register');
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50 to-amber-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">🍽️ Welcome to BudgetBites</h1>
          <p className="text-xl opacity-90">Find delicious meals that fit your budget, supported by restaurants that care</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* What is BudgetBites */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">What is BudgetBites?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              BudgetBites is a platform that connects hungry customers with delicious, affordable meals from local restaurants. 
              Set your budget, find your favorite food, and enjoy amazing dining experiences without breaking the bank.
            </p>
          </div>
        </section>

        {/* For Customers Section */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold">For Customers</h2>
              <p className="text-blue-100 mt-2">Smart dining within your budget</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* How to Use */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Zap className="w-6 h-6 text-blue-500 mr-2" />
                    How to Get Started
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Register or Login</h4>
                        <p className="text-gray-600 text-sm">Create your customer account or login to your existing profile</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Set Your Budget</h4>
                        <p className="text-gray-600 text-sm">Enter your budget amount and select your preferred district</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Browse Restaurants</h4>
                        <p className="text-gray-600 text-sm">Discover restaurants with meals that fit your budget</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">4</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Place Your Order</h4>
                        <p className="text-gray-600 text-sm">Select your favorite meals and place an order</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">5</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Collect Your Order</h4>
                        <p className="text-gray-600 text-sm">Collect your completed order within 2 hours of completion</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">6</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Leave a Review</h4>
                        <p className="text-gray-600 text-sm">Share your experience and help other customers find great food</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                    Key Features
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        Budget-Filtered Search
                      </h4>
                      <p className="text-gray-600 text-sm">Find meals that exactly match your budget constraints</p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        2-Hour Collection Window
                      </h4>
                      <p className="text-gray-600 text-sm">Orders must be collected within 2 hours. Collection deadline shown in your order PDF</p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                        Review System
                      </h4>
                      <p className="text-gray-600 text-sm">Rate and review meals and restaurants to help the community</p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Utensils className="w-4 h-4 mr-2 text-blue-500" />
                        Order History
                      </h4>
                      <p className="text-gray-600 text-sm">Track all your orders and reorder your favorites</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Restaurant Owners Section */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-12 text-center">
              <Store className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold">For Restaurant Owners</h2>
              <p className="text-green-100 mt-2">Grow your business and reach budget-conscious customers</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* How to Use */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Zap className="w-6 h-6 text-green-500 mr-2" />
                    How to Get Started
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Register as Owner</h4>
                        <p className="text-gray-600 text-sm">Create a restaurant owner account with your restaurant details</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Create Restaurant Profile</h4>
                        <p className="text-gray-600 text-sm">Add restaurant name, location, cuisine type, and contact information</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Add Menu Items</h4>
                        <p className="text-gray-600 text-sm">Create meal listings with prices, descriptions, and discounts</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">4</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Receive Orders</h4>
                        <p className="text-gray-600 text-sm">Get customer orders in your dashboard with real-time notifications</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">5</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Process Orders</h4>
                        <p className="text-gray-600 text-sm">Approve, process, and mark orders as completed</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">6</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Track Performance</h4>
                        <p className="text-gray-600 text-sm">View analytics, customer reviews, and orders history</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                    Platform Features
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Utensils className="w-4 h-4 mr-2 text-green-500" />
                        Menu Management
                      </h4>
                      <p className="text-gray-600 text-sm">Easily add, edit, and manage your restaurant menu items</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Clock className="w-4 h-4 mr-2 text-green-500" />
                        2-Hour Collection Policy
                      </h4>
                      <p className="text-gray-600 text-sm">Orders automatically cancelled if not collected within 2 hours. Full notification system for updates</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                        Order Dashboard
                      </h4>
                      <p className="text-gray-600 text-sm">Real-time order management with status tracking and notifications</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Users className="w-4 h-4 mr-2 text-green-500" />
                        Customer Reviews
                      </h4>
                      <p className="text-gray-600 text-sm">Receive ratings and feedback to improve your restaurant</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Highlight */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Why Choose BudgetBites?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Affordable Dining</h3>
              <p className="text-gray-600">Access delicious meals from quality restaurants that fit your budget perfectly</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Local First</h3>
              <p className="text-gray-600">Support local restaurants in your community and discover neighborhood gems</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Quick Turnaround</h3>
              <p className="text-gray-600">Orders completed within 2 hours, ensuring fresh meals delivered quickly</p>
            </div>

          </div>
        </section>

        {/* How It Works Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-12 border-2 border-purple-200">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">The BudgetBites Experience</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-500 mb-4">1</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Budget-Conscious</h3>
                <p className="text-gray-600">Set your budget and find restaurants that match your price point</p>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold text-purple-500 mb-4">2</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Fresh & Quality</h3>
                <p className="text-gray-600">Get freshly prepared meals from verified local restaurants</p>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold text-purple-500 mb-4">3</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Community-Driven</h3>
                <p className="text-gray-600">Read reviews and share your experience with fellow food lovers</p>
              </div>

            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Join BudgetBites?</h2>
            <p className="text-lg opacity-90 mb-8">Start exploring affordable, delicious meals or grow your restaurant business today</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleCustomerSignUp}
                className="bg-white text-orange-600 font-bold py-3 px-8 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                <span>For Customers</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={handleOwnerSignUp}
                className="border-2 border-white text-white font-bold py-3 px-8 rounded-lg hover:bg-white hover:text-orange-600 transition-colors flex items-center justify-center gap-2">
                <span>For Restaurant Owners</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Footer Info */}
      <div className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-300">© 2026 BudgetBites. Making quality dining affordable for everyone.</p>
          <p className="text-gray-400 text-sm mt-2">Supporting local restaurants, one delicious meal at a time.</p>
        </div>
      </div>
    </div>
  );
};

export default MealList;