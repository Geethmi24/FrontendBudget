import React, { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useAuthModal } from '../../contexts/AuthModalContext'
import LoginForm from '../../components/auth/LoginForm'
import RegisterForm from '../../components/auth/RegisterForm'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
 

// Small fallback sample used only when API is unavailable
const sampleRestaurants = [
  {
    id: 'sample-1',
    name: 'Sample Cafe',
    location: 'Matara City',
    cuisine: 'Sri Lankan',
    rating: 4.2,
    priceRange: 'LKR',
    specialty: 'Rice & Curry',
    openHours: '09:00 - 22:00',
    description: 'Fallback restaurant used when API is unreachable.',
    features: ['Takeaway', 'Family Friendly'],
    image: ''
  }
]

function normalizeFeatures(features) {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  const mapping = {
    hasDelivery: 'Delivery',
    hasTakeaway: 'Takeaway',
    hasParking: 'Parking',
    isVeg: 'Vegetarian'
  }
  return Object.keys(features).filter(k => features[k]).map(k => mapping[k] || k)
}

function getRatingValue(rating) {
  if (rating == null) return 0
  if (typeof rating === 'number') return rating
  if (typeof rating === 'object') return rating.average ?? rating.count ?? 0
  const parsed = Number(rating)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatOpeningHours(openingHours) {
  if (!openingHours) return ''
  if (typeof openingHours === 'string') return openingHours
  // openingHours expected to be object with days; pick first available day's interval
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
  for (const d of days) {
    const item = openingHours[d]
    if (item) {
      const open = item.open || ''
      const close = item.close || ''
      if (open || close) return `${open}${open && close ? ' - ' + close : ''}`
    }
  }
  return ''
}

function normalizeRestaurant(r) {
  if (!r) return null
  const image = r.photoURL || (Array.isArray(r.images) && r.images[0]) || r.image || ''
  const location = r.location || (r.address && (r.address.street || r.address.city)) || ''
  const rating = getRatingValue(r.rating)
  const price = r.priceRange || (r.budgetRange && r.budgetRange.min) || 'LKR'
  const cuisine = (Array.isArray(r.cuisineType) && r.cuisineType.join(', ')) || r.cuisine || ''
  const features = normalizeFeatures(r.features)
  return {
    id: r._id || r.id,
    _id: r._id || r.id,
    name: r.name,
    location,
    cuisine,
    rating,
    priceRange: price,
    specialty: r.specialty || '',
    openHours: formatOpeningHours(r.openingHours || r.openHours),
    description: r.description || '',
    features: features.length ? features : (Array.isArray(r.features) ? r.features : []),
    image
  }
}

function RestaurantList() {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([])
  const [restaurantsData, setRestaurantsData] = useState([])
  const [loading, setLoading] = useState(true)
  const locationState = useLocation();
  const passed = locationState?.state?.results;
  const { isAuthModalOpen, setIsAuthModalOpen, authModalTab, setAuthModalTab } = useAuthModal()
  const [showInlineLogin, setShowInlineLogin] = useState(false)
  const [showInlineRegister, setShowInlineRegister] = useState(false)
  const { user } = useAuth()

  // Add restaurant form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [form, setForm] = useState({
    ownerName: '',
    name: '',
    description: '',
    location: '',
    serviceTypes: [],
    cuisine: '',
    priceMin: '',
    priceMax: '',
    priceRange: '',
    specialty: '',
    openHours: '',
    contactNumber: '',
    email: '',
    features: '',
    hasTakeaway: false,
    hasParking: false,
    image: ''
  })
  const [showRestaurants, setShowRestaurants] = useState(false)
  const [ownerRecent, setOwnerRecent] = useState(null)
  const [isMatchWithOwner, setIsMatchWithOwner] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchRestaurants() {
      try {
        const res = await api.get('/restaurants')
        const data = res.data?.data || []
        const normalized = data.map(normalizeRestaurant).filter(Boolean)
        if (!cancelled) setRestaurantsData(normalized)
      } catch (err) {
        console.error('Failed to fetch restaurants', err)
        if (!cancelled) setRestaurantsData(sampleRestaurants)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRestaurants()
    return () => { cancelled = true }
  }, [])

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    const next = { ...form, [name]: type === 'checkbox' ? checked : value }
    setForm(next)
    // live match check against persisted owner form
    try {
      const raw = ownerRecent || JSON.parse(localStorage.getItem('recentRestaurantForm') || 'null')
      if (raw) {
        setOwnerRecent(raw)
        setIsMatchWithOwner(compareWithOwner(raw, next))
      }
    } catch (err) {}
  }

  const handleSaveRestaurant = async (e) => {
    e.preventDefault()
    setSaveMessage('')
    if (!user) {
      setSaveMessage('You must be signed in as a restaurant owner to add a restaurant')
      return
    }
    if (!['restaurant_owner','admin'].includes(user.role)) {
      setSaveMessage('Only restaurant owners can add restaurants. Register as owner first.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        location: form.location,
        cuisineType: form.cuisine ? form.cuisine.split(',').map(s => s.trim()) : [],
        priceRange: form.priceRange,
        specialty: form.specialty,
        features: form.features ? form.features.split(',').map(s => s.trim()) : [],
        photoURL: form.image || undefined
      }
      const resp = await api.post('/restaurants', payload)
      const saved = resp.data?.data
      setSaveMessage(resp.data?.message || 'Save successful')
      // add to UI list
      if (saved) {
        const normalized = normalizeRestaurant(saved)
        setRestaurantsData(prev => [normalized, ...prev])
        // ensure restaurants are visible after a save
        setShowRestaurants(true)
      }
      // reset form
      setForm({ name: '', description: '', location: '', cuisine: '', priceRange: '', specialty: '', features: '', image: '' })
      setShowAddForm(false)
    } catch (err) {
      console.error('Save restaurant failed', err)
      const msg = err.response?.data?.message || 'Failed to save restaurant'
      setSaveMessage(msg)
    } finally {
      setSaving(false)
    }
  }

  // compare helper
  const compareWithOwner = (ownerObj, formObj) => {
    if (!ownerObj) return false
    const norm = (s) => (s === null || s === undefined) ? '' : String(s).toString().trim().toLowerCase()
    const normNum = (v) => {
      if (v === null || v === undefined || v === '') return ''
      const n = Number(String(v).replace(/[^0-9.-]/g, ''))
      return Number.isFinite(n) ? String(n) : String(v).trim()
    }
    const arrEqual = (a, b) => {
      const A = Array.isArray(a) ? a.map(x => String(x).trim().toLowerCase()) : (a ? String(a).split(',').map(x => x.trim().toLowerCase()) : [])
      const B = Array.isArray(b) ? b.map(x => String(x).trim().toLowerCase()) : (b ? String(b).split(',').map(x => x.trim().toLowerCase()) : [])
      if (A.length !== B.length) return false
      const sortedA = A.slice().sort().join('|')
      const sortedB = B.slice().sort().join('|')
      return sortedA === sortedB
    }

    if (norm(ownerObj.name) !== norm(formObj.name)) return false
    if (norm(ownerObj.location) !== norm(formObj.location)) return false
    if (norm(ownerObj.description) !== norm(formObj.description)) return false
    if (!arrEqual(ownerObj.cuisineType || ownerObj.cuisine || [], formObj.cuisine || '')) return false
    // price min/max compare numerically if possible
    if (normNum(ownerObj.priceMin || ownerObj.priceRange || '') !== normNum(formObj.priceMin || formObj.priceRange || '')) return false
    if (normNum(ownerObj.priceMax || '') !== normNum(formObj.priceMax || '')) return false
    if (norm(ownerObj.specialty) !== norm(formObj.specialty)) return false
    if (norm(ownerObj.openHours || '') !== norm(formObj.openHours || '')) return false
    if (norm(ownerObj.contactNumber || '') !== norm(formObj.contactNumber || '')) return false
    if (norm(ownerObj.email || '') !== norm(formObj.email || '')) return false
    if (!arrEqual(ownerObj.features || [], formObj.features || '')) return false
    if ((!!ownerObj.hasTakeaway) !== (!!formObj.hasTakeaway)) return false
    if ((!!ownerObj.hasParking) !== (!!formObj.hasParking)) return false
    if (norm(ownerObj.photoURL || ownerObj.image || '') !== norm(formObj.image || '')) return false
    return true
  }

  // load recent owner form on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentRestaurantForm')
      if (raw) {
        const obj = JSON.parse(raw)
        setOwnerRecent(obj)
      }
    } catch (err) {}
  }, [])

  const handleOpenAdd = () => {
    // toggle form; when opening, prefill from ownerRecent if available
    const opening = !showAddForm
    setShowAddForm(opening)
    if (opening && ownerRecent) {
      setForm(f => ({
        ...f,
        ownerName: ownerRecent.ownerName || f.ownerName || '',
        name: ownerRecent.name || '',
        description: ownerRecent.description || '',
        location: ownerRecent.location || '',
        serviceTypes: Array.isArray(ownerRecent.serviceTypes) ? ownerRecent.serviceTypes : (ownerRecent.serviceTypes ? [ownerRecent.serviceTypes] : []),
        cuisine: Array.isArray(ownerRecent.cuisineType) ? ownerRecent.cuisineType.join(', ') : (ownerRecent.cuisineType || ''),
        priceMin: ownerRecent.priceMin || '',
        priceMax: ownerRecent.priceMax || '',
        priceRange: ownerRecent.priceRange || '',
        specialty: ownerRecent.specialty || '',
        openHours: ownerRecent.openHours || '',
        contactNumber: ownerRecent.contactNumber || '',
        email: ownerRecent.email || '',
        features: Array.isArray(ownerRecent.features) ? ownerRecent.features.join(', ') : (ownerRecent.features || ''),
        hasTakeaway: !!ownerRecent.hasTakeaway,
        hasParking: !!ownerRecent.hasParking,
        image: ownerRecent.photoURL || ''
      }))
      const same = compareWithOwner(ownerRecent, {
        name: ownerRecent.name || '',
        description: ownerRecent.description || '',
        location: ownerRecent.location || '',
        cuisine: Array.isArray(ownerRecent.cuisineType) ? ownerRecent.cuisineType.join(', ') : (ownerRecent.cuisineType || ''),
        priceMin: ownerRecent.priceMin || '',
        priceMax: ownerRecent.priceMax || '',
        priceRange: ownerRecent.priceRange || '',
        specialty: ownerRecent.specialty || '',
        openHours: ownerRecent.openHours || '',
        contactNumber: ownerRecent.contactNumber || '',
        email: ownerRecent.email || '',
        features: Array.isArray(ownerRecent.features) ? ownerRecent.features.join(', ') : (ownerRecent.features || ''),
        hasTakeaway: !!ownerRecent.hasTakeaway,
        hasParking: !!ownerRecent.hasParking,
        image: ownerRecent.photoURL || ''
      })
      setIsMatchWithOwner(same)
    } else {
      setIsMatchWithOwner(false)
    }
  }

  const handleDone = async (e) => {
    e.preventDefault()
    // recompute match and only act if match
    const sameNow = ownerRecent && compareWithOwner(ownerRecent, form)
    if (!sameNow) {
      // compute which fields differ to help debug
      const diffs = []
      const norm = (s) => (s || '').toString().trim()
      const owner = ownerRecent
      if (norm(owner.name) !== norm(form.name)) diffs.push('name')
      if (norm(owner.location) !== norm(form.location)) diffs.push('location')
      if (norm(owner.description) !== norm(form.description)) diffs.push('description')
      const ownerCuisine = Array.isArray(owner.cuisineType) ? owner.cuisineType.join(',').trim() : (owner.cuisineType || '').toString().trim()
      if (ownerCuisine !== norm(form.cuisine)) diffs.push('cuisine')
      if (norm(owner.priceMin || owner.priceRange || '') !== norm(form.priceMin || form.priceRange || '')) diffs.push('price')
      if (norm(owner.priceMax || '') !== norm(form.priceMax || '')) diffs.push('priceMax')
      if (norm(owner.specialty) !== norm(form.specialty)) diffs.push('specialty')
      if (norm(owner.openHours || '') !== norm(form.openHours || '')) diffs.push('openHours')
      if (norm(owner.contactNumber || '') !== norm(form.contactNumber || '')) diffs.push('contactNumber')
      if (norm(owner.email || '') !== norm(form.email || '')) diffs.push('email')
      const ownerFeatures = Array.isArray(owner.features) ? owner.features.join(',').trim() : (owner.features || '').toString().trim()
      if (ownerFeatures !== norm(form.features)) diffs.push('features')
      if ((!!owner.hasTakeaway) !== (!!form.hasTakeaway)) diffs.push('hasTakeaway')
      if ((!!owner.hasParking) !== (!!form.hasParking)) diffs.push('hasParking')
      if (norm(owner.photoURL) !== norm(form.image)) diffs.push('photoURL')
      const msg = diffs.length ? ('Details do not match owner restaurant: ' + diffs.join(', ')) : 'Details do not match owner restaurant'
      setSaveMessage(msg)
      return
    }
    try {
      // try fetch from backend if we have an id
      if (ownerRecent._id) {
        try {
          const res = await api.get(`/restaurants/${ownerRecent._id}`)
          const rest = (res.data && res.data.data && (res.data.data.restaurant || res.data.data)) || null
          if (rest) {
            const normalized = normalizeRestaurant(rest)
            // replace list with only this restaurant
            setRestaurantsData([normalized])
            setShowRestaurants(true)
            setSaveMessage('register resturant match success')
            alert('register resturant match success')
            setShowAddForm(false)
            return
          }
        } catch (fetchErr) {
          // fallback to using ownerRecent
        }
      }
      // fallback: use ownerRecent directly
      const fallback = {
        id: ownerRecent._id || ownerRecent.id || ('prefill-' + Date.now()),
        name: ownerRecent.name,
        location: ownerRecent.location,
        cuisine: Array.isArray(ownerRecent.cuisineType) ? ownerRecent.cuisineType.join(', ') : (ownerRecent.cuisineType || ''),
        rating: 0,
        priceRange: ownerRecent.priceRange || '',
        specialty: ownerRecent.specialty || '',
        openHours: '',
        description: ownerRecent.description || '',
        features: Array.isArray(ownerRecent.features) ? ownerRecent.features : (ownerRecent.features ? ownerRecent.features.split(',') : []),
        image: ownerRecent.photoURL || ''
      }
      setRestaurantsData([normalizeRestaurant(fallback)])
      setShowRestaurants(true)
      setSaveMessage('register resturant match success')
      alert('register resturant match success')
      setShowAddForm(false)
    } catch (err) {
      console.error('Done handling failed', err)
      alert('Failed to complete matching flow')
    }
  }

  useEffect(() => {
    // If search passed a single restaurant and filtered meals, open modal and show items
    const passedResults = locationState?.state?.results;
    const filtered = locationState?.state?.filteredMeals;
    if (passedResults && Array.isArray(passedResults) && passedResults.length === 1) {
      const r = normalizeRestaurant(passedResults[0]);
      setSelectedRestaurant(r);
      if (filtered && Array.isArray(filtered)) {
        setMenuItems(filtered);
        return;
      }
      // if budget info present, try fetching meals under budget for this restaurant
      const budget = locationState?.state?.from?.budget;
      if (budget) {
        (async () => {
          try {
            const ms = await import('../../services/mealService');
            const resp = await ms.mealService.getMeals({ restaurant: passedResults[0]._id || passedResults[0].id, maxPrice: budget });
            const mealsData = resp?.data || resp || [];
            const mealsList = Array.isArray(mealsData) ? mealsData : (mealsData.data || mealsData);
            setMenuItems(mealsList || []);
          } catch (e) {
            console.warn('Could not load filtered meals for restaurant', e);
          }
        })();
      }
    }
  }, [locationState]);

  useEffect(() => {
    // If header opened auth modal while on /restaurants, render inline forms instead
    if (isAuthModalOpen) {
      if (authModalTab === 'login') {
        setShowInlineLogin(true)
        setShowInlineRegister(false)
      } else if (authModalTab === 'register') {
        setShowInlineRegister(true)
        setShowInlineLogin(false)
      }
      // prevent the global modal from also opening
      setIsAuthModalOpen(false)
    }
  }, [isAuthModalOpen, authModalTab, setIsAuthModalOpen])

  const renderList = (() => {
    if (passed && Array.isArray(passed)) return passed.map(normalizeRestaurant).filter(Boolean)

    const hasData = restaurantsData && restaurantsData.length

    // Public viewers (not logged in), customers and admins should see the restaurant list.
    const isPublicViewer = !user || user.role === 'customer' || user.role === 'admin'

    if (hasData) {
      if (isPublicViewer) return restaurantsData
      // restaurant owners can reveal the list by using the UI (showRestaurants)
      if (showRestaurants) return restaurantsData
    } else {
      if (isPublicViewer) return sampleRestaurants
    }

    return []
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-800 to-black relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* HERO SECTION with Full Background Image and Animations */}
      <section
        className="relative w-screen h-[70vh] md:h-[100vh] mb-20 flex items-center justify-center animate-hero-fadeIn"
        style={{
          backgroundImage: "url('https://mir-s3-cdn-cf.behance.net/project_modules/fs/236f0d76128175.5c60ecdfead4b.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-hero-fadeIn"></div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Emoji Icon with continuous bounce */}
          <div className="text-8xl mb-4 animate-hero-bounce">🍽️</div>

          {/* Location Badge - slides down from top */}
          <div className="inline-block bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border-2 border-white/30 mb-6 animate-hero-slideDown">
            <span className="text-white font-semibold flex items-center gap-2">
              <span className="text-xl">📍</span>
              Exclusively Matara Area Restaurants
            </span>
          </div>

          {/* Main Heading - slides up from bottom */}
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg animate-hero-slideUp">
            Selected Restaurants in Matara
          </h1>

          {/* First Description - fades in and moves up with delay */}
          <p className="text-lg md:text-xl text-white/95 max-w-3xl mx-auto mb-4 animate-hero-fadeInUp animate-hero-delay-200">
            Explore dining options available exclusively in the{" "}
            <strong className="text-yellow-300">Matara area</strong>.
          </p>

          {/* Second Description - fades in and moves up with longer delay */}
          <p className="text-base md:text-lg text-white/85 italic max-w-3xl mx-auto mb-10 animate-hero-fadeInUp animate-hero-delay-300">
            From beachfront seafood to local cuisine — Matara is a true food paradise.
          </p>

          {/* Stats Section - each card scales in with staggered delays */}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {[
              { icon: "🏆", label: "Quality Service", value: "Guaranteed" },
              { icon: "📍", label: "Location", value: "Matara Only" },
              { icon: "⭐", label: "Rating", value: "4.5+" },
              { icon: "🍽️", label: "Cuisines", value: "12+ Styles" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/15 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/20 text-center min-w-36 hover:scale-110 hover:-translate-y-2 transition-transform duration-300 animate-hero-scaleIn"
                style={{ animationDelay: `${400 + i * 100}ms` }}
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-white text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-white/80 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inline Auth Forms (centered on Restaurants page) */}
      {showInlineLogin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Login</h3>
              <button onClick={() => setShowInlineLogin(false)} className="text-gray-500">Close</button>
            </div>
            <LoginForm onSuccess={() => setShowInlineLogin(false)} onSwitchToRegister={() => { setShowInlineLogin(false); setShowInlineRegister(true); setAuthModalTab('register') }} />
          </div>
        </div>
      )}
      {showInlineRegister && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Sign Up</h3>
              <button onClick={() => setShowInlineRegister(false)} className="text-gray-500">Close</button>
            </div>
            <RegisterForm onSuccess={() => setShowInlineRegister(false)} onSwitchToLogin={() => { setShowInlineRegister(false); setShowInlineLogin(true); setAuthModalTab('login') }} />
          </div>
        </div>
      )}

      {/* Restaurant Cards Grid */}
      {/* Add Restaurant Form (visible to owners) */}
      <div className="max-w-7xl mx-auto px-8 md:px-16 pb-6 relative z-10">
        {user && ['restaurant_owner','admin'].includes(user.role) ? (
          <div className="mb-6">
            <button onClick={handleOpenAdd} className="bg-green-500 text-white px-4 py-2 rounded-md mr-3">
              {showAddForm ? 'Close Add Form' : 'Add Restaurant'}
            </button>
            {showAddForm && (
              <form onSubmit={(e) => e.preventDefault()} className="mt-4 bg-white p-4 rounded-xl shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input name="ownerName" value={form.ownerName} onChange={handleFormChange} placeholder="Owner name" className="p-2 border rounded" readOnly />
                  <input name="name" value={form.name} onChange={handleFormChange} placeholder="Restaurant name" className="p-2 border rounded" required />
                  <input name="location" value={form.location} onChange={handleFormChange} placeholder="Location (street or city)" className="p-2 border rounded" />
                  <div className="p-2 border rounded">
                    <label className="text-sm">Service Types</label>
                    <div className="flex gap-2 mt-2">
                      {['Dine-In','Takeaway'].map(s => (
                        <label key={s} className="inline-flex items-center gap-2">
                          <input type="checkbox" name="serviceTypes" checked={form.serviceTypes.includes(s)} onChange={(e) => {
                            const exists = form.serviceTypes.includes(s)
                            setForm(f => ({ ...f, serviceTypes: exists ? f.serviceTypes.filter(x => x !== s) : [...f.serviceTypes, s] }))
                          }} />
                          <span className="text-sm">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <input name="cuisine" value={form.cuisine} onChange={handleFormChange} placeholder="Cuisine (comma separated)" className="p-2 border rounded" />
                  <input name="priceMin" value={form.priceMin} onChange={handleFormChange} placeholder="Price Min" className="p-2 border rounded" />
                  <input name="priceMax" value={form.priceMax} onChange={handleFormChange} placeholder="Price Max" className="p-2 border rounded" />
                  <input name="specialty" value={form.specialty} onChange={handleFormChange} placeholder="Specialty" className="p-2 border rounded" />
                  <input name="openHours" value={form.openHours} onChange={handleFormChange} placeholder="Open Hours (e.g. 08:00 - 22:00)" className="p-2 border rounded" />
                  <input name="contactNumber" value={form.contactNumber} onChange={handleFormChange} placeholder="Contact Number" className="p-2 border rounded" />
                  <input name="email" value={form.email} onChange={handleFormChange} placeholder="Email" className="p-2 border rounded" />
                  <input name="image" value={form.image} onChange={handleFormChange} placeholder="Image URL (optional)" className="p-2 border rounded" />
                </div>
                <div className="mt-3">
                  <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Short description" className="w-full p-2 border rounded" />
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input name="features" value={form.features} onChange={handleFormChange} placeholder="Features (comma separated)" className="w-full p-2 border rounded" />
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" name="hasTakeaway" checked={form.hasTakeaway} onChange={handleFormChange} /> Takeaway</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" name="hasParking" checked={form.hasParking} onChange={handleFormChange} /> Parking</label>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button type="button" onClick={handleDone} className="bg-emerald-600 text-white px-4 py-2 rounded-md">Done</button>
                  {saveMessage && <span className="text-sm text-gray-700">{saveMessage}</span>}
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <button onClick={() => { setAuthModalTab('register'); setIsAuthModalOpen(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-md">Register as Owner</button>
          </div>
        )}
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10 px-8 md:px-16 pb-16">
        {renderList.map((restaurant, idx) => (
          <div
            key={restaurant.id}
            onClick={() => setSelectedRestaurant(normalizeRestaurant(restaurant))}
            className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-4 hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            {/* Image */}
            <div className="relative h-60 overflow-hidden">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40"></div>

              {/* Rating badge */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <span className="text-yellow-500 text-lg">⭐</span>
                <span className="text-gray-800 font-bold">{restaurant.rating}</span>
              </div>

              {/* Price badge */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-green-600 font-bold">
                {restaurant.priceRange}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{restaurant.name}</h2>
              
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                <span>📍</span>
                <span>{restaurant.location || (restaurant.address && (restaurant.address.street || restaurant.address.city)) || ''}</span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{restaurant.rating || restaurant?.rating?.average || '-'}</span>
              </div>

              <p className="text-orange-500 font-bold text-lg mt-3">From LKR {restaurant.priceRange || (restaurant.budgetRange && restaurant.budgetRange.min) || '-'}</p>

              <div className="flex items-center gap-2 text-orange-600 font-semibold mb-4">
                <span>🍳</span>
                <span>{restaurant.cuisine}</span>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-4 min-h-20">
                {restaurant.description}
              </p>

              {/* Specialty */}
              <div className="bg-gradient-to-r from-orange-500 to-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold text-center mb-4">
                ✨ Specialty: {restaurant.specialty}
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {restaurant.features.slice(0, 3).map((feature, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                    {feature}
                  </span>
                ))}
              </div>

              {/* Hours */}
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold mb-4">
                <span>🕒</span>
                <span>{restaurant.openHours}</span>
              </div>

              {/* CTA Button */}
              <button className="w-full bg-orange-500/20 text-orange-700 px-4 py-3 rounded-full text-base font-bold backdrop-blur-sm border-2 border-orange-500/30 hover:bg-orange-500/30 hover:scale-105 transition-all duration-300 shadow-md">
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for detailed view */}
      {selectedRestaurant && (
        <div
          onClick={() => setSelectedRestaurant(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-5 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-slideUp"
          >
            <img
              src={selectedRestaurant.image}
              alt={selectedRestaurant.name}
              className="w-full h-80 object-cover rounded-t-3xl"
            />
            
            <div className="p-8">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">{selectedRestaurant.name}</h2>
              
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {selectedRestaurant.description}
              </p>

              {menuItems && menuItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-gray-800 text-xl font-semibold mb-3">Menu Items Under Budget</h3>
                  <div className="space-y-3">
                    {menuItems.map((m, i) => (
                      <div key={m._id || m.id || i} className="flex items-center justify-between bg-gray-100/50 p-3 rounded-lg">
                        <div>
                          <div className="font-semibold text-gray-800">{m.name}</div>
                          <div className="text-sm text-gray-600">{m.description}</div>
                        </div>
                        <div className="text-green-600 font-bold">LKR {m.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-gray-800 text-xl font-semibold mb-3">All Features:</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedRestaurant.features.map((feature, i) => (
                    <span
                      key={i}
                      className="bg-gradient-to-r from-orange-500 to-gray-900 text-white px-4 py-2 rounded-full text-sm font-semibold"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedRestaurant(null)}
                className="w-full bg-orange-500/20 text-orange-700 px-4 py-4 rounded-full text-lg font-bold backdrop-blur-sm border-2 border-orange-500/30 hover:bg-orange-500/30 hover:scale-105 transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        /* Hero Section Animations */
        @keyframes hero-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes hero-slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes hero-slideDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes hero-fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes hero-scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes hero-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        /* Hero Animation Classes */
        .animate-hero-fadeIn {
          animation: hero-fadeIn 1s ease-out;
        }
        .animate-hero-slideUp {
          animation: hero-slideUp 0.8s ease-out;
        }
        .animate-hero-slideDown {
          animation: hero-slideDown 0.6s ease-out 0.2s both;
        }
        .animate-hero-fadeInUp {
          animation: hero-fadeInUp 0.8s ease-out both;
        }
        .animate-hero-scaleIn {
          animation: hero-scaleIn 0.6s ease-out both;
        }
        .animate-hero-bounce {
          animation: hero-bounce 3s ease-in-out infinite;
        }
        .animate-hero-delay-200 {
          animation-delay: 0.2s;
        }
        .animate-hero-delay-300 {
          animation-delay: 0.3s;
        }

        /* Modal Animations (kept as is) */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

export default RestaurantList;