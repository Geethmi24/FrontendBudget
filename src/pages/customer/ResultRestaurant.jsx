 import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import MenuTable from '../restaurant/MenuTable'
import jsPDF from 'jspdf'

const ResultRestaurant = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(state?.results && state.results.length ? state.results[0] : null);
  const [menus, setMenus] = useState(state?.filteredMeals || []);
  const [activeMenuItems, setActiveMenuItems] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const { user } = useAuth();
  const [orderedMap, setOrderedMap] = useState({});
  const [messages, setMessages] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showMessages, setShowMessages] = useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAvailableMenu, setShowAvailableMenu] = useState(false);
  
  const [favorites, setFavorites] = useState(new Set());
  const [cart, setCart] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      // if restaurant not provided, try to resolve from state or redirect back
      if (!restaurant) {
        const idFromState = state?.restaurantId || (state?.results && state.results[0]?._id);
        if (!idFromState) {
          // nothing to show
          return;
        }
        try {
          const rres = await api.get(`/restaurants/${idFromState}`);
          const data = rres?.data?.data || rres?.data || null;
          setRestaurant(data);
        } catch (e) {
          console.error('Could not load restaurant', e);
        }
      }

      // menus fetch now handled in separate effect when restaurant changes
    };
    load();
    // load favourites and cart
    try {
      const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavorites(new Set(Array.isArray(favs) ? favs : []));
    } catch (e) {}
    try {
      const c = JSON.parse(localStorage.getItem('cart') || '{}');
      setCart(c || {});
    } catch (e) {}
    // load any existing orders for this restaurant for current user
    const loadLocalOrders = async () => {
      // Try to fetch via API first
      try {
        const custId = user && user._id;
        if (custId) {
          try {
            const res = await api.get(`/orders/customer/${custId}`);
            const list = res.data && res.data.data ? res.data.data : [];
            const map = {};
            const custOrders = [];
            list.forEach(o => {
              if (String(o.restaurantId) === String(restaurant && (restaurant._id || restaurant.id))) {
                const key = o.menuId || o.itemId || o.menuName || o.itemName;
                // accumulate latest status mapping
                map[key] = o.status;
                if (o.customerId === (user && user._id) || String(o.customerId) === String(user && user._id)) {
                  custOrders.push(o);
                }
              }
            });
            setOrderedMap(map);
            setCustomerOrders(custOrders);
            return;
          } catch (err) {
            // fallback to localStorage
          }
        }
      } catch (e) {}

      try {
        const all = JSON.parse(localStorage.getItem('orders') || '[]');
        const map = {};
        const custOrders = [];
        all.forEach(o => {
          if (o.restaurantId === (restaurant && (restaurant._id || restaurant.id))) {
            if (o.customerId === (user && user._id) || o.customer === (user && user.fullName)) {
              const key = o.itemId || o.itemName;
              map[key] = o.status;
              custOrders.push(o);
            }
          }
        });
        setOrderedMap(map);
        setCustomerOrders(custOrders);
      } catch (e) {
        setOrderedMap({});
      }
    };
    loadLocalOrders();

    const loadMessages = async () => {
      try {
        const uid = user && user._id;
        if (uid) {
          try {
            const res = await api.get(`/messages/${uid}`);
            const list = res.data && res.data.data ? res.data.data : [];
            setMessages(list || []);
            return;
          } catch (err) {
            // fallback to local
          }
        }
        const all = JSON.parse(localStorage.getItem('messages') || '[]');
        const mine = all.filter(m => (m.userId && user && user._id && String(m.userId) === String(user._id)) || (m.customer && user && (m.customer === (user.fullName || user.name))));
        setMessages(mine || []);
      } catch (e) {
        setMessages([]);
      }
    };
    loadMessages();

    const loadReviews = async () => {
      try {
        const rid = restaurant && (restaurant._id || restaurant.id);
        if (!rid) return setReviewedOrderIds([]);
        try {
          const resp = await api.get(`/reviews/restaurant/${rid}`);
          const list = resp.data && resp.data.data ? resp.data.data : [];
          const ids = Array.isArray(list) ? list.map(r => String(r.orderId)) : [];
          setReviewedOrderIds(ids);
          return;
        } catch (err) {
          // fallback - nothing
        }
      } catch (e) {}
      setReviewedOrderIds([]);
    };
    loadReviews();

    const onStorage = () => { loadLocalOrders(); loadMessages(); loadReviews(); };
    window.addEventListener('storageUpdated', onStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storageUpdated', onStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, [restaurant, user]);

  // Helper: determine if restaurant is open now using openingHours
  const dayKey = (d) => ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d];
  const parseTime = (t) => {
    if (!t) return null;
    // accept formats like '09:00' or '9:00' or '09:00 AM' (simple parse)
    const parts = t.trim().split(':');
    if (parts.length < 2) return null;
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10) || 0;
    return { hh, mm };
  };
  const isRestaurantOpen = (rest) => {
    try {
      const oh = rest && (rest.openingHours || rest.openHours || rest.opening_hours);
      if (!oh) return true; // assume open if not specified
      const today = new Date();
      const key = dayKey(today.getDay());
      const slot = oh[key];
      if (!slot) return true;
      const openT = parseTime(slot.open);
      const closeT = parseTime(slot.close);
      if (!openT || !closeT) return true;
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const openMinutes = openT.hh * 60 + openT.mm;
      const closeMinutes = closeT.hh * 60 + closeT.mm;
      if (closeMinutes > openMinutes) {
        return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
      }
      // overnight schedule (close next day)
      return nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
    } catch (e) {
      return true;
    }
  };

  // When restaurant or budget changes, fetch menus only if restaurant is open
  const fetchMenusForRestaurant = useCallback(async (opts = {}) => {
    if (!restaurant) return;
    const open = isRestaurantOpen(restaurant);
    setIsOpen(open);
    if (!open) {
      setMenus([]);
      return;
    }

    try {
      setLoading(true);
      const rid = restaurant._id || restaurant.id;
      if (!rid) {
        setMenus([]);
        return;
      }
      const resp = await api.get('/menus/public', { params: { restaurant: rid, maxPrice: state?.from?.budget } });
      const list = resp?.data?.data || resp?.data || [];
      const arr = Array.isArray(list) ? list : (list.data || []);

      // normalize menu items
      const normalized = arr.map(it => {
        const price = Number(it.price || 0);
        const discount = Number(it.discount || 0);
        const final = it.finalPrice != null ? Number(it.finalPrice) : Number((price - (price * discount / 100)).toFixed(2));
        return {
          ...it,
          name: it.name || '',
          type: it.subCategory || it.type || it.category || '',
          discount: discount,
          finalPrice: final,
          availability: it.availability || 'Available'
        };
      });

      setMenus(normalized);
      setActiveMenuItems(normalized);
      if (opts.selectOpen) setShowAvailableMenu(true);
    } catch (e) {
      console.error('Could not load menus', e);
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, [restaurant, state?.from?.budget]);

  // helper: build order history (customer-specific) and prune active menu items
  const refreshMenuAndHistory = async () => {
    try {
      // ensure menus are loaded
      await fetchMenusForRestaurant();
      await fetchCustomerOrders();
      const rid = restaurant && (restaurant._id || restaurant.id);
      if (!rid) return;

      // build history from customerOrders for this restaurant
      const history = (customerOrders || []).filter(o => String(o.restaurantId) === String(rid) && ['completed', 'rejected'].includes((o.status || '').toLowerCase()));

      // map history items with menu info where available
      const histWithMenu = history.map(o => {
        const menu = (activeMenuItems || menus || []).find(m => String(m._id || m.id) === String(o.menuId || o.itemId) || m.name === (o.menuName || o.itemName));
        return {
          orderId: o._id || o.id,
          menuId: o.menuId || o.itemId,
          menuName: o.menuName || o.itemName || (menu && menu.name) || '',
          type: (menu && menu.type) || o.type || '',
          quantity: o.quantity || o.qty || 1,
          discount: (menu && menu.discount) || o.discount || 0,
          originalPrice: (menu && menu.price) || o.unitPrice || o.price || 0,
          finalPrice: (menu && menu.finalPrice) || o.totalPrice || o.total || 0,
          status: o.status,
          orderDate: o.createdAt || o.time || ''
        };
      });

      // set history state
      setOrderHistory(histWithMenu);

      // remove history items from active menu list
      const pruned = (menus || activeMenuItems || []).filter(m => !histWithMenu.some(h => String(h.menuId) === String(m._id || m.id) || m.name === h.menuName));
      setActiveMenuItems(pruned);
    } catch (e) {
      console.error('refreshMenuAndHistory failed', e);
    }
  };

  const generatePdfForOrder = (item) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(20, 20, `Restaurant: ${restaurant && (restaurant.name || '')}`);
      doc.setFontSize(12);
      doc.text(20, 32, `Customer: ${user && (user.fullName || user.name) || ''}`);
      doc.text(20, 44, `Menu Item: ${item.menuName || item.name || ''}`);
      doc.text(20, 56, `Quantity: ${item.quantity || 1}`);
      doc.text(20, 68, `Original price: Rs ${item.originalPrice || item.price || 0}`);
      doc.text(20, 80, `Discount: ${item.discount || 0}%`);
      doc.text(20, 92, `Final price: Rs ${item.finalPrice || item.finalPrice || 0}`);
      doc.text(20, 104, `Status: ${String(item.status || '').toUpperCase()}`);
      doc.text(20, 116, `Order date: ${item.orderDate || ''}`);
      const fileName = `order_${item.orderId || Date.now()}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error('Could not generate PDF', e);
      alert('PDF generation failed');
    }
  };

  useEffect(() => {
    fetchMenusForRestaurant();
  }, [restaurant, state?.from?.budget, selectedIndex, fetchMenusForRestaurant]);

  if (!restaurant) return (
    <div className="p-8">
      <p>No restaurant selected. Go back and try again.</p>
      <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Back</button>
    </div>
  )

  // Order handlers using localStorage to simulate backend orders
  const saveOrdersToStorage = (orders) => {
    localStorage.setItem('orders', JSON.stringify(orders));
    // notify other tabs/components
    window.dispatchEvent(new Event('storageUpdated'));
  };

  const handleQuantityChange = (key, val) => {
    const num = Number(val) || 1;
    setQuantities(prev => ({ ...prev, [key]: num < 1 ? 1 : num }));
  };

  const increaseQty = (key) => {
    setQuantities(prev => ({ ...prev, [key]: (Number(prev[key]) || 1) + 1 }));
  };

  const decreaseQty = (key) => {
    setQuantities(prev => ({ ...prev, [key]: Math.max(1, (Number(prev[key]) || 1) - 1) }));
  };

  const fetchCustomerOrders = async () => {
    try {
      const uid = user && user._id;
      if (!uid) return setCustomerOrders([]);
      const res = await api.get(`/orders/customer/${uid}`);
      const list = res.data && res.data.data ? res.data.data : [];
      const filtered = list.filter(o => String(o.restaurantId) === String(restaurant && (restaurant._id || restaurant.id)));
      setCustomerOrders(filtered);
      return;
    } catch (e) {
      const all = JSON.parse(localStorage.getItem('orders') || '[]');
      const filtered = all.filter(o => o.restaurantId === (restaurant && (restaurant._id || restaurant.id)) && (o.customerId === (user && user._id) || o.customer === (user && (user.fullName || user.name))));
      setCustomerOrders(filtered);
    }
  };

  const handleOrder = async (menu, qty = 1) => {
    // Try creating order via backend API
    const unit = Number(menu.finalPrice != null ? menu.finalPrice : menu.price || 0);
    const payload = {
      restaurantId: restaurant._id || restaurant.id,
      menuId: menu._id || menu.id,
      menuName: menu.name,
      customerId: user && user._id,
      customerName: user && (user.fullName || user.name) || 'Guest',
      quantity: Number(qty) || 1,
      unitPrice: unit,
      totalPrice: (Number(qty) || 1) * unit
    };
    try {
      const res = await api.post('/orders', payload);
      const created = res.data && res.data.data;
      if (created) {
        const key = menu._id || menu.name;
        setOrderedMap(m => ({ ...m, [key]: created.status || 'pending' }));
        setQuantities(prev => ({ ...prev, [key]: payload.quantity }));
        await fetchCustomerOrders();
        alert('Order placed');
        return;
      }
    } catch (err) {
      console.warn('API order failed, falling back to localStorage', err.message || err);
    }

    // Fallback - localStorage (offline/dev)
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const id = `#${Date.now()}`;
    const order = {
      id,
      restaurantId: restaurant._id || restaurant.id,
      customerId: user && user._id,
      customer: user && (user.fullName || user.name) || 'Guest',
      itemId: menu._id || menu.id,
      itemName: menu.name,
      quantity: Number(qty) || 1,
      unitPrice: unit,
      totalPrice: (Number(qty) || 1) * unit,
      status: 'pending',
      time: new Date().toLocaleString()
    };
    orders.push(order);
    saveOrdersToStorage(orders);
    const key = menu._id || menu.name;
    setOrderedMap(m => ({ ...m, [key]: 'pending' }));
    setQuantities(prev => ({ ...prev, [key]: Number(qty) || 1 }));
    await fetchCustomerOrders();
    alert('Order placed (offline)');
  };

  const handleCancel = async (order) => {
    try {
      if (order._id) {
        const res = await api.patch(`/orders/${order._id}/cancel`);
        const data = res.data && res.data.data;
        await fetchCustomerOrders();
        setOrderedMap(prev => ({ ...prev, [order.menuId || order.itemId || order.menuName || order.itemName]: data.status }));
        alert('Order cancelled');
        return;
      }
    } catch (err) {
      console.warn('API cancel failed, falling back', err.message || err);
    }
    // fallback local
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      const idx = orders.findIndex(o => (o.id === order.id));
      if (idx !== -1) {
        orders[idx].status = 'rejected';
        saveOrdersToStorage(orders);
        await fetchCustomerOrders();
        alert('Order cancelled (offline)');
        return;
      }
      alert('No pending order found to cancel');
    } catch (e) {
      console.error('Cancel failed', e);
      alert('Could not cancel order');
    }
  };
  
  const handleMarkMessageRead = async (m) => {
    try {
      if (m._id) await api.patch(`/messages/${m._id}/read`);
      setMessages(prev => prev.map(x => (x._id === m._id ? { ...x, isRead: true } : x)));
    } catch (e) {
      console.error(e);
    }
  };
  
  const openMessagePdf = (msg) => {
    try {
      const html = `
        <html>
          <head>
            <title>Message for ${msg.customer || ''} - ${msg.orderId || ''}</title>
            <style>body{font-family:Arial,sans-serif;padding:20px} .h{font-size:18px;font-weight:700;margin-bottom:8px}</style>
          </head>
          <body>
            <div class="h">Order Message - ${msg.orderId || ''}</div>
            <div><strong>Customer:</strong> ${msg.customer || ''}</div>
            <div><strong>Item:</strong> ${msg.itemName || ''}</div>
            <div><strong>Status:</strong> ${msg.status || ''}</div>
            <div style="margin-top:12px">${msg.text || ''}</div>
            <div style="margin-top:16px">Time: ${msg.time || ''}</div>
          </body>
        </html>
      `;
      const w = window.open('', '_blank');
      if (!w) return alert('Pop-up blocked. Allow popups to download PDF.');
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 500);
    } catch (e) {
      console.error('Could not open message print window', e);
      alert('Could not open print window');
    }
  };

  const openOrderPdf = async (item) => {
    try {
      const custId = user && user._id;
      let order = null;
      if (custId) {
        try {
          const res = await api.get(`/orders/customer/${custId}`);
          const list = res.data && res.data.data ? res.data.data : [];
          // find latest matching order for this menu/item
          order = list.find(o => (o.menuId === (item._id || item.id) || o.menuName === item.name) && (o.restaurantId === (restaurant._id || restaurant.id)));
        } catch (err) {
          // ignore
        }
      }
      // fallback to localStorage
      if (!order) {
        const all = JSON.parse(localStorage.getItem('orders') || '[]');
        order = all.slice().reverse().find(o => (o.itemId === (item._id || item.id) || o.itemName === item.name) && (o.restaurantId === (restaurant._id || restaurant.id)));
      }
      if (!order) return alert('No order record found to generate PDF');
      
      // Calculate collection deadline (2 hours from completion)
      let collectionDeadline = '';
      let deadlineMessage = '';
      if (order.status === 'completed' && order.completedAt) {
        const completedTime = new Date(order.completedAt);
        const deadline = new Date(completedTime.getTime() + 2 * 60 * 60 * 1000);
        collectionDeadline = deadline.toLocaleString();
        deadlineMessage = `<div style="margin-top:16px; padding:12px; background-color:#fff3cd; border:1px solid #ffc107; border-radius:4px;"><strong style="color:#856404;">⚠️ Important Notice:</strong><p style="margin:8px 0 0 0; font-size:13px; color:#856404;">This completed order must be collected within 2 hours from completion. If not collected by <strong>${collectionDeadline}</strong>, this order will be automatically cancelled.</p></div>`;
      }
      
      const html = `
        <html>
          <head>
            <title>Order ${order._id || order.id}</title>
            <style>body{font-family:Arial,sans-serif;padding:20px} .h{font-size:18px;font-weight:700;margin-bottom:8px}</style>
          </head>
          <body>
            <div class="h">Order Receipt - ${order._id || order.id}</div>
            <div><strong>Restaurant:</strong> ${restaurant && (restaurant.name || '')}</div>
            <div><strong>Customer:</strong> ${order.customerName || order.customer}</div>
            <div><strong>Item:</strong> ${order.menuName || order.itemName || item.name}</div>
            <div><strong>Unit Price:</strong> Rs ${order.unitPrice || order.price || item.price}</div>
            <div><strong>Quantity:</strong> ${order.quantity || order.qty || 1}</div>
            <div><strong>Total:</strong> Rs ${order.totalPrice || order.total || order.price || (item.price)}</div>
            <div><strong>Status:</strong> ${order.status || ''}</div>
            <div><strong>Order date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : (order.time || '')}</div>
            ${order.status === 'completed' && order.completedAt ? `<div><strong>Completed at:</strong> ${new Date(order.completedAt).toLocaleString()}</div>` : ''}
            ${deadlineMessage}
            <div style="margin-top:16px">Thank you for ordering from ${restaurant && (restaurant.name || '')}.</div>
          </body>
        </html>
      `;
      const w = window.open('', '_blank');
      if (!w) return alert('Pop-up blocked. Allow popups to download PDF.');
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 500);
    } catch (e) {
      console.error('Could not open order print window', e);
      alert('Could not open print window');
    }
  };
  const images = restaurant.images || restaurant.photos || (restaurant.photoURL ? [restaurant.photoURL] : []) || [];
  // Helpers for features
  const saveFavorites = (set) => {
    const arr = Array.from(set);
    localStorage.setItem('favorites', JSON.stringify(arr));
  }

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  const saveCart = (c) => {
    localStorage.setItem('cart', JSON.stringify(c));
  }

  const addToCart = (item, qty = 1) => {
    setCart(prev => {
      const next = { ...prev };
      const key = item._id || item.id || item.name;
      if (!next[key]) next[key] = { item, qty: 0 };
      next[key].qty = (next[key].qty || 0) + qty;
      saveCart(next);
      return next;
    });
    alert('Added to cart');
  };

  const setCartQty = (item, qty) => {
    setCart(prev => {
      const next = { ...prev };
      const key = item._id || item.id || item.name;
      if (qty <= 0) delete next[key]; else next[key] = { item, qty };
      saveCart(next);
      return next;
    });
  };

  const openModal = (item) => { setModalItem(item); setShowModal(true); };
  const closeModal = () => { setModalItem(null); setShowModal(false); };

  const exportCSV = (rows) => {
    const headers = ['name','subCategory','price','discount','finalPrice','availability'];
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h] != null ? r[h] : '')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${restaurant.name || 'menus'}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const printList = () => window.print();

  const results = state?.results || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-8">
        {images && images.length > 0 ? (
          <div
            className="w-full h-64 md:h-80 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.15)), url('${images[0]}')` }}
          />
        ) : (
          <div className="w-full h-64 md:h-80 bg-gradient-to-r from-gray-300 to-gray-200 flex items-center justify-center">No Image</div>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <div className="text-white">
            <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow">{restaurant.name}</h1>
            <p className="mt-1 text-sm md:text-base opacity-90">{restaurant.location || (restaurant.address && (restaurant.address.street || restaurant.address.city))}</p>
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">{Array.isArray(restaurant.cuisineType) ? restaurant.cuisineType.join(', ') : (restaurant.cuisineType || restaurant.cuisine || 'Cuisine')}</span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">Owner: {restaurant.owner && (restaurant.owner.fullName || restaurant.owner.name) || restaurant.restaurantOwnerName || '—'}</span>
              {state?.from?.budget && <span className="ml-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-semibold">Budget: LKR {state.from.budget}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main content: menu grid */}
        <main className="lg:col-span-3">
          {/* Controls: search, subcategory, sort, availability, export/print */}
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            <button onClick={() => exportCSV(menus)} className="px-3 py-2 bg-gray-100 rounded">Export CSV</button>
            <button onClick={printList} className="px-3 py-2 bg-gray-100 rounded">Print</button>
          </div>
          {results && results.length > 1 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Other matches</h3>
              <div className="flex gap-2 flex-wrap">
                {results.map((r, i) => (
                  <button
                    key={r._id || r.id || i}
                    onClick={async () => {
                      setSelectedIndex(i);
                      setRestaurant(r);
                      try {
                        const resp = await api.get('/menus/public', { params: { restaurant: r._id || r.id, maxPrice: state?.from?.budget } });
                        const list = resp?.data?.data || resp?.data || [];
                        setMenus(Array.isArray(list) ? list : (list.data || []));
                      } catch (e) {
                        setMenus([]);
                      }
                    }}
                    className={`px-3 py-1 rounded ${i === selectedIndex ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

            <div className="mb-4 relative">
              <div className="absolute right-0 top-0">
                <div className="relative">
                  <button onClick={() => setShowMessages(s => !s)} className="bg-white border px-3 py-2 rounded-full flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z" /></svg>
                    {messages && messages.filter(m => !m.isRead).length > 0 && <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{messages.filter(m => !m.isRead).length}</span>}
                  </button>
                  {showMessages && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg text-sm z-40">
                      <div className="p-2 border-b font-semibold">Messages</div>
                      <div className="max-h-72 overflow-auto">
                        {(!messages || messages.length === 0) && <div className="p-3 text-gray-500">No messages</div>}
                        {messages.map(m => {
                          const relatedOrder = customerOrders.find(o => String(o._id) === String(m.orderId) || String(o.id) === String(m.orderId));
                          const showReview = relatedOrder && relatedOrder.status === 'completed' && !reviewedOrderIds.includes(String(relatedOrder._id || relatedOrder.id));
                          return (
                            <div key={m._id || m.id} className={`p-3 border-b ${m.isRead ? 'bg-white text-gray-600' : 'bg-blue-50 text-gray-900'}`}>
                              <div className="flex justify-between items-start">
                                <div onClick={() => handleMarkMessageRead(m)} className="cursor-pointer">
                                  <div className="font-medium">{m.text || m.message}</div>
                                  <div className="text-xs text-gray-500 mt-1">{m.createdAt ? new Date(m.createdAt).toLocaleString() : (m.time || '')}</div>
                                </div>
                                <div className="ml-2 flex items-center gap-2">
                                  {relatedOrder && (relatedOrder.status === 'completed' || relatedOrder.status === 'rejected')  }
                                  {showReview && <button onClick={() => navigate(`/review/${restaurant._id || restaurant.id}/${relatedOrder._id || relatedOrder.id}`)} className="px-2 py-1 bg-amber-100 rounded text-sm">Review</button>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Orders list */}
              <div className="bg-blue-50 p-3 rounded mb-4">
                <h4 className="font-semibold mb-2">Your Orders</h4>
                {customerOrders.length === 0 && <div className="text-sm text-gray-600">No orders yet</div>}
                {customerOrders.map(o => {
                  const relatedMessage = messages.find(m => String(m.orderId) === String(o._id || o.id) || String(m.orderId) === String(o.id || o._id));
                  let collectionDeadline = '';
                  let completedTimeStr = '';
                  if (o.status === 'completed' && o.completedAt) {
                    const completedTime = new Date(o.completedAt);
                    completedTimeStr = completedTime.toLocaleString();
                    const deadline = new Date(completedTime.getTime() + 2 * 60 * 60 * 1000);
                    collectionDeadline = deadline.toLocaleString();
                  }
                  return (
                    <div key={o._1 || o._id || o.id} className="border-b py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{o.menuName || o.itemName}</div>
                          <div className="text-xs text-gray-500">Qty: {o.quantity || o.qty || 1} — Total: Rs {o.totalPrice || o.total || o.price}</div>
                          {o.status === 'rejected' && (
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                              <div className="mt-1 text-sm text-red-600">{relatedMessage?.text || o.rejectionReason || 'Item not available'}</div>
                            </div>
                          )}
                          {o.status === 'completed' && completedTimeStr && (
                            <div className="mt-2 bg-blue-50 p-2 rounded">
                              <div className="text-xs text-gray-600"><strong>Order Completed:</strong> {completedTimeStr}</div>
                              <div className="text-xs text-orange-700 font-semibold mt-1"><strong>⏰ Collection Deadline (2-hour window):</strong> {collectionDeadline}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : o.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{String(o.status || '').toUpperCase()}</span>
                          {o.status === 'pending' && <button onClick={() => handleCancel(o)} className="px-3 py-1 bg-red-100 rounded text-sm">Cancel</button>}
                           
                          {o.status === 'completed' && !reviewedOrderIds.includes(String(o._id || o.id)) && (
                            <button onClick={() => navigate(`/review/${restaurant._id || restaurant.id}/${o._id || o.id}`)} className="px-3 py-1 bg-amber-100 rounded text-sm">Review & Rating</button>
                          )}
                          {o.status === 'completed' && reviewedOrderIds.includes(String(o._id || o.id)) && (
                            <button disabled className="px-3 py-1 bg-gray-200 rounded text-sm">Reviewed</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <section>
            <button
              type="button"
              onClick={async () => {
                // always open and refresh menus
                setShowAvailableMenu(true);
                await fetchMenusForRestaurant({ selectOpen: true });
              }}
              className="text-2xl font-semibold mb-4 hover:underline focus:outline-none"
            >
              Available Menu
            </button>

            {showAvailableMenu ? (
              loading ? (
                <p>Loading menus...</p>
              ) : (
                (() => {
                  const source = menus || [];
                  const max = state?.from?.budget ? Number(state.from.budget) : null;
                  const filtered = max != null ? source.filter(it => Number(it.finalPrice || 0) <= max) : source;
                  if (!filtered || filtered.length === 0) return <p>No menu items under this budget.</p>;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => refreshMenuAndHistory()} className="px-3 py-1 bg-gray-100 rounded">Refresh</button>
                          <div className="text-sm text-gray-500">Showing {activeMenuItems.length} available items</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 bg-white rounded p-4 shadow">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-gray-500">
                                <th className="py-2">Name</th>
                                <th>Type</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Discount</th>
                                <th className="text-right">Final</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(activeMenuItems || filtered).map(menu => {
                                const key = menu._id || menu.id || menu.name;
                                const relatedOrder = (customerOrders || []).slice().reverse().find(o => (String(o.menuId) === String(menu._id || menu.id) || o.menuName === menu.name || o.itemName === menu.name) && String(o.restaurantId) === String(restaurant && (restaurant._id || restaurant.id)));
                                const status = relatedOrder ? relatedOrder.status : 'available';
                                const qty = Number(quantities[key]) || 1;
                                return (
                                  <tr key={menu._id || menu.id} className="border-t">
                                    <td className="py-2">{menu.name}</td>
                                    <td>{menu.type}</td>
                                    <td className="text-right">
                                      <div className="inline-flex items-center justify-end gap-2">
                                        <button onClick={() => decreaseQty(key)} disabled={qty <= 1} className={`px-2 py-1 rounded border ${qty <= 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700'}`}>-</button>
                                        <div className="px-3 text-sm">{qty}</div>
                                        <button onClick={() => increaseQty(key)} className="px-2 py-1 rounded border bg-white text-gray-700">+</button>
                                      </div>
                                    </td>
                                    <td className="text-right">Rs {menu.price || '-'}</td>
                                    <td className="text-right">{menu.discount != null ? `${menu.discount}%` : '-'}</td>
                                    <td className="text-right">Rs {menu.finalPrice != null ? menu.finalPrice : '-'}</td>
                                    <td className="text-center">
                                      {status === 'completed' && <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Completed</span>}
                                      {status === 'rejected' && <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Rejected</span>}
                                    </td>
                                    <td className="text-center">
                                      {status === 'completed' || status === 'rejected' ? (
                                        <button onClick={() => generatePdfForOrder({ orderId: relatedOrder._id || relatedOrder.id, menuName: menu.name, quantity: relatedOrder.quantity || relatedOrder.qty || 1, originalPrice: menu.price, discount: menu.discount, finalPrice: relatedOrder.totalPrice || relatedOrder.total || menu.finalPrice, status, orderDate: relatedOrder.createdAt || relatedOrder.time })} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">Download PDF</button>
                                      ) : (
                                        <button onClick={() => handleOrder(menu, qty)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Order</button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="lg:col-span-1">
                          <div className="bg-white p-4 rounded shadow">
                            <h4 className="font-semibold mb-3">History</h4>
                            {orderHistory.length === 0 ? (
                              <div className="text-sm text-gray-500">No history yet</div>
                            ) : (
                              <div className="space-y-3">
                                {orderHistory.map(h => (
                                  <div key={h.orderId} className="flex items-center justify-between border p-2 rounded">
                                    <div>
                                      <div className="font-medium">{h.menuName}</div>
                                      <div className="text-xs text-gray-500">Qty: {h.quantity} • Rs {h.finalPrice}</div>
                                      <div className={`text-xs mt-1 ${h.status === 'rejected' ? 'text-red-600' : 'text-green-600'}`}>{String(h.status).toUpperCase()}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <button onClick={() => generatePdfForOrder(h)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">Download PDF</button>
                                      <div className="text-xs text-gray-400">{h.orderDate ? new Date(h.orderDate).toLocaleString() : ''}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )
            ) : null}
          </section>
        </main>

        {/* Sticky details sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-xl p-6 shadow">
            <h3 className="font-semibold text-xl mb-3">Details</h3>
            <p className="text-sm text-gray-600 mb-2">Cuisine: {Array.isArray(restaurant.cuisineType) ? restaurant.cuisineType.join(', ') : (restaurant.cuisineType || restaurant.cuisine || '—')}</p>
            <p className="text-sm text-gray-600 mb-2">Contact: {(restaurant.contact && (restaurant.contact.phone || restaurant.contact)) || '—'}</p>
            <p className="text-sm text-gray-600 mb-2">Email: {(restaurant.contact && restaurant.contact.email) || restaurant.email || '—'}</p>
            <p className="text-sm text-gray-600 mb-3">Address: {restaurant.address && (restaurant.address.street || restaurant.address.city) || '—'}</p>
            <div className="border-t pt-3 mt-3">
              <p className="text-sm text-gray-700">Status: <span className={`font-semibold ${isOpen ? 'text-green-600' : 'text-red-500'}`}>{isOpen ? 'Open' : 'Closed'}</span></p>
              {state?.from?.budget && <p className="mt-2 text-sm text-gray-700">Your budget: <span className="font-semibold">LKR {state.from.budget}</span></p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ResultRestaurant


