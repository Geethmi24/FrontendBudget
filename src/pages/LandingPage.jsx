 import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import AuthModal from '../components/auth/AuthModal';

// Scroll animation hook
const useScrollAnimations = () => {
  useEffect(() => {
    const styleId = 'landing-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
        .opacity-0 { opacity: 0; }
      `;
      document.head.appendChild(style);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp');
          } else {
            entry.target.classList.remove('animate-fadeInUp');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      el.classList.add('opacity-0');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
};

const LandingPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const { user } = useAuth();
  const { isAuthModalOpen, setIsAuthModalOpen, authModalTab, setAuthModalTab } = useAuthModal();
  useScrollAnimations();

  // Check if admin is logged in (via separate auth system)
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    window.location.href = '/admin';
    return null;
  }

  if (user) {
    const dashboardLink = user.role === 'admin' ? '/admin' : 
                         user.role === 'restaurant_owner' ? '/restaurant' : '/customer';
    window.location.href = dashboardLink;
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden min-h-[90vh] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="food vedio.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-block animate-on-scroll opacity-0" style={{ animationDelay: '0.1s' }}>
                <span className="bg-orange-500/20 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
                  🍽️ Sri Lanka's #1 Food Budget Platform
                </span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-orange-50 mb-6 animate-on-scroll opacity-0" style={{ animationDelay: '0.2s' }}>
                Find Delicious Meals That{' '}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Fit Your Budget
                </span>
              </h1>
              
              <p className="text-xl text-orange-50 mb-8 max-w-lg animate-on-scroll opacity-0" style={{ animationDelay: '0.3s' }}>
                Discover amazing food that fits your budget. From street food to fine dining, 
                find the perfect meal without breaking the bank.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-on-scroll opacity-0" style={{ animationDelay: '0.4s' }}>
                <Link 
                  to="/meals" 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
                >
                  Explore About
                  <span className="ml-2">→</span>
                </Link>
                <Link 
                  to="/restaurants" 
                  className="border-2 border-orange-500 text-orange-500 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-500 hover:text-white transition-all duration-300"
                >
                  Find Restaurants
                </Link>
              </div>
              
              <div className="flex items-center space-x-8 pt-4 animate-on-scroll opacity-0" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 border-2 border-white/50"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 border-2 border-white/50"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 border-2 border-white/50"></div>
                  </div>
                  <span className="text-sm text-orange-50 font-medium">1000+ Happy Users</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-yellow-400">★</span>
                  <span className="text-yellow-400">★</span>
                  <span className="text-yellow-400">★</span>
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm text-orange-50 font-medium ml-2">4.9/5 Rating</span>
                </div>
              </div>
            </div>

            {/* Right Content - Budget Summary Card (replaces embedded auth forms) */}
            <div className="relative animate-on-scroll opacity-0" style={{ animationDelay: '0.6s' }}>
              <div className="relative bg-gradient-to-br from-orange-500/30 to-amber-500/30 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
                <div className="bg-black/40 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-200 font-medium">Your Budget:</span>
                    <span className="text-3xl font-bold text-white">LKR 500</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { emoji: '🍛', name: 'Rice & Curry', place: 'Sri Lankan Spice House', price: '450' },
                      { emoji: '🥘', name: 'Kottu Rotti', place: 'Beach Side Eats', price: '380' },
                      { emoji: '🍤', name: 'Seafood Fried Rice', place: 'Ocean View', price: '490' }
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="bg-white/10 p-4 rounded-xl flex items-center space-x-3 hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                          {item.emoji}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-sm text-orange-200">{item.place}</p>
                        </div>
                        <span className="text-orange-300 font-bold text-lg">LKR {item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-on-scroll opacity-0">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Why Choose BudgetBites?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We combine smart budgeting with local flavor to deliver the best dining experience in Sri Lanka.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: '💰', title: 'Budget Friendly', desc: 'Find meals that fit your budget with our smart filtering system' },
              { emoji: '🍽️', title: 'Variety of Cuisines', desc: 'Explore diverse food options from local restaurants' },
              { emoji: '⭐', title: 'Verified Reviews', desc: 'Make informed decisions with authentic customer reviews' },
              { emoji: '📱', title: 'Easy Access', desc: 'Find restaurants and meals with just a few clicks' }
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 animate-on-scroll opacity-0"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-lg">
                  {feature.emoji}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

       {/* How It Works */}
<section className="py-20 bg-white relative overflow-hidden px-4">
  <div className="absolute inset-0 z-0">
    <video
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover"
    >
      <source src="drink1.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
    <div className="absolute inset-0 bg-white/20"></div>
  </div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="text-center mb-16 animate-on-scroll opacity-0">
      <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
      <p className="text-xl text-gray-900">Simple steps to find your perfect meal</p>
    </div>
    <div className="grid md:grid-cols-3 gap-8">
      {[
        { emoji: '🔍', title: 'Enter Your Budget', desc: 'Tell us how much you want to spend on your meal today.' },
        { emoji: '🍽️', title: 'Browse Options', desc: 'See all meals and restaurants that fit within your budget.' },
        { emoji: '📍', title: 'Visit & Enjoy', desc: 'Head to your chosen restaurant and enjoy delicious food!' }
      ].map((step, i) => (
        <div
          key={i}
          className="text-center space-y-4 p-8 rounded-2xl hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 transform hover:-translate-y-2 transition-all duration-300 animate-on-scroll opacity-0 relative"
          style={{ animationDelay: `${i * 200}ms` }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 text-3xl">
            {step.emoji}
          </div>
          <div className="relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              {i + 1}
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 pt-4">{step.title}</h3>
          <p className="text-gray-900 leading-relaxed">{step.desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>

      {/* Stats Section */}
      <section className="py-16 bg-white px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-on-scroll opacity-0">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">“Experience the Best with BudgetBites”</h2>
            <p className="text-xl text-gray-600">The smart way to dine in Sri Lanka</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: '🏪', value: '50+', label: 'Restaurants', color: 'text-orange-600' },
              { emoji: '👥', value: '1000+', label: 'Users', color: 'text-amber-600' },
              { emoji: '⏱️', value: 'Real-time', label: 'Updates', color: 'text-orange-600' },
              { emoji: '⭐', value: '4.9★', label: 'Rating', color: 'text-amber-600' }
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 group animate-on-scroll opacity-0"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="text-5xl mx-auto mb-4">{stat.emoji}</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Restaurant Owners */}
      <section className="py-16 bg-gradient-to-br from-orange-500 to-amber-500 text-white relative overflow-hidden px-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-on-scroll opacity-0">
              <h2 className="text-4xl font-bold">For Restaurant Owners</h2>
              <p className="text-xl text-orange-100 leading-relaxed">
                Join BudgetBites and reach budget-conscious customers in Sri Lanka.
                List your menu, manage your restaurant, and grow your business.
              </p>
              <ul className="space-y-4">
                {[
                  'Easy restaurant and menu management',
                  'Reach more customers actively looking for meals',
                  'Free to list your restaurant',
                  'Real-time analytics and insights'
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start space-x-3 animate-on-scroll opacity-0"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <span className="text-xl mt-1">🛡️</span>
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setAuthModalTab('register')
                  setIsAuthModalOpen(true)
                }}
                className="bg-white text-orange-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 inline-flex items-center group"
              >
                Register Restaurant Owner
                <span className="ml-2">→</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { emoji: '🔍', value: '500+', label: 'Daily Searches' },
                { emoji: '🏪', value: '50+', label: 'Restaurants' },
                { emoji: '⭐', value: '4.8★', label: 'Average Rating' },
                { emoji: '👥', value: '1000+', label: 'Happy Users' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/20 backdrop-blur-md rounded-2xl p-6 space-y-3 hover:bg-white/30 transform hover:-translate-y-2 transition-all duration-300 animate-on-scroll opacity-0"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="text-4xl">{item.emoji}</div>
                  <div className="text-4xl font-bold">{item.value}</div>
                  <div className="text-orange-100 font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-on-scroll opacity-0">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Real reviews from real customers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Kasun Perera', role: 'Regular Customer', text: '"BudgetBites has completely changed how I discover restaurants. I can now eat out without worrying about my budget!"', avatar: '👨' },
              { name: 'Nimali Silva', role: 'Food Enthusiast', text: '"Amazing platform! Found so many hidden gems that fit my budget perfectly. Highly recommended!"', avatar: '👩' },
              { name: 'Rajith Fernando', role: 'Restaurant Owner', text: '"As a restaurant owner, BudgetBites has helped us reach more customers. The platform is easy to use!"', avatar: '👨‍🍳' }
            ].map((review, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 animate-on-scroll opacity-0"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-3xl shadow-lg">
                    {review.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{review.name}</h4>
                    <p className="text-sm text-gray-600">{review.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        activeTab={authModalTab}
        onTabChange={setAuthModalTab}
      />
    </div>
  );
}

export default LandingPage;