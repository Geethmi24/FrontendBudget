 import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, TrendingUp, Clock, Star, ChevronRight, Flame, Award, Heart, Map, User } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { mealService } from '../../services/mealService'
import api from '../../services/api'
import { authService } from '../../services/authService'
import DistrictSelector from '../../components/DistrictSelector';

const CustomerDashboard = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [rejectedDistrict, setRejectedDistrict] = useState(false);
  const [districtConfirmed, setDistrictConfirmed] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const selectRef = useRef(null);
  const [userCoords, setUserCoords] = useState(null);
  const [offers, setOffers] = useState([]);
  const [recentViewed, setRecentViewed] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState(null);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  // Profile form state (auto-filled from registration/user data)
  const [profile, setProfile] = useState({ fullName: '', email: '', password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState({ restaurantsCount: 0, customersCount: 0, averageRating: 0, totalRatings: 0 });

  const categories = [
    { name: "Rice", icon: "🍚", color: "bg-amber-100 hover:bg-amber-200" },
    { name: "Kottu", icon: "🍜", color: "bg-orange-100 hover:bg-orange-200" },
    { name: "Short Eats", icon: "🥟", color: "bg-yellow-100 hover:bg-yellow-200" },
    { name: "Fast Food", icon: "🍔", color: "bg-red-100 hover:bg-red-200" },
    { name: "Desserts", icon: "🍰", color: "bg-pink-100 hover:bg-pink-200" },
    { name: "Drinks", icon: "🥤", color: "bg-blue-100 hover:bg-blue-200" },
  ];

  const nearbyRestaurants = [
    { name: "Sunflower's Kitchen", distance: "0.5 km", price: 150, rating: 4.8, popular: true },
    { name: "Fresh Bites", distance: "1.1 km", price: 200, rating: 4.6 },
    { name: "Tasty Treat", distance: "1.7 km", price: 250, rating: 4.5 }
  ];
  const fetchRecommendedMeals = () => {
    setLoading(true);
    // Simulated meal data
    setTimeout(() => {
      setMeals([
        { _id: "1", name: "Chicken Fried Rice", description: "Delicious fried rice with tender chicken pieces", price: 250, category: "Rice" },
        { _id: "2", name: "Cheese Kottu", description: "Spicy kottu with extra cheese", price: 350, category: "Kottu" },
        { _id: "3", name: "Veggie Burger", description: "Healthy vegetarian burger with fresh veggies", price: 180, category: "Fast Food" },
        { _id: "4", name: "Fish Bun", description: "Fresh fish bun, perfect for snacking", price: 80, category: "Short Eats" },
        { _id: "5", name: "Chocolate Cake", description: "Rich chocolate cake slice", price: 200, category: "Desserts" },
        { _id: "6", name: "Mango Juice", description: "Fresh mango juice", price: 150, category: "Drinks" },
      ]);
      setLoading(false);
    }, 800);
  };

  async function loadLocations(budgetFilter) {
    try {
      // If a budget is provided, prefer the menus-based locations endpoint
      if (budgetFilter) {
        const resp = await api.get(`/menus/locations/budget/${Number(budgetFilter)}`);
        const data = resp?.data?.data || resp?.data || [];
        const arr = Array.isArray(data) ? data : [];
        setLocations(arr);

        // Resolve full restaurant objects for the filtered locations so MapPage can display them
        try {
          const ids = arr.map(a => a.value).filter(Boolean);
          const isObjectId = (s) => /^[0-9a-fA-F]{24}$/.test(String(s));
          const validIds = ids.filter(isObjectId);
          if (validIds.length > 0) {
            const promises = validIds.map(id => api.get(`/restaurants/${id}`).then(r => r.data && r.data.data ? r.data.data.restaurant : r.data).catch(() => null));
            const restaurants = (await Promise.all(promises)).filter(Boolean);
            setFilteredRestaurants(restaurants);
          } else {
            setFilteredRestaurants([]);
          }
        } catch (e) {
          console.warn('Failed to resolve restaurants for locations', e);
          setFilteredRestaurants([]);
        }

        // When budget is provided, only return budget-matching locations (no fallback)
        return arr;
      }

      // Fallback: list restaurants and map to options
      const rresp = await api.get('/restaurants?limit=1000');
      const rdata = rresp?.data?.data || rresp?.data || [];
      const list = Array.isArray(rdata) ? rdata : (rdata.data || []);
      const opts = list.map(r => ({
        value: r._id || r.id,
        label: `${r.name}${r.location ? ' — ' + r.location : (r.address && (r.address.street || r.address.city) ? ' — ' + (r.address.street || r.address.city) : '')}`,
        loc: r.location || (r.address && (r.address.street || r.address.city)) || ''
      }));
      setLocations(opts);
      return opts;
    } catch (e) {
      console.error('loadLocations failed', e);
      setLocations([]);
      return [];
    }
  }

  useEffect(() => {
    fetchRecommendedMeals();
    loadRecentViewed();
    loadOffers();
    loadFavorites();
    // Prefill profile from auth user when available
    if (user) {
      setProfile({ fullName: user.fullName || '', email: user.email || '', password: '' });
    }

    // load site stats
    (async () => {
      try {
        const resp = await api.get('/stats');
        const d = resp && resp.data && resp.data.data ? resp.data.data : resp.data || resp;
        if (d) setStats({ restaurantsCount: d.restaurantsCount || 0, customersCount: d.customersCount || 0, averageRating: d.averageRating || 0, totalRatings: d.totalRatings || 0 });
      } catch (e) {
        console.warn('Failed to load stats', e);
      }
    })();
    try {
      const d = localStorage.getItem('customerSelectedDistrict');
      const confirmed = localStorage.getItem('customerDistrictConfirmed');
      if (d) {
        setSelectedDistrict(d);
        setRejectedDistrict(d !== 'Matara');
        setDistrictConfirmed(confirmed === 'true' && d === 'Matara');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (user) setProfile({ fullName: user.fullName || '', email: user.email || '', password: '' });
  }, [user]);

  // When budget changes, pre-load matching locations so we can hide the field
  useEffect(() => {
    if (budget) {
      loadLocations(Number(budget));
    } else {
      setLocations([]);
      setSelectedRestaurantId(null);
      setLocation('');
    }
  }, [budget]);

  const loadRecentViewed = () => {
    const stored = [
      { _id: "7", name: "Egg Roti", price: 120 },
      { _id: "8", name: "Pasta", price: 280 },
    ];
    setRecentViewed(stored);
  };

  const loadOffers = () => {
    setOffers([
      { meal: "Chicken Kottu", discount: "20%", shop: "Fresh Bites", expires: "2 hours" },
      { meal: "Burger Meal", discount: "15%", shop: "Tasty Treat", expires: "5 hours" },
      { meal: "Rice Packet", discount: "10%", shop: "Sunflower's Kitchen", expires: "1 day" },
    ]);
  };

  const loadFavorites = () => {
    setFavorites(new Set(["2", "5"]));
  };

  const toggleFavorite = (mealId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(mealId)) {
      newFavorites.delete(mealId);
    } else {
      newFavorites.add(mealId);
    }
    setFavorites(newFavorites);
  };

  const saveRecentView = (meal) => {
    const exists = recentViewed.some(m => m._id === meal._id);
    if (!exists) {
      setRecentViewed([meal, ...recentViewed].slice(0, 4));
    }
  };

  const handleSearch = () => {
    const hasAccess = selectedDistrict === 'Matara';
    if (!selectedDistrict) return alert('Please select your district before searching.');
    if (!hasAccess) return alert('Access restricted to customers in Matara district only.');
    performSearch();
  };

  const handleSelectDistrict = (d) => {
    try { localStorage.setItem('customerSelectedDistrict', d); localStorage.removeItem('customerDistrictConfirmed'); } catch (e) {}
    setSelectedDistrict(d);
    setRejectedDistrict(d !== 'Matara');
    setDistrictConfirmed(false);
  };

  const handleLogoutReject = () => {
    try { logout && logout(); } catch (e) {}
    try { navigate('/'); } catch (e) {}
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ latitude, longitude });
        // we don't have reverse geocoding here; show a friendly placeholder
        setLocation('Current Location');
      },
      (err) => {
        console.error('Geolocation error', err);
        alert('Could not detect location');
      }
    );
  };

  const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
 // helper: check restaurant budget against user budget
const matchesBudget = (r, userBudget) => {
  try {
    const min = Number(r.budgetRange?.min ?? r.minBudget ?? r.minPrice ?? 0);

    if (Number.isNaN(min)) return false;

    // Only allow restaurants with minBudget <= userBudget
    return min <= userBudget;

  } catch (e) {
    console.error("matchesBudget error:", e);
    return false;
  }
};

  const performSearch = async () => {
    if (!budget) return alert('Please enter your budget');
    if (!location && !userCoords) return alert('Please enter a location or use GPS');

    try {
      // If a specific restaurant was selected from suggestions, load it directly
      if (selectedRestaurantId) {
        const rres = await api.get(`/restaurants/${selectedRestaurantId}`);
        const rdata = rres && rres.data && rres.data.data ? rres.data.data.restaurant : rres.data;
        // try to get meals first
        const mealsForRest = (rres && rres.data && rres.data.data && rres.data.data.meals) || (rdata && rdata.meals) || [];
        let affordable = mealsForRest.filter(m => m.price <= Number(budget));
        // fallback: if no meals, try menus endpoint (menus may be stored separately)
        if ((!affordable || affordable.length === 0)) {
          try {
            const menusResp = await api.get('/menus/public', { params: { restaurant: selectedRestaurantId, maxPrice: Number(budget) } });
            const menusData = menusResp?.data?.data || menusResp?.data || menusResp || [];
            const menusList = Array.isArray(menusData) ? menusData : (menusData.data || menusData);
            if (menusList && menusList.length > 0) {
              // navigate with menus as filteredMeals
              navigate('/restaurant-result', { state: { results: [rdata], filteredMeals: menusList, from: { budget, location }, userCoords } });
              return;
            }
          } catch (e) {
            // ignore and fall through to alert
          }
        }
        if (!affordable || affordable.length === 0) return alert('No meals under that budget at the selected restaurant');
        navigate('/restaurant-result', { state: { results: [rdata], filteredMeals: affordable, from: { budget, location }, userCoords } });
        return;
      }
      // fetch meals under budget
      const res = await mealService.getMeals({ maxPrice: budget });
      const mealsResp = res?.data || res || [];
      const mealsList = Array.isArray(mealsResp) ? mealsResp : (mealsResp.data || mealsResp);

      // collect restaurant ids
      const restIds = new Set();
      mealsList.forEach(m => {
        const rid = m.restaurant && (m.restaurant._id || m.restaurant);
        if (rid) restIds.add(String(rid));
      });

      const restaurantPromises = Array.from(restIds).map(id => api.get(`/restaurants/${id}`).then(r => r.data && r.data.data ? r.data.data.restaurant : r.data));
      const restaurants = (await Promise.all(restaurantPromises)).filter(Boolean);

      // filter by location
      const filtered = restaurants.filter(r => {
        if (!r) return false;
        // if user provided typed location, match by string
        if (location && location !== 'Current Location') {
          const loc = (r.location || (r.address && (r.address.street || r.address.city)) || '').toLowerCase();
          return loc.includes(String(location).toLowerCase());
        }
        // else if we have coordinates, compute distance
        if (userCoords && r.address && r.address.coordinates && r.address.coordinates.latitude && r.address.coordinates.longitude) {
          const d = haversineDistanceKm(userCoords.latitude, userCoords.longitude, r.address.coordinates.latitude, r.address.coordinates.longitude);
          return d <= 5; // within 5 km
        }
        // last resort, allow it
        return true;
      });

      // navigate to results page with state (include coords if available)
      if (filtered.length === 1) {
        try {
          const rid = filtered[0]._id || filtered[0].id || filtered[0]._id;
          const mealsResp = await mealService.getMeals({ restaurant: rid, maxPrice: budget });
          const mealsData = mealsResp?.data || mealsResp || [];
          const mealsList = Array.isArray(mealsData) ? mealsData : (mealsData.data || mealsData);
          navigate('/restaurant-result', { state: { results: filtered, filteredMeals: mealsList, from: { budget, location }, userCoords } });
          return;
        } catch (e) {
          // fallback
        }
      }
      navigate('/restaurant-result', { state: { results: filtered, from: { budget, location }, userCoords } });
    } catch (err) {
      console.error('Search failed', err);
      alert('Search failed. Try again.');
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const hasAccess = districtConfirmed && selectedDistrict === 'Matara';

  return (
    <div className="relative">
       {/* floating selector outside blurred content so it's always sharp */}
{!districtConfirmed && (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-4xl px-4 mx-auto">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-6 text-white flex items-center gap-4">
          <div className="text-4xl">📍</div>
          <div className="flex-1">
            <div className="text-lg font-bold">Select Your District</div>
            <div className="text-sm opacity-90">This service is available only for Matara district. Please choose your district to continue.</div>
          </div>
          <div className="flex-shrink-0 text-sm opacity-90">Area: Sri Lanka</div>
        </div>

        <div className="p-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <DistrictSelector value={selectedDistrict} onChange={handleSelectDistrict} />
            </div>
            <div className="flex flex-col items-end gap-3">
              {rejectedDistrict ? (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">Access restricted — only Matara allowed</div>
              ) : (
                <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">Choose Matara to continue</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!(selectedDistrict === 'Matara')}
                  onClick={() => {
                    if (selectedDistrict === 'Matara') {
                      try { localStorage.setItem('customerDistrictConfirmed', 'true'); } catch (e) {}
                      setDistrictConfirmed(true);
                      setRejectedDistrict(false);
                    } else {
                      setRejectedDistrict(true);
                      alert('Access restricted to Matara district only.');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold ${(selectedDistrict === 'Matara') ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                  Continue
                </button>

                <button type="button" onClick={() => {
                  if (rejectedDistrict) {
                    handleLogoutReject();
                  } else {
                    try { localStorage.removeItem('customerSelectedDistrict'); localStorage.removeItem('customerDistrictConfirmed'); } catch (e) {}
                    setSelectedDistrict(null);
                    setRejectedDistrict(false);
                    setDistrictConfirmed(false);
                  }
                }} className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">{rejectedDistrict ? 'Logout' : 'Reset'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* district selector moved into hero for visibility while blurred */}

      <div className={`min-h-screen bg-gradient-to-br from-black via-orange-900 to-black/90 py-8 ${!hasAccess ? 'filter blur-sm' : ''}`}>
        <div className="container mx-auto px-4 max-w-7xl">

        {/* HERO WELCOME SECTION */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-700 rounded-3xl shadow-2xl p-12 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-4xl">👋</span>
              <h1 className="text-4xl font-bold">{getTimeGreeting()}, {user?.fullName}!</h1>
              <button type="button" onClick={() => setShowProfile(s => !s)} aria-pressed={showProfile} aria-label="Toggle profile" className="ml-4 bg-white/20 p-2 rounded-full hover:bg-white/30">
                <User className="w-6 h-6 text-white" />
              </button>
            </div>
            <p className="text-orange-100 text-lg mb-6">Discover delicious meals that fit your budget</p>

            

            {/* Profile form: toggled by profile icon */}
            <div className="md:mb-4 md:rounded-lg">
              {showProfile && (
                <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="bg-white/10 p-4 rounded-xl mb-4">
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block text-orange-50">Full name</label>
                    <input name="profile_fullname" autoComplete="off" value={profile.fullName} onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/20 text-black" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block text-orange-50">Email</label>
                    <input name="profile_email" autoComplete="off" value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/20 text-black" />
                  </div>
                  <div className="flex-1 relative">
                    <label className="text-sm font-medium mb-1 block text-orange-50">Password</label>
                    <input name="profile_password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={profile.password} onChange={(e) => setProfile(p => ({ ...p, password: e.target.value }))} placeholder="keep current password" className="w-full px-3 py-2 rounded-lg bg-white/20 text-black" />
                    <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-8 text-sm text-orange-50/90 px-2">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={savingProfile} onClick={async () => {
                      try {
                        setSavingProfile(true);
                        setProfileMessage('');
                        const payload = { fullName: profile.fullName, email: profile.email };
                        if (profile.password && profile.password.length > 0) payload.password = profile.password;
                        const resp = await authService.updateProfile(payload);
                        const updated = resp && (resp.data || resp) ? (resp.data || resp) : resp;
                        try { updateUser && updateUser(updated); } catch (e) {}
                        // Clear password field after successful update
                        setProfile(p => ({ ...p, password: '' }));
                        setProfileMessage('Customer profile has been updated.');
                      } catch (err) {
                        console.error('Failed to update profile', err);
                        setProfileMessage('Failed to update profile');
                      } finally {
                        setSavingProfile(false);
                        setTimeout(() => setProfileMessage(''), 4000);
                      }
                    }} className="px-4 py-2 bg-white text-black rounded-lg">{savingProfile ? 'Saving...' : 'Save Profile'}</button>
                  </div>
                </div>
                {profileMessage && <div className="mt-2 text-sm text-green-200">{profileMessage}</div>}
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                <label className="text-sm font-medium mb-2 block">Your Budget</label>
                <input
                  type="number"
                  disabled={!hasAccess}
                  className={`w-full px-4 py-3 pl-10 border-2 border-white/30 rounded-xl bg-white/20 backdrop-blur-sm text-black placeholder-white/70 focus:outline-none focus:border-white/50 transition ${!hasAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="200"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <span className="absolute left-3 top-11 text-white/80">LKR</span>
              </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Location</label>
                <div className="flex gap-2 items-center">
                  <MapPin className="w-5 h-5 text-white/80" />
                  {(!budget) && (
                    <>
                      <select
                        ref={selectRef}
                        disabled={!budget || !hasAccess}
                        onFocus={() => (budget && hasAccess) && loadLocations(Number(budget))}
                        className={`w-full px-4 py-3 border-2 border-white/30 rounded-xl bg-white/20 backdrop-blur-sm text-black placeholder-white/70 focus:outline-none focus:border-white/50 transition ${(!budget || !hasAccess) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={selectedRestaurantId || location}
                        onChange={(e) => {
                          const val = e.target.value;
                          const opt = locations.find(o => String(o.value) === String(val));
                          if (opt) {
                            setLocation(opt.loc || opt.label || '');
                            if (opt.value && opt.value !== opt.loc) {
                              setSelectedRestaurantId(opt.value);
                            } else {
                              setSelectedRestaurantId(null);
                            }
                          } else {
                            setLocation(val);
                            setSelectedRestaurantId(null);
                          }
                        }}
                      >
                        <option value="">Enter budget first</option>
                      </select>
                    </>
                  )}

                  {(budget && locations && locations.length > 0) && (
                    <>
                      <select
                        ref={selectRef}
                        disabled={!hasAccess}
                        onFocus={() => (budget && hasAccess) && loadLocations(Number(budget))}
                        className={`w-full px-4 py-3 border-2 border-white/30 rounded-xl bg-white/20 backdrop-blur-sm text-black placeholder-white/70 focus:outline-none focus:border-white/50 transition ${!hasAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={selectedRestaurantId || location}
                        onChange={(e) => {
                          const val = e.target.value;
                          const opt = locations.find(o => String(o.value) === String(val));
                          if (opt) {
                            setLocation(opt.loc || opt.label || '');
                            if (opt.value && opt.value !== opt.loc) {
                              setSelectedRestaurantId(opt.value);
                            } else {
                              setSelectedRestaurantId(null);
                            }
                          } else {
                            setLocation(val);
                            setSelectedRestaurantId(null);
                          }
                        }}
                      >
                        <option value="">Select location</option>
                        {locations.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button type="button" disabled={!hasAccess} onClick={() => { if (!hasAccess) { alert('Access restricted to customers in Matara district only.'); return; } navigate('/map', { state: { budget: Number(budget), filteredRestaurants, selectedRestaurantId } }) }} className={`ml-2 px-3 py-2 rounded-lg ${!hasAccess ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white/20 text-white/90 hover:bg-white/30'}`}>Use GPS</button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!hasAccess) { alert('Access restricted to customers in Matara district only.'); return; }
                            // Load suggestions first
                            await loadLocations(budget ? Number(budget) : null);
                            selectRef.current && selectRef.current.focus();
                              try {
                              if (selectedRestaurantId) {
                                const resolvedId = selectedRestaurantId;
                                const rres = await api.get(`/restaurants/${resolvedId}`);
                                const restaurant = rres && rres.data && rres.data.data ? rres.data.data.restaurant : rres.data;
                                // Try fetching meals under budget first
                                let mealsListForRest = [];
                                try {
                                  const mealsResp = await mealService.getMeals({ restaurant: resolvedId, maxPrice: budget });
                                  const mealsData = mealsResp?.data || mealsResp || [];
                                  mealsListForRest = Array.isArray(mealsData) ? mealsData : (mealsData.data || mealsData);
                                } catch (e) {
                                  mealsListForRest = [];
                                }
                                // Fallback to menus if no meals found
                                if (!mealsListForRest || mealsListForRest.length === 0) {
                                  try {
                                    const mresp = await api.get('/menus/public', { params: { restaurant: resolvedId, maxPrice: Number(budget) } });
                                    const mdata = mresp?.data?.data || mresp?.data || mresp || [];
                                    mealsListForRest = Array.isArray(mdata) ? mdata : (mdata.data || mdata);
                                  } catch (e) {
                                    mealsListForRest = [];
                                  }
                                }

                                if (!mealsListForRest || mealsListForRest.length === 0) {
                                  alert('Selected restaurant does not have menu items under that budget');
                                  return;
                                }

                                navigate('/restaurant-result', { state: { results: [restaurant], filteredMeals: mealsListForRest, filteredMealsMap: { [resolvedId]: mealsListForRest }, from: { budget, location }, userCoords } });
                                return;
                              }

                              if (locations && locations.length > 0) {
                                // Build list of restaurant ids. Some `locations` entries may be human labels,
                                // so resolve them against `filteredRestaurants` to avoid calling /restaurants/<label>
                                const maybeIds = locations.map(l => l.value).filter(Boolean);
                                const isObjectId = (s) => /^[0-9a-fA-F]{24}$/.test(String(s));
                                const resolvedIds = new Set();
                                for (const cand of maybeIds) {
                                  if (isObjectId(cand)) {
                                    resolvedIds.add(cand);
                                  } else {
                                    // treat as location label: collect matching filteredRestaurants ids
                                    const matching = (filteredRestaurants || []).filter(r => {
                                      const loc = (r.location || (r.address && (r.address.city || r.address.street)) || '').toString().trim();
                                      return String(loc).toLowerCase() === String(cand).toLowerCase();
                                    }).map(r => r._id || r.id).filter(Boolean);
                                    matching.forEach(id => resolvedIds.add(id));
                                  }
                                }
                                const ids = Array.from(resolvedIds);
                                const restaurantPromises = ids.map(id => api.get(`/restaurants/${id}`).then(r => r.data && r.data.data ? r.data.data.restaurant : r.data).catch(() => null));
                                const restaurants = (await Promise.all(restaurantPromises)).filter(Boolean);


                                // Build mealsMap by querying meals first, then fallback to menus for each restaurant.
                                const mealsMap = {};
                                await Promise.all(restaurants.map(async (r) => {
                                  const id = r._id || r.id;
                                  try {
                                    const resp = await mealService.getMeals({ restaurant: id, maxPrice: budget });
                                    const data = resp?.data || resp || [];
                                    const list = Array.isArray(data) ? data : (data.data || data);
                                    if (list && list.length > 0) {
                                      mealsMap[id] = list || [];
                                      return;
                                    }
                                  } catch (e) {
                                    // continue to menus fallback
                                  }
                                  // fallback to menus endpoint
                                  try {
                                    const mresp = await api.get('/menus/public', { params: { restaurant: id, maxPrice: Number(budget) } });
                                    const mdata = mresp?.data?.data || mresp?.data || mresp || [];
                                    const mlist = Array.isArray(mdata) ? mdata : (mdata.data || mdata);
                                    mealsMap[id] = mlist || [];
                                  } catch (e) {
                                    mealsMap[id] = [];
                                  }
                                }));

                                // Only keep restaurants which actually have menu/meal items within the budget
                                const restaurantsFiltered = restaurants.filter(r => {
                                  const id = (r._id || r.id);
                                  return mealsMap[id] && mealsMap[id].length > 0;
                                });

                                if (restaurantsFiltered.length === 0) {
                                  alert('No restaurants in that location match your budget');
                                  return;
                                }

                                if (restaurantsFiltered.length === 1) {
                                  navigate('/restaurant-result', { state: { results: restaurantsFiltered, filteredMeals: mealsMap[restaurantsFiltered[0]._id || restaurantsFiltered[0].id] || [], filteredMealsMap: mealsMap, from: { budget, location }, userCoords } });
                                } else {
                                  navigate('/restaurant-result', { state: { results: restaurantsFiltered, filteredMealsMap: mealsMap, from: { budget, location }, userCoords } });
                                }
                              }
                            } catch (err) {
                              console.error('Auto search navigation failed', err);
                            }
                          }}
                          className="ml-2 px-3 py-2 bg-white/20 rounded-lg text-white/90 hover:bg-white/30"
                        >
                          Auto
                        </button>
                      </div>
                    </>
                  )}

                  {(budget && locations && locations.length === 0) && (
                    <div className="w-full px-4 py-3 text-sm text-yellow-800 bg-yellow-100 rounded-lg">No locations match that budget</div>
                  )}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full bg-white text-orange-500 py-3 px-6 rounded-xl font-semibold hover:bg-orange-50 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Search className="w-5 h-5" />
                  Search Meals
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* SITE STATS */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl text-white flex items-center gap-3">
              <MapPin className="w-8 h-8 text-orange-200" />
              <div>
                <div className="text-sm text-orange-100">Registered Restaurants</div>
                <div className="text-2xl font-bold mt-2">{stats.restaurantsCount}</div>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl text-white flex items-center gap-3">
              <User className="w-8 h-8 text-orange-200" />
              <div>
                <div className="text-sm text-orange-100">Registered Customers</div>
                <div className="text-2xl font-bold mt-2">{stats.customersCount}</div>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl text-white flex items-center gap-3">
              <Star className="w-8 h-8 text-orange-200" />
              <div>
                <div className="text-sm text-orange-100">Total Ratings Given</div>
                <div className="text-2xl font-bold mt-2">{stats.totalRatings || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK CATEGORIES */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-800">Browse Categories</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`${cat.color} p-4 rounded-2xl shadow-md hover:shadow-xl transition transform hover:scale-105 text-center group ${activeCategory === cat.name ? 'ring-2 ring-orange-500' : ''}`}
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition">{cat.icon}</div>
                <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
              </button>
            ))}
          </div>
        </div>

         

        {/* TODAY'S HOT OFFERS */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-800">Hot Deals Today</h2>
            <span className="ml-2 px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">LIMITED TIME</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {offers.map((offer, i) => (
              <div key={i} className="bg-gradient-to-br from-white to-orange-50 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:scale-105 border-2 border-orange-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-500 text-white px-4 py-1 rounded-bl-2xl font-bold text-sm">
                  {offer.discount} OFF
                </div>
                <h3 className="font-bold text-xl mt-4 text-gray-800">{offer.meal}</h3>
                <p className="text-gray-600 text-sm mt-1">{offer.shop}</p>
                <div className="flex items-center gap-2 mt-3 text-orange-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Expires in {offer.expires}</span>
                </div>
                <button className="mt-4 w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
                  Grab Deal
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RECOMMENDED MEALS */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-800">Recommended for You</h2>
            </div>
            <button className="text-orange-500 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {meals.map((meal) => (
                <div
                  key={meal._id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition transform hover:scale-105 group"
                >
                  <div className="relative h-48 bg-gradient-to-br from-orange-200 to-amber-200 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">
                      🍽️
                    </div>
                    <button
                      onClick={() => toggleFavorite(meal._id)}
                      className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg hover:scale-110 transition"
                    >
                      <Heart
                        className={`w-5 h-5 ${favorites.has(meal._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-800 mb-2">{meal.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {meal.description}
                    </p>

                    <div className="flex justify-between items-center mb-3">
                      <span className="text-orange-500 font-bold text-xl">
                        LKR {meal.price}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                        {meal.category}
                      </span>
                    </div>

                    <button
                      onClick={() => saveRecentView(meal)}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition transform group-hover:scale-105"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEARBY RESTAURANTS */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-800">Nearby Restaurants</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {nearbyRestaurants.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-2xl transition transform hover:scale-105 relative">
                {r.popular && (
                  <span className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-900" /> Popular
                  </span>
                )}
                <h3 className="font-bold text-lg text-gray-800">{r.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{r.distance} away</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{r.rating}</span>
                </div>
                <p className="text-orange-500 font-bold text-lg mt-3">From LKR {r.price}</p>
                <button className="mt-3 w-full border-2 border-orange-500 text-orange-500 py-2 rounded-lg font-semibold hover:bg-orange-500 hover:text-white transition">
                  Browse Menu
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RECENTLY VIEWED */}
        {recentViewed.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-gray-800">Recently Viewed</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {recentViewed.map((rv) => (
                <div key={rv._id} className="bg-white rounded-2xl shadow-md p-4 hover:shadow-xl transition transform hover:scale-105">
                  <div className="h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-xl mb-3 flex items-center justify-center text-4xl">
                    🍽️
                  </div>
                  <h3 className="font-semibold text-gray-800">{rv.name}</h3>
                  <p className="text-orange-500 font-bold mt-1">LKR {rv.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

         

      </div>
    </div>
  </div>
  );
};

export default CustomerDashboard;
