import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Coffee, Settings, HelpCircle } from 'lucide-react';

const BottomNav = () => {
  const items = [
    { to: '/', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { to: '/customer', label: 'Budget', icon: <Search className="w-5 h-5" /> },
    { to: '/restaurants', label: 'Restaurants', icon: <Coffee className="w-5 h-5" /> },
    { to: '/customer/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    { to: '/help', label: 'Help', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-3xl shadow-lg px-4 py-2 z-50 w-[90%] max-w-3xl">
      <div className="flex justify-between items-center">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => `flex flex-col items-center gap-1 text-xs px-2 py-1 ${isActive ? 'text-orange-500' : 'text-gray-600'}`}>
            {it.icon}
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
