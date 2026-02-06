import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingCart, CheckCircle, Clock, Star, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../services/api'

// Helper: safe number
const num = (v) => (v == null || Number.isNaN(Number(v)) ? 0 : Number(v))
const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(v)
const fmtLKR = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', currencyDisplay: 'code', minimumFractionDigits: 2 }).format(v)
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export default function Overview({ restaurantId: propRestaurantId }) {
  const { id: paramId } = useParams() || {}
  const restaurantId = propRestaurantId || paramId || ''

  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      setError('Restaurant ID required')
      return
    }
    setLoading(true)
    setError(null)

    const getOrders = async () => {
      try {
        // try query param first, fallback to path-style route
        try {
          const res = await api.get('/orders', { params: { restaurantId } })
          if (res && res.data) return Array.isArray(res.data) ? res.data : (res.data.data || [])
        } catch (e) {
          // fallback
        }
        const res2 = await api.get(`/orders/restaurant/${restaurantId}`)
        return Array.isArray(res2.data) ? res2.data : (res2.data && res2.data.data) || []
      } catch (e) {
        return []
      }
    }

    const getReviews = async () => {
      try {
        try {
          const res = await api.get('/reviews', { params: { restaurantId } })
          if (res && res.data) return Array.isArray(res.data) ? res.data : (res.data.data || [])
        } catch (e) {}
        const res2 = await api.get(`/reviews/restaurant/${restaurantId}`)
        return Array.isArray(res2.data) ? res2.data : (res2.data && res2.data.data) || []
      } catch (e) {
        return []
      }
    }

    const getMenus = async () => {
      try {
        try {
          const res = await api.get('/menus', { params: { restaurantId } })
          if (res && res.data) return Array.isArray(res.data) ? res.data : (res.data.data || [])
        } catch (e) {}
        const res2 = await api.get('/menus', { params: { restaurant: restaurantId } })
        return Array.isArray(res2.data) ? res2.data : (res2.data && res2.data.data) || []
      } catch (e) {
        return []
      }
    }

    Promise.all([getOrders(), getReviews(), getMenus()])
      .then(([o, r, m]) => {
        setOrders(o || [])
        setReviews(r || [])
        setMenus(m || [])
      })
      .catch((e) => setError(String(e?.message || e || 'Failed to load data')))
      .finally(() => setLoading(false))
  }, [restaurantId])

  // Compute metrics
  const metrics = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1)
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    // week: last 7 days including today
    const weekDates = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      weekDates.push(startOfDay(d))
    }

    let todayTotal = 0
    let todayOrdersTotal = 0
    let todayCompleted = 0
    let todayPending = 0

    let lastMonthSales = 0
    let currentMonthSales = 0

    const statusCounts = { pending: 0, completed: 0, cancelled: 0 }

    const weeklySales = weekDates.map(() => 0)

    // top meals map for this week
    const mealMap = new Map()

    // order distribution types
    const typeCounts = { 'dine-in': 0, takeaway: 0, delivery: 0 }
    let totalOrdersCount = 0

    for (const o of orders || []) {
      const created = o.createdAt ? new Date(o.createdAt) : (o.date ? new Date(o.date) : (o.time ? new Date(o.time) : null))
      const status = String(o.status || o.orderStatus || '').toLowerCase()
      const total = num(o.totalPrice || o.total || o.price || 0)
      const orderType = String(o.type || o.orderType || o.fulfillment || '').toLowerCase()

      // counts
      if (status.includes('pending')) statusCounts.pending += 1
      else if (status.includes('complete') || status === 'approved' || status === 'completed') statusCounts.completed += 1
      else if (status.includes('reject') || status.includes('cancel')) statusCounts.cancelled += 1

      // type distribution
      if (orderType.includes('dine')) typeCounts['dine-in'] += 1
      else if (orderType.includes('take')) typeCounts.takeaway += 1
      else if (orderType.includes('deliv') || orderType.includes('delivery')) typeCounts.delivery += 1

      totalOrdersCount += 1

      if (created) {
        // today
        if (created >= todayStart) {
              todayOrdersTotal += 1
              if (status === 'completed' || status === 'approved' || status.includes('complete')) {
                // Calculate revenue using item price × quantity when items exist, otherwise fall back to order total
                const itemsForOrder = Array.isArray(o.items) ? o.items : (o.orderItems || o.itemsOrdered || [])
                let orderRevenue = 0
                if (itemsForOrder && itemsForOrder.length) {
                  for (const it of itemsForOrder) {
                    const qty = num(it.quantity || it.qty || 1)
                    const price = num(it.price || it.unitPrice || it.amount || it.total || 0)
                    orderRevenue += qty * price
                  }
                } else {
                  orderRevenue = total
                }
                todayTotal += orderRevenue
                todayCompleted += 1
              }
              if (status.includes('pending')) todayPending += 1
            }

        // monthly sales (completed only)
        if (created.getFullYear() === thisYear) {
          if (created.getMonth() === thisMonth) {
            if (status === 'completed' || status === 'approved' || status.includes('complete')) currentMonthSales += total
          } else if (created.getMonth() === (thisMonth === 0 ? 11 : thisMonth - 1)) {
            // previous month (handles January)
            if (status === 'completed' || status === 'approved' || status.includes('complete')) lastMonthSales += total
          }
        }

        // weekly sales per day
        for (let i = 0; i < weekDates.length; i++) {
          const s = weekDates[i]
          const e = new Date(s); e.setDate(s.getDate() + 1)
          if (created >= s && created < e) {
            if (status === 'completed' || status === 'approved' || status.includes('complete')) {
              weeklySales[i] += total
            }
          }
        }

        // top meals for the week (items inside order)
        const weekStart = weekDates[0]
        if (created >= weekStart) {
          const items = Array.isArray(o.items) ? o.items : (o.orderItems || o.itemsOrdered || [])
          for (const it of items || []) {
            const id = it.menuItemId || it.menuId || it.id || it._id || ''
            const qty = num(it.quantity || it.qty || 1)
            const price = num(it.price || it.unitPrice || 0)
            if (!id) continue
            const prev = mealMap.get(id) || { qty: 0, revenue: 0 }
            prev.qty += qty
            prev.revenue += qty * price
            mealMap.set(id, prev)
          }
        }
      }
    }

    // top meals list, link with menus
    const topMeals = Array.from(mealMap.entries()).map(([id, st]) => {
      const m = (menus || []).find((x) => String(x._id || x.id) === String(id)) || {}
      return { id, name: m.name || m.title || `Item ${id}`, qty: st.qty, revenue: st.revenue }
    }).sort((a, b) => b.qty - a.qty).slice(0, 5)

    // ratings
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let ratingSum = 0
    for (const r of reviews || []) {
      const s = Math.max(1, Math.min(5, num(r.rating || r.stars || r.score || 0)))
      ratingCounts[s] = (ratingCounts[s] || 0) + 1
      ratingSum += s
    }
    const totalReviews = (reviews || []).length
    const avgRating = totalReviews ? (ratingSum / totalReviews) : 0

    // monthly growth %
    const growth = lastMonthSales === 0 ? (currentMonthSales === 0 ? 0 : 100) : ((currentMonthSales - lastMonthSales) / Math.max(1, lastMonthSales)) * 100

    // order distribution percentages
    const typeTotal = typeCounts['dine-in'] + typeCounts.takeaway + typeCounts.delivery
    const typePct = {
      'dine-in': typeTotal ? Math.round((typeCounts['dine-in'] / typeTotal) * 100) : 0,
      takeaway: typeTotal ? Math.round((typeCounts.takeaway / typeTotal) * 100) : 0,
      delivery: typeTotal ? Math.round((typeCounts.delivery / typeTotal) * 100) : 0,
    }

    return {
      todayOrdersTotal,
      todayTotal: Math.round(todayTotal * 100) / 100,
      todayCompleted,
      todayPending,
      currentMonthSales: Math.round(currentMonthSales * 100) / 100,
      lastMonthSales: Math.round(lastMonthSales * 100) / 100,
      growth: Math.round(growth * 10) / 10,
      statusCounts,
      avgRating: Math.round((avgRating || 0) * 10) / 10,
      ratingCounts,
      totalReviews,
      weeklySales,
      weekDates,
      topMeals,
      typePct,
      typeCounts,
      totalOrdersCount,
      dailyRevenueLKR: fmtLKR(todayTotal),
      cumulativeRevenueLKR: fmtLKR(currentMonthSales),
    }
  }, [orders, reviews, menus])

  if (!restaurantId) {
    return <div className="p-6 text-red-600">Restaurant ID required</div>
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-6 bg-gray-100 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse h-24 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="p-6"><div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded">{error}</div></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-500">Performance metrics for your restaurant</p>
        </div>
        <div className="text-sm text-gray-600">Updated: {new Date().toLocaleString()}</div>
      </div>

      {/* Daily + monthly summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Revenue (Today) - prominent */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 col-span-1 md:col-span-3 lg:col-span-2">
          <div className="p-3 rounded-md bg-emerald-600 text-white"><WalletIcon /></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Total Revenue (Today)</div>
            <div className="text-3xl font-semibold text-gray-900">{fmtLKR(metrics.todayTotal || 0)}</div>
            <div className="text-xs text-gray-400">Earnings for today • Today: {new Date().toLocaleDateString(undefined, { timeZone: 'Asia/Colombo' })}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-md bg-blue-500 text-white"><ShoppingCart className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Orders Today</div>
            <div className="text-2xl font-semibold text-gray-900">{metrics.todayOrdersTotal}</div>
            <div className="text-xs text-gray-400">Completed: {metrics.todayCompleted} • Pending: {metrics.todayPending}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-md bg-green-500 text-white"><LKR/></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">This Month Sales</div>
            <div className="text-2xl font-semibold text-gray-900">{fmtCurrency(metrics.currentMonthSales)}</div>
            <div className="text-xs text-gray-400">Growth vs last month: <span className={`font-medium ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{metrics.growth}%</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-md bg-yellow-500 text-white"><Clock className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Pending Orders</div>
            <div className="text-2xl font-semibold text-gray-900">{metrics.statusCounts.pending}</div>
            <div className="text-xs text-gray-400">In queue</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-md bg-emerald-600 text-white"><CheckCircle className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Completed Orders</div>
            <div className="text-2xl font-semibold text-gray-900">{metrics.statusCounts.completed}</div>
            <div className="text-xs text-gray-400">Fulfilled</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-md bg-red-500 text-white"><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Cancelled / Rejected</div>
            <div className="text-2xl font-semibold text-gray-900">{metrics.statusCounts.cancelled}</div>
            <div className="text-xs text-gray-400">Issues</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-md bg-purple-600 text-white"><Star className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Avg Rating</div>
            <div className="text-2xl font-semibold text-gray-900">{metrics.totalReviews ? metrics.avgRating : '—'}</div>
            <div className="text-xs text-gray-400">{metrics.totalReviews} reviews</div>
          </div>
        </div>
      </div>

      {/* Status breakdown (simple boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{metrics.statusCounts.pending}</div>
          <div className="text-xs text-gray-400 mt-1">Orders awaiting action</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{metrics.statusCounts.completed}</div>
          <div className="text-xs text-gray-400 mt-1">Successfully delivered</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{metrics.statusCounts.cancelled}</div>
          <div className="text-xs text-gray-400 mt-1">Customer or restaurant cancelled</div>
        </div>
      </div>

      {/* Compact interest card showing Average Rating */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Interest (Average Rating)</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-3xl font-bold text-gray-900">{metrics.totalReviews ? metrics.avgRating : '—'}</div>
            <div className="text-yellow-400 text-2xl">★</div>
          </div>
          <div className="text-xs text-gray-400 mt-1">{metrics.totalReviews} reviews</div>
        </div>
      </div>

      {/* Order distribution by type */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">Order Distribution</div>
          <div className="text-sm text-gray-400">Total orders: {metrics.totalOrdersCount}</div>
        </div>
        <div className="space-y-3">
          {['dine-in','takeaway','delivery'].map((k) => (
            <div key={k} className="flex items-center gap-3">
              <div className="w-24 text-sm text-gray-600 capitalize">{k.replace('-', ' ')}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div style={{ width: `${metrics.typePct[k] || 0}%`, background: '#10B981', height: '100%' }} />
              </div>
              <div className="w-12 text-right text-sm text-gray-600">{metrics.typePct[k] || 0}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Small inline icons
function DollarIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1c-1.1 0-2 .9-2 2v1.1C7.1 4.4 5 6.9 5 10c0 2.4 1.7 4.4 4 4.9V17c0 1.1.9 2 2 2s2-.9 2-2v-1.1c2.9-.5 5-3 5-5.9 0-2.4-1.7-4.4-4-4.9V3c0-1.1-.9-2-2-2zm1 14.9c-1.1.2-2 .9-2.9 1.9v-2.2c.9-.2 1.8-.6 2.6-1.2.8-.6 1.4-1.3 1.4-2.4 0-1.3-1-2.4-2.4-2.6V4.1c.7.1 1.4.6 1.8 1.2.4.7.6 1.5.6 2.4 0 2-1.2 3.3-2.7 4v4z" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 7H3a1 1 0 00-1 1v8a3 3 0 003 3h14a3 3 0 003-3V9a2 2 0 00-2-2zM5 9h14v2H5V9zm14 6a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  )
}
