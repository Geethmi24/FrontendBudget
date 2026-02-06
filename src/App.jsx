 import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModalProvider } from './contexts/AuthModalContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';

// Pages
import LandingPage from './pages/LandingPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import RestaurantList from './pages/customer/RestaurantList';
import ResultRestaurant from './pages/customer/ResultRestaurant';
import MapPage from './pages/customer/MapPage';
import ReviewPage from './pages/customer/ReviewPage';
import MealList from './pages/customer/MealList';
import CustomerSettings from './pages/customer/CustomerSettings';
import Help from './pages/customer/Help';
import BottomNav from './components/common/BottomNav';

function App() {
  const Layout = () => {
    const loc = useLocation();
    const hideBottom = loc && (
      ['/','/restaurants','/meals','/customer','/restaurant','/restaurant-result','/map','/admin'].includes(loc.pathname)
      || String(loc.pathname || '').startsWith('/review')
    );

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/restaurant" element={<RestaurantDashboard />} />
            <Route path="/restaurants" element={<RestaurantList />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/restaurant-result" element={<ResultRestaurant />} />
            <Route path="/review/:restaurantId/:orderId" element={<ReviewPage />} />
            <Route path="/meals" element={<MealList />} />
            <Route path="/customer/settings" element={<CustomerSettings />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </main>
        <Footer />
        {!hideBottom && <BottomNav />}
      </div>
    );
  };

  return (
    <AuthProvider>
      <AuthModalProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout />
        </Router>
      </AuthModalProvider>
    </AuthProvider>
  );
}

export default App;
