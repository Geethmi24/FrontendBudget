   import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Bell, Package, DollarSign, Star, Clock, TrendingUp, Users, ShoppingBag, Settings, Menu as MenuIcon, Plus, Edit, Trash2, Check, X, Eye, MessageSquare, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import ProfileForm from '../../components/ProfileForm';
import MenuPage from './MenuPage';
import ReviewsPage from './Reviews';
import RestaurantOverview from './RestaurantOverview';
import DistrictSelector from '../../components/DistrictSelector';

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('owner');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'order', message: 'New order #1234 received', time: '2 min ago', unread: true },
    { id: 2, type: 'review', message: 'New 5-star review from John', time: '15 min ago', unread: true },
    { id: 3, type: 'stock', message: 'Chicken Biryani is low in stock', time: '1 hour ago', unread: false }
  ]);
  
  const [orders, setOrders] = useState([]);
  const [restaurantInfo, setRestaurantInfo] = useState({ name: 'My Restaurant', owner: '', location: '', contact: '', email: '', cuisine: '', serviceTypes: [], openHours: '', description: '' });
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  
  
  // Load the logged-in owner's restaurant and set restaurant info header
  useEffect(() => {
    const loadOwnerRestaurant = async () => {
      if (!user) return;
      try {
        const rres = await api.get('/restaurants/owner/my-restaurants');
        const list = rres?.data?.data || [];
        if (list.length > 0) {
          const r = list[0];
          setRestaurantInfo(prev => ({
            ...prev,
            _id: r._id || r.id || prev._id,
            name: r.name || r.restaurantName || prev.name,
            owner: (r.owner && (r.owner.fullName || r.owner.name)) || prev.owner,
            location: r.location || (r.address && (r.address.street || r.address)) || prev.location,
            contact: (r.contact && (r.contact.phone || r.contact)) || prev.contact,
            email: (r.contact && (r.contact.email)) || prev.email,
            cuisine: Array.isArray(r.cuisineType) ? (r.cuisineType.join(', ')) : (r.cuisineType || prev.cuisine)
          }));
        }
      } catch (err) {
        console.error('Could not fetch owner restaurant for dashboard header', err);
      }
    };
    loadOwnerRestaurant();
  }, [user]);

  // Load saved district selection (persisted in localStorage)
  useEffect(() => {
    try {
      const d = localStorage.getItem('selectedDistrict');
      if (d) setSelectedDistrict(d);
    } catch (e) {}
  }, []);

  const handleDistrictChange = (d) => {
    try { localStorage.setItem('selectedDistrict', d); } catch (e) {}
    setSelectedDistrict(d);
    // keep owner tab active
    setActiveTab('owner');
  };

  // Load orders from localStorage for this restaurant and listen for updates
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const rid = restaurantInfo._id || restaurantInfo.id;
        if (!rid) { setOrders([]); return; }
        // try API fetch
        try {
          const res = await api.get(`/orders/restaurant/${rid}`);
          const list = res.data && res.data.data ? res.data.data : [];
          setOrders(list);
          return;
        } catch (err) {
          // fallback to localStorage
        }
        const all = JSON.parse(localStorage.getItem('orders') || '[]');
        const filtered = all.filter(o => o.restaurantId === rid);
        filtered.sort((a, b) => (b.time || '').localeCompare(a.time || '') || (b.id || '').localeCompare(a.id || ''));
        setOrders(filtered);
      } catch (e) {
        setOrders([]);
      }
    };
    loadOrders();
    const onStorage = () => loadOrders();
    window.addEventListener('storageUpdated', onStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storageUpdated', onStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, [restaurantInfo._id]);

  // Allow restaurant owner to update order status and persist to localStorage
  const handleOrderAction = (orderId, newStatus, reason) => {
    if (!orderId) {
      console.error('handleOrderAction called without orderId. Aborting.');
      return;
    }
    (async () => {
      try {
        let updatedOrder = null;
        try {
          const body = { status: newStatus };
          if (newStatus === 'rejected' && reason) body.reason = reason;
          const res = await api.put(`/orders/${orderId}/status`, body);
          updatedOrder = res.data && res.data.data ? res.data.data : null;
        } catch (err) {
          console.error('API order status update failed', err);
        }

        if (updatedOrder) {
          // Persist a local message so customer tabs receive an update event
          try {
            const messages = JSON.parse(localStorage.getItem('messages') || '[]');
            const now = new Date().toLocaleString();
            messages.push({
              id: `m_${Date.now()}`,
              toCustomerId: updatedOrder.customerId || updatedOrder.customer,
              customer: updatedOrder.customerName || updatedOrder.customer,
              orderId: updatedOrder._id || updatedOrder.id,
              itemName: updatedOrder.menuName || updatedOrder.itemName || updatedOrder.items,
              status: updatedOrder.status,
              text: updatedOrder.status === 'rejected' ? (`Your order for ${updatedOrder.menuName || updatedOrder._id} was rejected${updatedOrder.rejectionReason ? ' because ' + updatedOrder.rejectionReason : ''}.`) : `Your order ${updatedOrder.menuName || updatedOrder._id || updatedOrder.id} is now ${updatedOrder.status}`,
              time: now
            });
            localStorage.setItem('messages', JSON.stringify(messages));
            window.dispatchEvent(new Event('storageUpdated'));
          } catch (e) {
            console.error('Could not create local message for customer', e);
          }

          // Refresh order list from API
          try {
            const rid = restaurantInfo._id || restaurantInfo.id;
            if (rid) {
              const r = await api.get(`/orders/restaurant/${rid}`);
              const list = r.data && r.data.data ? r.data.data : [];
              setOrders(list);
            }
          } catch (err) {
            console.error('failed to refresh orders', err);
          }
          return;
        }

        // Fallback to localStorage update if API not available
        const all = JSON.parse(localStorage.getItem('orders') || '[]');
        const idx = all.findIndex(o => o.id === orderId || o._id === orderId);
        if (idx !== -1) {
          all[idx].status = newStatus === 'approved' ? 'completed' : newStatus;
          all[idx].updatedAt = new Date().toLocaleString();
          localStorage.setItem('orders', JSON.stringify(all));
          setOrders(prev => prev.map(o => ((o._id === orderId || o.id === orderId) ? { ...o, status: all[idx].status } : o)));

          try {
            const messages = JSON.parse(localStorage.getItem('messages') || '[]');
            const now = new Date().toLocaleString();
            messages.push({
              id: `m_${Date.now()}`,
              toCustomerId: all[idx].customerId || all[idx].customer,
              customer: all[idx].customerName || all[idx].customer,
              orderId: all[idx]._1 || all[idx].id,
              itemName: all[idx].menuName || all[idx].itemName || all[idx].items,
              status: all[idx].status,
              text: all[idx].status === 'rejected' ? (`Your order for ${all[idx].menuName || all[idx].menuName || all[idx].id} was rejected${all[idx].rejectionReason ? ' because ' + all[idx].rejectionReason : ''}.`) : `Your order ${all[idx].menuName || all[idx]._id || all[idx].id} is now ${all[idx].status}`,
              time: now
            });
            localStorage.setItem('messages', JSON.stringify(messages));
            window.dispatchEvent(new Event('storageUpdated'));
          } catch (e) {
            console.error('Could not push fallback message', e);
          }
        }
      } catch (e) {
        console.error('Could not update order status', e);
      }
    })();
  };

  
  
  // Menu items state and handlers (shared across the Menu UI)
  const [menuItems, setMenuItems] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [replyingReview, setReplyingReview] = useState(null);

  const [stats, setStats] = useState({ dailyOrders: 0, monthlySales: 0, pendingOrders: 0, completedOrders: 0, rating: '0.0', inProgress: 0 });
  const [salesData, setSalesData] = useState([]);
  const [topMeals, setTopMeals] = useState([]);
  const [orderDistribution, setOrderDistribution] = useState([]);

  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { updateUser } = useAuth();
  const [addingMenu, setAddingMenu] = useState(false);

  const handleMenuToggle = async (id) => {
    const existing = menuItems.find(it => it.id === id);
    const newAvailable = existing ? !existing.available : true;
    setMenuItems(prev => prev.map(it => it.id === id ? { ...it, available: newAvailable } : it));
    try {
      await api.put(`/meals/${id}`, { isAvailable: newAvailable });
    } catch (err) {
      console.error('toggle failed', err);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    const item = menuItems.find(m => m.id === id);
    if (item && typeof id === 'string' && currentRestaurantId) {
      try {
        await api.put(`/meals/${id}`, { isAvailable: false });
        setMenuItems(prev => prev.filter(it => it.id !== id));
      } catch (err) {
        console.error('Failed to delete meal', err);
        alert('Could not delete menu item');
      }
    } else {
      setMenuItems(prev => prev.filter(it => it.id !== id));
    }
  };
  

  const handleReplyReview = (reviewId, reply) => {
    setReviews(reviews.map(review => 
      review.id === reviewId ? { ...review, replied: true, reply } : review
    ));
    setReplyingReview(null);
  };

  const unreadCount = notifications.filter(n => n.unread).length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1) : '0.0';

  // Overview Tab
  const OverviewSection = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={<ShoppingBag />} title="Daily Orders" value={stats.dailyOrders} color="blue" />
        <StatCard icon={<DollarSign />} title="Monthly Sales" value={`Rs ${stats.monthlySales.toLocaleString()}`} color="green" />
        <StatCard icon={<Clock />} title="Pending Orders" value={stats.pendingOrders} color="yellow" />
        <StatCard icon={<Check />} title="Completed" value={stats.completedOrders} color="green" />
        <StatCard icon={<Star />} title="Rating" value={stats.rating} color="orange" />
        <StatCard icon={<Package />} title="In Progress" value={stats.inProgress} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Weekly Sales</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Top Selling Meals</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topMeals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Distribution */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Order Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={orderDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
              {orderDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Orders Tab
  const OrdersSection = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">All Orders</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Pending</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">History</button>
        </div>
      </div>

      {orders.map(order => (
        <div key={order._id || order.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{order._id || order.id} - {order.customerName || order.customer}</h3>
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
            <div className="text-right">
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
              {/* PDF download removed for orders page */}
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
      ))}
    </div>
  );

  // Menu Tab
  const MenuSection = () => {
    const [form, setForm] = useState({ name: '', price: '', originalPrice: '', discount: '', category: 'Rice&Curry', description: '', isAvailable: true });

    useEffect(() => {
      // When Menu tab opens, try to fetch owner's restaurant and its meals
      const fetchOwnerRestaurant = async () => {
        try {
          const res = await api.get('/restaurants/owner/my-restaurants');
          if (res.data && res.data.data && res.data.data.length > 0) {
            const r = res.data.data[0];
            setRestaurantInfo(prev => ({ ...prev, name: r.name }));
            setCurrentRestaurantId(r._id || r.id);

            // fetch meals for restaurant
            const mealsRes = await api.get(`/meals?restaurant=${r._id || r.id}&limit=100`);
            if (mealsRes.data && mealsRes.data.data) {
              const mapped = mealsRes.data.data.map(m => ({ id: m._id, name: m.name, price: m.price, originalPrice: m.originalPrice ? m.originalPrice : undefined, available: !!m.isAvailable }));
              setMenuItems(mapped);
            }
          }
        } catch (err) {
          console.error('Could not fetch owner restaurant or meals', err);
        }
      };

      if (activeTab === 'menu' && user) fetchOwnerRestaurant();
    }, [activeTab, user]);

    const computeOriginal = (priceVal, discountVal) => {
      const priceNum = parseFloat(priceVal) || 0;
      const d = String(discountVal || '').trim();
      if (!d) return undefined;
      if (d.endsWith('%')) {
        const pct = parseFloat(d.replace('%', '')) || 0;
        if (pct > 0 && pct < 100) {
          return Math.round((priceNum / (1 - pct / 100)));
        }
        return undefined;
      }
      const discAmt = parseFloat(d) || 0;
      if (discAmt > 0) {
        return Math.round(priceNum - discAmt);
      }
      return undefined;
    };

    const handleFormChange = (e) => {
      const { name, value, type, checked } = e.target;

      setForm(f => {
        const next = { ...f, [name]: type === 'checkbox' ? checked : value };

        // Track manual edits to fields
        if (name === 'originalPrice') {
          next._manualOriginal = value !== '' && value !== undefined && value !== null;
        }
        if (name === 'discount') {
          next._manualDiscount = value !== '' && value !== undefined && value !== null;
        }
        if (name === 'price') {
          next._manualPrice = value !== '' && value !== undefined && value !== null;
        }

        // 1) If price and discount exist -> auto compute originalPrice (unless manually set)
        if (next.price && next.discount && !next._manualOriginal) {
          const auto = computeOriginal(next.price, next.discount);
          next.originalPrice = auto;
        }

        // 2) If originalPrice and discount exist -> auto compute price (unless manually set)
        if (next.originalPrice && next.discount && !next._manualPrice) {
          const d = String(next.discount).trim();
          const origNum = parseFloat(next.originalPrice) || 0;
          if (d.endsWith('%')) {
            const pct = parseFloat(d.replace('%', '')) || 0;
            if (pct >= 0 && pct < 100) {
              next.price = Math.round(origNum * (1 - pct / 100));
            }
          } else {
            const discAmt = parseFloat(d) || 0;
            if (discAmt >= 0) {
              next.price = Math.round(origNum - discAmt);
            }
          }
        }

        // 3) If price and originalPrice exist -> auto compute discount (unless manually set)
        if (next.price && next.originalPrice && !next._manualDiscount) {
          const priceNum = parseFloat(next.price) || 0;
          const origNum = parseFloat(next.originalPrice) || 0;
          if (origNum > 0 && origNum > priceNum) {
            const pct = Math.round(((origNum - priceNum) / origNum) * 100);
            next.discount = `${pct}%`;
          }
        }

        return next;
      });
    };

    const submitNewItem = async (e) => {
      e.preventDefault();
      if (!currentRestaurantId) return alert('Please create your restaurant first in Owner Restaurant tab.');
      // compute prices: form.price is the selling price; if discount provided, compute originalPrice
      const priceVal = parseFloat(form.price) || 0;
      let originalPriceVal = form.originalPrice ? parseFloat(form.originalPrice) : undefined;
      if (!originalPriceVal && form.discount) {
        const d = String(form.discount).trim();
        if (d.endsWith('%')) {
          const pct = parseFloat(d.replace('%', '')) || 0;
          if (pct > 0 && pct < 100) {
            originalPriceVal = Math.round((priceVal / (1 - pct / 100)));
          }
        } else {
          // treat as absolute discount amount
          const discAmt = parseFloat(d) || 0;
          if (discAmt > 0) {
            originalPriceVal = Math.round(priceVal + discAmt);
          }
        }
      }

      const payload = {
        name: form.name,
        description: form.description || form.name,
        price: priceVal,
        originalPrice: originalPriceVal,
        restaurant: currentRestaurantId,
        category: form.category,
        isAvailable: !!form.isAvailable
      };

      try {
        const res = await api.post('/meals', payload);
        if (res.data && res.data.success) {
          const m = res.data.data;
          setMenuItems(prev => [{ id: m._id || m.id, name: m.name, price: m.price, originalPrice: m.originalPrice ? m.originalPrice : undefined, available: !!m.isAvailable }, ...prev]);
          setAddingMenu(false);
          setForm({ name: '', price: '', originalPrice: '', discount: '', category: 'Rice&Curry', description: '', isAvailable: true });
        }
      } catch (err) {
        console.error('Error creating meal', err);
        alert('Failed to add menu item');
      }
    };
    const computeActualPrice = () => {
      const priceNum = parseFloat(form.price) || 0;
      const d = String(form.discount || '').trim();
      if (!d) return priceNum;
      if (d.endsWith('%')) {
        const pct = parseFloat(d.replace('%', '')) || 0;
        return Number((priceNum - (priceNum * (pct / 100))).toFixed(2));
      }
      const discAmt = parseFloat(d) || 0;
      return Number(Math.max(0, priceNum - discAmt).toFixed(2));
    };

    const filtered = menuItems.filter(i => i.name.toLowerCase().includes((form.search || '').toLowerCase()) || (i.description || '').toLowerCase().includes((form.search || '').toLowerCase()));

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Add Menus panel */}
        <aside className="md:col-span-1">
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Add Menus</h3>
              <button onClick={() => setAddingMenu(a => !a)} className="text-sm text-gray-600">{addingMenu ? 'Close' : 'Open'}</button>
            </div>

            {addingMenu ? (
              <form onSubmit={submitNewItem} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select name="category" value={form.category} onChange={handleFormChange} className="w-full border p-2 rounded">
                    <option>Rice&Curry</option>
                    <option>Drinks</option>
                    <option>Shorties</option>
                    <option>Sweets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <input name="name" value={form.name} onChange={handleFormChange} className="w-full border p-2 rounded" required />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input name="price" value={form.price} onChange={handleFormChange} type="number" step="0.01" className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Discount</label>
                    <input name="discount" value={form.discount} onChange={handleFormChange} className="w-full border p-2 rounded" placeholder="10% or 50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Actual Price</label>
                  <div className="w-full border p-2 rounded bg-gray-50">{computeActualPrice()}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" value={form.description} onChange={handleFormChange} className="w-full border p-2 rounded" rows={3} />
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleFormChange} />
                    <span className="text-sm">Available</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
                  <button type="button" onClick={() => setAddingMenu(false)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="text-sm text-gray-500">Click "Open" to add a new menu item.</div>
            )}
          </div>
        </aside>

        {/* Right: list + actions */}
        <section className="md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <div className="w-full md:w-1/2">
              <input placeholder="Search..." value={form.search || ''} onChange={handleFormChange} name="search" className="w-full border p-2 rounded" />
            </div>
              <div className="ml-4">
              <button onClick={() => setAddingMenu(true)} className="bg-orange-500 text-white px-4 py-2 rounded"><Plus className="inline w-4 h-4" /> Add Item</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                <div className="text-4xl text-center mb-4">🍽️</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{item.name}</h3>
                <p className="text-2xl font-bold text-green-600 mb-1">Rs {item.price}</p>
                {item.originalPrice ? (
                  <p className="text-sm text-gray-500 mb-3 line-through">Original: Rs {item.originalPrice} • Discount: {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%</p>
                ) : null}
                <div className="flex gap-2">
                  <button onClick={() => handleMenuToggle(item.id)} className={`flex-1 py-2 rounded-lg font-semibold transition ${item.available ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>
                    {item.available ? 'Available' : 'Out of Stock'}
                  </button>
                  <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteMenu(item.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  // Reviews Tab
  const ReviewsSection = () => (
    <div>
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg p-8 mb-6 text-white">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-2">{avgRating} <Star className="inline w-8 h-8 fill-current" /></h2>
          <p className="text-xl">Average Rating from {reviews.length} reviews</p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{review.customer}</h3>
                <div className="flex gap-1 my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
              <span className="text-sm text-gray-500">{review.date}</span>
            </div>
            <p className="text-gray-700 mb-3">{review.comment}</p>
            
            {review.replied ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm font-semibold text-blue-800 mb-1">Your Reply:</p>
                <p className="text-sm text-gray-700">{review.reply}</p>
              </div>
            ) : (
              replyingReview === review.id ? (
                <div className="mt-3">
                  <textarea 
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500" 
                    rows="3" 
                    placeholder="Type your reply..."
                    id={`reply-${review.id}`}
                  ></textarea>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => {
                        const reply = document.getElementById(`reply-${review.id}`).value;
                        if (reply.trim()) handleReplyReview(review.id, reply);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600"
                    >
                      Send Reply
                    </button>
                    <button 
                      onClick={() => setReplyingReview(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setReplyingReview(review.id)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-semibold hover:text-blue-700"
                >
                  <MessageSquare className="w-4 h-4" /> Reply to Customer
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Settings Tab
  const SettingsSection = () => {
    const [form, setForm] = useState({
      name: restaurantInfo.name || '',
      owner: restaurantInfo.owner || '',
      location: restaurantInfo.location || '',
      contact: restaurantInfo.contact || '',
      email: restaurantInfo.email || '',
      cuisine: restaurantInfo.cuisine || '',
      serviceTypes: restaurantInfo.serviceTypes || [],
      openHours: restaurantInfo.openHours || '',
      description: restaurantInfo.description || '',
      image: null,
      photoURLField: ''
    });

    useEffect(() => {
      setForm({
        name: restaurantInfo.name || '',
        owner: restaurantInfo.owner || '',
        location: restaurantInfo.location || '',
        contact: restaurantInfo.contact || '',
        email: restaurantInfo.email || '',
        cuisine: restaurantInfo.cuisine || '',
        serviceTypes: restaurantInfo.serviceTypes || [],
        openHours: restaurantInfo.openHours || '',
        description: restaurantInfo.description || '',
        image: null,
        photoURLField: restaurantInfo.photoURL || ''
      });
    }, [restaurantInfo]);

    const handleChange = (e) => {
      const { name, value, type, checked, files } = e.target;
      if (type === 'checkbox') return;
      if (type === 'file') {
        setForm(f => ({ ...f, [name]: files[0] }));
        return;
      }
      setForm(f => ({ ...f, [name]: value }));
    };

    const toggleServiceLocal = (service) => {
      setForm(f => {
        const exists = (f.serviceTypes || []).includes(service);
        return { ...f, serviceTypes: exists ? f.serviceTypes.filter(s => s !== service) : [...(f.serviceTypes || []), service] };
      });
    };

    const parseOpenHours = (text) => {
      const parts = String(text || '').split('-').map(p => p.trim());
      const open = parts[0] || '';
      const close = parts[1] || '';
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const obj = {};
      days.forEach(d => { obj[d] = { open, close }; });
      return obj;
    };

    const handleSave = async (e) => {
      e.preventDefault();
      if (!restaurantInfo._id) return alert('No restaurant selected');
      const payload = {
        name: form.name || '',
        description: form.description || '',
        location: form.location || '',
        contact: { phone: form.contact || '', email: form.email || '' },
        cuisineType: form.cuisine ? form.cuisine.split(',').map(s => s.trim()) : [],
        serviceTypes: form.serviceTypes || [],
        openingHours: parseOpenHours(form.openHours || '')
      };

      try {
        const res = await api.put(`/restaurants/${restaurantInfo._id}`, payload);
        if (res.data && res.data.success) {
          const updated = res.data.data;
          setRestaurantInfo(prev => ({
            ...prev,
            name: updated.name || prev.name,
            location: updated.location || (updated.address && (updated.address.street || updated.address)) || prev.location,
            contact: (updated.contact && (updated.contact.phone || updated.contact)) || prev.contact,
            email: (updated.contact && (updated.contact.email)) || prev.email,
            cuisine: Array.isArray(updated.cuisineType) ? updated.cuisineType.join(', ') : (updated.cuisineType || prev.cuisine),
            serviceTypes: updated.serviceTypes || prev.serviceTypes,
            openHours: form.openHours || prev.openHours,
            description: updated.description || prev.description
          }));

          // if an image file or direct URL provided, upload/save it
          try {
            if (form.photoURLField) {
              await api.post(`/restaurants/${restaurantInfo._id}/photo`, { photoURL: form.photoURLField });
            } else if (form.image) {
              const fd = new FormData();
              fd.append('image', form.image);
              await api.post(`/restaurants/${restaurantInfo._id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
          } catch (imgErr) {
            console.error('Failed to save restaurant photo', imgErr);
          }

          alert('Saved successfully');
        } else {
          alert('Failed to save changes');
        }
      } catch (err) {
        console.error('Save settings error', err);
        alert('Error saving settings');
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Restaurant Settings</h2>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Restaurant Name</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Owner Name</label>
              <input type="text" value={form.owner} readOnly className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Location</label>
              <input name="location" type="text" value={form.location} onChange={handleChange} className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Contact Number</label>
              <input name="contact" type="text" value={form.contact} onChange={handleChange} className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Cuisine Type</label>
              <input name="cuisine" type="text" value={form.cuisine} onChange={handleChange} className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-2 text-gray-700">Service Types</label>
            <div className="flex gap-4">
              {['Dine-In', 'Takeaway'].map(service => (
                <label key={service} className="flex items-center gap-2">
                  <input type="checkbox" checked={(form.serviceTypes || []).includes(service)} onChange={() => toggleServiceLocal(service)} className="w-5 h-5" />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-2 text-gray-700">Opening Hours</label>
            <input name="openHours" type="text" value={form.openHours} onChange={handleChange} className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400" />
          </div>

          <div>
            <label className="block font-semibold mb-2 text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows="4" className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-400"></textarea>
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl text-lg font-semibold shadow-xl hover:opacity-90 transition">Save Changes</button>
        </form>
      </div>
    );
  };

  // Owner Restaurant Tab
  const OwnerSection = () => {
    const [ownerRestaurants, setOwnerRestaurants] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [form, setForm] = useState({
      restaurantName: '',
      location: '',
      serviceTypes: ['Dine-In'],
      cuisine: '',
      priceMin: '',
      priceMax: '',
      specialty: '',
      openHours: '',
      contactNumber: '',
      email: user ? (user.email || '') : '',
      description: '',
  
      hasTakeaway: true,
      hasParking: false,
      image: null,
      photoURLField: ''
    });

    useEffect(() => {
      if (user) {
        setForm(f => ({ ...f, ownerName: user.fullName || user.name, email: user.email || f.email }));
      }
      // fetch owner's restaurants and any admin messages
      const fetchMine = async () => {
        try {
          const res = await api.get('/restaurants/owner/my-restaurants');
          if (res.data && res.data.data) {
            setOwnerRestaurants(res.data.data);
            const notifs = res.data.data
              .filter(r => r.approvalStatus && r.approvalStatus !== 'pending')
              .map(r => ({ id: r._id, status: r.approvalStatus, message: r.adminMessage, name: r.name }));
            setNotifications(notifs);
          }
        } catch (err) {
          console.error('Could not fetch owner restaurants', err);
        }
      };
      if (user) fetchMine();
    }, [user]);

    const handleChange = (e) => {
      const { name, value, type, checked, files } = e.target;
      if (type === 'checkbox') {
        setForm({ ...form, [name]: checked });
      } else if (type === 'file') {
        setForm({ ...form, [name]: files[0] });
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const toggleService = (service) => {
      setForm(f => {
        const exists = f.serviceTypes.includes(service);
        return { ...f, serviceTypes: exists ? f.serviceTypes.filter(s => s !== service) : [...f.serviceTypes, service] };
      });
    };

    const parseOpenHours = (text) => {
      const parts = text.split('-').map(p => p.trim());
      const open = parts[0] || '';
      const close = parts[1] || '';
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const obj = {};
      days.forEach(d => { obj[d] = { open, close }; });
      return obj;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      const payload = {
        name: form.restaurantName || '',
        description: form.description ? (form.description + (form.specialty ? `\nSpecialty: ${form.specialty}` : '')) : (form.specialty || ''),
        location: form.location,
        district: selectedDistrict || undefined,
        contact: { phone: form.contactNumber, email: form.email },
        cuisineType: form.cuisine ? form.cuisine.split(',').map(s => s.trim()) : [],
        serviceTypes: form.serviceTypes,
        budgetRange: {
          min: form.priceMin ? parseInt(form.priceMin, 10) : undefined,
          max: form.priceMax ? parseInt(form.priceMax, 10) : undefined
        },
        openingHours: parseOpenHours(form.openHours),
        features: {
          hasTakeaway: !!form.hasTakeaway,
          hasParking: !!form.hasParking
        }
      };
      try {
        const res = await api.post('/restaurants', payload);
        if (res.data && res.data.success) {
          const created = res.data.data;

          // If a photo URL is provided, save it via API; otherwise if a file is selected, upload it
          try {
            if (form.photoURLField && created && (created._id || created.id)) {
              const rid = created._id || created.id;
              await api.post(`/restaurants/${rid}/photo`, { photoURL: form.photoURLField });
            } else if (form.image && created && (created._id || created.id)) {
              const rid = created._id || created.id;
              const fd = new FormData();
              fd.append('image', form.image);
              await api.post(`/restaurants/${rid}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
          } catch (imgErr) {
            console.error('Error saving/uploading photo', imgErr);
          }

          // refresh owner's restaurants and notifications
          const rres = await api.get('/restaurants/owner/my-restaurants');
          if (rres.data && rres.data.data) {
            setOwnerRestaurants(rres.data.data);
            const notifs = rres.data.data
              .filter(r => r.approvalStatus && r.approvalStatus !== 'pending')
              .map(r => ({ id: r._id, status: r.approvalStatus, message: r.adminMessage, name: r.name }));
            setNotifications(notifs);

            // update header info incl. photoURL
            if (rres.data.data.length > 0) {
              const r = rres.data.data[0];
              setRestaurantInfo(prev => ({
                ...prev,
                _id: r._id || r.id || prev._id,
                name: r.name || prev.name,
                owner: (r.owner && (r.owner.fullName || r.owner.name)) || prev.owner,
                location: r.location || (r.address && (r.address.street || r.address)) || prev.location,
                contact: (r.contact && (r.contact.phone || r.contact)) || prev.contact,
                email: (r.contact && (r.contact.email)) || prev.email,
                cuisine: Array.isArray(r.cuisineType) ? (r.cuisineType.join(', ')) : (r.cuisineType || prev.cuisine),
                photoURL: r.photoURL || (Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : prev.photoURL)
              }));
            }
          }

          // persist a lightweight summary of the created restaurant so other pages can prefill their forms
          try {
            const createdId = created?._id || created?.id;
            if (createdId && rres.data && rres.data.data) {
              const match = rres.data.data.find(x => (x._id === createdId) || (x._id === (created.id || created._id)) || (x.name === created.name));

              // normalize opening hours to a simple string (first day's interval) for reliable comparison
              const normalizeOpening = (oh) => {
                if (!oh) return ''
                if (typeof oh === 'string') return oh
                const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
                for (const d of days) {
                  const item = oh[d]
                  if (item) {
                    const open = item.open || item.opening || item.start || ''
                    const close = item.close || item.closing || item.end || ''
                    if (open || close) return `${open}${open && close ? ' - ' + close : ''}`
                  }
                }
                return ''
              }

              const normalizeFeatures = (f) => {
                if (!f) return []
                if (Array.isArray(f)) return f
                if (typeof f === 'object') {
                  const mapping = {
                    hasDelivery: 'Delivery',
                    hasTakeaway: 'Takeaway',
                    hasParking: 'Parking',
                    isVeg: 'Vegetarian'
                  }
                  return Object.keys(f).filter(k => f[k]).map(k => mapping[k] || k)
                }
                // comma separated string
                return String(f).split(',').map(s => s.trim()).filter(Boolean)
              }

              const photo = form.photoURLField || (match ? (match.photoURL || (Array.isArray(match.images) && match.images[0])) : (created.photoURL || ''))

              const ownerFormSummary = {
                _id: match ? (match._id || match.id) : (createdId || ''),
                ownerName: form.ownerName || (user && (user.fullName || user.name)) || '',
                name: form.restaurantName || (match ? match.name : created.name || ''),
                description: form.description || (match ? match.description : created.description) || '',
                location: form.location || (match ? match.location : created.location) || '',
                serviceTypes: form.serviceTypes || (match ? match.serviceTypes : created.serviceTypes) || [],
                cuisineType: form.cuisine ? form.cuisine.split(',').map(s => s.trim()) : (match ? match.cuisineType : created.cuisineType) || [],
                priceMin: form.priceMin || (match && match.budgetRange ? match.budgetRange.min : (created.priceMin || '')) || '',
                priceMax: form.priceMax || (match && match.budgetRange ? match.budgetRange.max : (created.priceMax || '')) || '',
                priceRange: (form.priceMin && form.priceMax) ? `${form.priceMin}-${form.priceMax}` : (match ? (match.priceRange || '') : (created.priceRange || '')),
                specialty: form.specialty || (match ? match.specialty : created.specialty) || '',
                openHours: normalizeOpening(form.openHours || (match ? match.openingHours : created.openingHours)),
                contactNumber: form.contactNumber || '',
                email: form.email || '',
                features: normalizeFeatures(match ? match.features : created.features || form.features),
                hasTakeaway: !!form.hasTakeaway,
                hasParking: !!form.hasParking,
                photoURL: photo || ''
              };
              const toStore = ownerFormSummary;
              localStorage.setItem('recentRestaurantForm', JSON.stringify(toStore));
            }
          } catch (storeErr) {
            console.error('Could not persist recent restaurant to localStorage', storeErr);
          }

          alert('Restaurant saved successfully');
        } else {
          alert('Failed to save restaurant');
        }
      } catch (err) {
        console.error('Save restaurant error:', err);
        alert('Error saving restaurant: ' + (err?.response?.data?.message || err.message));
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Owner Restaurant</h2>

        <div className="mb-4">
          <DistrictSelector value={selectedDistrict} onChange={handleDistrictChange} />
          {!selectedDistrict && (
            <div className="mt-3 text-sm text-gray-600">Please select your district before filling the restaurant form.</div>
          )}
          {selectedDistrict && selectedDistrict !== 'Matara' && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 rounded text-sm text-red-700">Access restricted to Matara district only. You selected <strong className="text-red-800">{selectedDistrict}</strong>. Only owners in Matara can create and manage restaurants here.</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notifications from admin for owner's restaurants */}
          {notifications.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
              <h4 className="font-semibold">Admin Messages</h4>
              {notifications.map(n => (
                <div key={n.id} className="text-sm text-gray-700 mt-2">
                  <strong>{n.name}:</strong> {n.status.toUpperCase()} — {n.message}
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Name</label>
            <input type="text" name="ownerName" value={user ? (user.fullName || user.name) : ''} readOnly className="w-full border p-3 rounded-xl shadow-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Restaurant Name</label>
            <input name="restaurantName" value={form.restaurantName} onChange={handleChange} className="w-full border p-3 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Types</label>
              <div className="flex gap-3 mt-2">
                {['Dine-In','Takeaway'].map(s => (
                  <label key={s} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.serviceTypes.includes(s)} onChange={() => toggleService(s)} />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cuisine (comma separated)</label>
              <input name="cuisine" value={form.cuisine} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price Range (min)</label>
              <input name="priceMin" value={form.priceMin} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price Range (max)</label>
              <input name="priceMax" value={form.priceMax} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Specialty</label>
              <input name="specialty" value={form.specialty} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Open Hours (e.g. "8:00 AM - 10:00 PM")</label>
            <input name="openHours" value={form.openHours} onChange={handleChange} className="w-full border p-3 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input name="contactNumber" value={form.contactNumber} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input name="email" value={form.email} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border p-3 rounded-xl" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Features</label>
            <div className="flex gap-4 mt-2">
              
              <label className="inline-flex items-center gap-2"><input type="checkbox" name="hasTakeaway" checked={form.hasTakeaway} onChange={handleChange} /> Takeaway</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" name="hasParking" checked={form.hasParking} onChange={handleChange} /> Parking</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Image (optional)</label>
            <input type="file" name="image" accept="image/*" onChange={handleChange} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">You can upload an image file or provide a public image URL below.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Photo URL (optional)</label>
            <input type="text" name="photoURLField" value={form.photoURLField} onChange={handleChange} placeholder="https://example.com/image.jpg" className="w-full border p-2 rounded mt-2" />
          </div>

          {(form.photoURLField || restaurantInfo.photoURL) && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">Current Photo Preview</label>
              <img src={form.photoURLField || restaurantInfo.photoURL} alt="Preview" className="w-40 h-28 object-cover rounded-md mt-2 shadow" />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={selectedDistrict !== 'Matara'}
              className={`px-6 py-2 rounded-xl font-semibold ${selectedDistrict === 'Matara' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            >
              Save Restaurant
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{restaurantInfo.name}</h1>
               
              {user && (
                <p className="text-lg font-semibold text-orange-600 mt-1">
                  Welcome, {user.fullName || user.name}!
                </p>
              )}
              {restaurantInfo && restaurantInfo.photoURL && (
                <img src={restaurantInfo.photoURL} alt="Restaurant" className="w-28 h-20 rounded-xl object-cover mt-3 shadow-md" />
              )}
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-full transition">
                <Bell className="w-6 h-6 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                  {(user && (user.fullName || user.name)) ? (user.fullName || user.name).charAt(0) : ''}
                </div>
                <button onClick={() => setIsProfileOpen(true)} className="font-semibold text-gray-800 text-left">
                  {user ? (user.fullName || user.name) : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Profile</h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-gray-500">Close</button>
            </div>
            <ProfileForm onClose={() => setIsProfileOpen(false)} onUpdated={(u) => { updateUser(u); setIsProfileOpen(false); setRestaurantInfo(prev => ({ ...prev, owner: u.fullName || prev.owner })); }} />
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-[72px] z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'owner', label: 'Owner Restaurant', icon: <Users className="w-4 h-4" /> },
              { id: 'menu', label: 'Menu', icon: <MenuIcon className="w-4 h-4" /> },
              { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
              { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" /> },
              { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'settings', label: 'Setting', icon: <Settings className="w-4 h-4" /> }
            ].map(tab => {
              const disabled = tab.id !== 'owner' && selectedDistrict !== 'Matara';
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (disabled) {
                      window.alert('Access restricted to Matara district only. Please select Matara in Owner Restaurant to continue.');
                      setActiveTab('owner');
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-b-4 border-orange-500 text-orange-600'
                      : (disabled ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800')
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'owner' && <OwnerSection />}
        {activeTab === 'overview' && <RestaurantOverview restaurantId={restaurantInfo._id || restaurantInfo.id} />}
        {activeTab === 'orders' && <OrdersSection />}
        {activeTab === 'menu' && <MenuPage />}
        {activeTab === 'reviews' && <ReviewsPage />}
        {activeTab === 'settings' && <SettingsSection />}
      </main>
    </div>
  );

};

const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
      </div>
      <h3 className="text-sm font-medium opacity-90">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

export default RestaurantDashboard;