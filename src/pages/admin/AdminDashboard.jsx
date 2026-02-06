  
import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check } from 'lucide-react'
import api from '../../services/api'
import AdminMenuPage from './AdminMenuPage'

const MenuPage = lazy(() => import('../restaurant/MenuPage'))
 

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalMeals: 0,
    totalRevenue: 0
  })
  const [pendingRestaurants, setPendingRestaurants] = useState([])
  const [selected, setSelected] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [activeTab, setActiveTab] = useState('menu')
  const [activities, setActivities] = useState([])
  const [activityFilter, setActivityFilter] = useState('all') // all, customers, owners
  const [orders, setOrders] = useState([])
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoginError, setAdminLoginError] = useState('')
  const [adminLoginLoading, setAdminLoginLoading] = useState(false)
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'))
  const [adminUser, setAdminUser] = useState(null)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  
  // Register form state
  const [fullName, setFullName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  useEffect(() => {
    // Check if admin token exists in localStorage
    const token = localStorage.getItem('adminToken')
    const storedAdminUser = localStorage.getItem('adminUser')
    
    if (token) {
      setAdminToken(token)
      // If we have stored user data, use it immediately
      if (storedAdminUser) {
        try {
          setAdminUser(JSON.parse(storedAdminUser))
        } catch (err) {
          console.error('Failed to parse stored admin user', err)
          localStorage.removeItem('adminUser')
        }
      } else {
        // Otherwise fetch admin user data to verify token validity
        fetchAdminUser(token)
      }
    }
  }, [])

  const fetchAdminUser = async (token) => {
    try {
      const response = await api.get('/admin-auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data?.data) {
        setAdminUser(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch admin user', err)
      localStorage.removeItem('adminToken')
      setAdminToken(null)
    }
  }

  useEffect(() => {
    // Only fetch stats if admin is authenticated via adminToken
    if (adminToken && adminUser) {
      fetchStats()
      fetchPending()
      fetchAllOrders()
    }
  }, [adminToken])

  useEffect(() => {
    // Fetch activities when filter changes
    if (adminToken) {
      fetchActivities()
    }
  }, [activityFilter, adminToken])

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin-stats/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.data && res.data.data) {
        setStats({
          totalUsers: res.data.data.totalUsers || 0,
          totalRestaurants: res.data.data.totalRestaurants || 0,
          totalMeals: res.data.data.totalMeals || 0,
          totalRevenue: res.data.data.totalRevenue || 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch stats', err)
      // Fallback to mock data if API fails
      setStats({
        totalUsers: 0,
        totalRestaurants: 0,
        totalMeals: 0,
        totalRevenue: 0
      })
    }
  }

  const fetchPending = async () => {
    try {
      const res = await api.get('/restaurants/pending', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.data && res.data.data) setPendingRestaurants(res.data.data)
    } catch (err) {
      console.error('Failed to fetch pending restaurants', err)
    }
  }

  const fetchActivities = async () => {
    try {
      let url = '/admin-activities?limit=50'
      if (activityFilter === 'customers') {
        url += '&userType=customer'
      } else if (activityFilter === 'owners') {
        url += '&userType=restaurant_owner'
      }
      
      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.data && res.data.data) {
        setActivities(res.data.data.activities || [])
      }
    } catch (err) {
      console.error('Failed to fetch activities', err)
    }
  }

  const fetchAllOrders = async () => {
    try {
      const res = await api.get('/orders', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.data && res.data.data) {
        setOrders(Array.isArray(res.data.data) ? res.data.data : (res.data.data.orders || []))
      }
    } catch (err) {
      console.error('Failed to fetch all orders', err)
    }
  }

  const handleOrderAction = async (orderId, newStatus, reason) => {
    if (!orderId) {
      console.error('handleOrderAction called without orderId. Aborting.')
      return
    }
    try {
      const body = { status: newStatus }
      if (newStatus === 'rejected' && reason) body.reason = reason
      const res = await api.put(`/orders/${orderId}/status`, body, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.data && res.data.data) {
        // Refresh orders list
        fetchAllOrders()
      }
    } catch (err) {
      console.error('Failed to update order status', err)
      alert('Failed to update order status')
    }
  }

  const decide = async (id, status) => {
    try {
      await api.put(`/restaurants/${id}/decision`, { status, adminMessage }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      setAdminMessage('')
      setSelected(null)
      fetchPending()
      alert(`Restaurant ${status}`)
    } catch (err) {
      console.error('Decision error', err)
      alert('Failed to update')
    }
  }

  const handleAdminRegister = async (e) => {
    e.preventDefault()
    setRegisterError('')
    
    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match')
      return
    }
    
    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters')
      return
    }

    setRegisterLoading(true)

    try {
      const response = await api.post('/admin-auth/register', {
        fullName,
        email: registerEmail,
        password: registerPassword,
        confirmPassword
      })
      
      if (response.data?.success) {
        setRegisterSuccess(true)
        // Reset form
        setFullName('')
        setRegisterEmail('')
        setRegisterPassword('')
        setConfirmPassword('')
        // Switch to login mode after successful registration
        setTimeout(() => {
          setAuthMode('login')
          setRegisterSuccess(false)
        }, 2000)
      }
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setAdminLoginError('')
    setAdminLoginLoading(true)

    try {
      const response = await api.post('/admin-auth/login', {
        email: adminEmail,
        password: adminPassword
      })
      
      if (response.data?.success && response.data?.data?.token) {
        const token = response.data.data.token
        const adminData = response.data.data.admin
        
        localStorage.setItem('adminToken', token)
        localStorage.setItem('adminUser', JSON.stringify(adminData))
        
        setAdminToken(token)
        setAdminUser(adminData)
        setAdminEmail('')
        setAdminPassword('')
      } else {
        setAdminLoginError('Invalid credentials or admin not active')
      }
    } catch (err) {
      setAdminLoginError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setAdminLoginLoading(false)
    }
  }

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    setAdminToken(null)
    setAdminUser(null)
    setAdminEmail('')
    setAdminPassword('')
    setStats({
      totalUsers: 0,
      totalRestaurants: 0,
      totalMeals: 0,
      totalRevenue: 0
    })
    setPendingRestaurants([])
    setSelected(null)
    setAdminLoginError('')
    setRegisterError('')
    navigate('/')
  }

  // Check authorization - if no admin token, show login/register modal
  if (!adminToken || !adminUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        {/* Blurred background */}
        <div className="fixed inset-0 bg-gray-50 backdrop-blur-sm z-40"></div>

        {/* Modal form */}
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            {authMode === 'login' ? (
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Admin Login</h2>
                <p className="text-gray-600 text-center mb-6">Access the admin dashboard with your credentials.</p>

                {adminLoginError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {adminLoginError}
                  </div>
                )}

                <form onSubmit={handleAdminLogin} autoComplete="off">
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoginLoading}
                    className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {adminLoginLoading ? 'Logging in...' : 'Admin Login'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600 text-sm">Don't have an admin account?</p>
                  <button
                    onClick={() => {
                      setAuthMode('register')
                      setAdminLoginError('')
                    }}
                    className="text-blue-600 font-semibold hover:underline mt-2"
                  >
                    Register here
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Admin Registration</h2>
                <p className="text-gray-600 text-center mb-6">Create a new admin account.</p>

                {registerSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    ✓ Registration successful! Redirecting to login...
                  </div>
                )}

                {registerError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {registerError}
                  </div>
                )}

                <form onSubmit={handleAdminRegister} autoComplete="off">
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="off"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Password</label>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {registerLoading ? 'Creating account...' : 'Register'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600 text-sm">Already have an account?</p>
                  <button
                    onClick={() => {
                      setAuthMode('login')
                      setRegisterError('')
                    }}
                    className="text-blue-600 font-semibold hover:underline mt-2"
                  >
                    Login here
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {adminUser?.fullName}. Manage your platform efficiently.</p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleAdminLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>

          {/* Notifications bell for pending restaurants */}
          <div className="relative ml-4">
            <button onClick={() => setShowNotif(s => !s)} className="relative p-3 rounded-lg hover:bg-gray-100">
              <Bell className="w-6 h-6 text-gray-700" />
              {pendingRestaurants.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-2">{pendingRestaurants.length}</span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b font-semibold">Pending Restaurant Notifications</div>
                <div className="max-h-72 overflow-auto">
                  {pendingRestaurants.length === 0 ? (
                    <div className="p-3 text-sm text-gray-600">No pending restaurants.</div>
                  ) : (
                    pendingRestaurants.map(r => (
                      <div key={r._id} className="p-3 hover:bg-gray-50 border-b last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800">{r.name}</div>
                            <div className="text-xs text-gray-500">Owner: {r.owner?.fullName || r.ownerName} • {r.contact?.phone || ''}</div>
                            <div className="text-sm text-gray-700 mt-2">{r.description?.slice(0, 140)}</div>
                          </div>
                          <div className="pl-3">
                            <button onClick={() => { setSelected(r); setShowNotif(false); }} className="bg-blue-500 text-white px-3 py-1 rounded">Review</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 text-center">
                  <button onClick={() => { setShowNotif(false); }} className="text-sm text-gray-600">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded ${activeTab === 'menu' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Menu</button>
            <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Orders</button>
            <button onClick={() => setActiveTab('activities')} className={`px-4 py-2 rounded ${activeTab === 'activities' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Activities</button>
          </div>
        </div>

        {activeTab === 'menu' && (
          <AdminMenuPage adminToken={adminToken} />
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Activities</h2>
            
            {/* Filter buttons */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setActivityFilter('all')}
                className={`px-4 py-2 rounded ${activityFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                All Activities
              </button>
              <button
                onClick={() => setActivityFilter('customers')}
                className={`px-4 py-2 rounded ${activityFilter === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Customer Activities
              </button>
              <button
                onClick={() => setActivityFilter('owners')}
                className={`px-4 py-2 rounded ${activityFilter === 'owners' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Owner Activities
              </button>
            </div>

            {activities.length === 0 ? (
              <p className="text-gray-600">No activities found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Activity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map(activity => (
                      <tr key={activity._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold text-gray-800">{activity.userName}</div>
                            <div className="text-xs text-gray-500">{activity.userEmail}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            activity.userType === 'customer' ? 'bg-blue-100 text-blue-800' :
                            activity.userType === 'restaurant_owner' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {activity.userType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800 font-semibold">{activity.activityType}</td>
                        <td className="py-3 px-4 text-gray-700 max-w-xs">{activity.description}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            activity.status === 'success' ? 'bg-green-100 text-green-800' :
                            activity.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage All Orders</h2>
            
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-gray-600">No orders found.</p>
              ) : (
                orders.map(order => (
                  <div key={order._id || order.id} className="bg-gray-50 rounded-xl shadow-md p-6 hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{order._id || order.id}</h3>
                        <p className="text-gray-700 font-semibold">{order.customerName || order.customer || 'Unknown'}</p>
                        <p className="text-gray-600">{order.menuName || order.itemName || order.items || '-'}</p>
                        <p className="text-sm text-gray-500 mt-1">{order.createdAt ? new Date(order.createdAt).toLocaleString() : (order.time || '')}</p>
                        <p className="text-sm text-gray-500 mt-1">Qty: {order.quantity || order.qty || 1} • Total: Rs {order.totalPrice || order.total || order.price}</p>
                        {order.status === 'rejected' && order.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2"><strong>Reason:</strong> {order.rejectionReason}</p>
                        )}
                        {order.completedAt && (
                          <p className="text-sm text-blue-600 mt-1"><strong>Completed at:</strong> {new Date(order.completedAt).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="text-right pl-4">
                        <p className="text-2xl font-bold text-green-600">Rs {order.totalPrice || order.total || order.price}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'in_process' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {String(order.status || '').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {order.status !== 'completed' && order.status !== 'rejected' && (
                      <div className="flex gap-2 mt-4">
                        {order.status === 'pending' && (
                          <>
                            <button onClick={() => handleOrderAction(order._id || order.id, 'approved')} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition">
                              <Check className="inline w-4 h-4 mr-1" /> Approve
                            </button>
                            <button onClick={async () => {
                                const r = window.prompt('Rejection reason (optional)', 'Item out of stock');
                                await handleOrderAction(order._id || order.id, 'rejected', r || undefined);
                              }} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition">
                              <X className="inline w-4 h-4 mr-1" /> Reject
                            </button>
                          </>
                        )}
                        {order.status === 'approved' && (
                          <button onClick={() => handleOrderAction(order._id || order.id, 'in_process')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition">
                            Mark In Process
                          </button>
                        )}
                        {order.status === 'in_process' && (
                          <button onClick={() => handleOrderAction(order._id || order.id, 'completed')} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition">
                            Mark Completed
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminDashboard