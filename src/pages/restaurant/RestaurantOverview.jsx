import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Filler,
  Legend,
  Title,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import api from '../../services/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  Title
)

// Utility helpers
const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(v)
const formatLKR = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', currencyDisplay: 'code', minimumFractionDigits: 2 }).format(v)

const safe = (val, fallback = 0) => (val == null ? fallback : val)

// Main Overview component
export default function RestaurantOverview({ restaurantId: propRestaurantId }) {
  const { id: paramId } = useParams() || {}
  const restaurantId = propRestaurantId || paramId || ''

  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch data from all three endpoints
  useEffect(() => {
    if (!restaurantId) return
    setLoading(true)
    setError(null)

    // Use axios instance with baseURL configured in frontend/src/services/api.js
    const fetchOrders = api.get('/orders', { params: { restaurantId } })
    const fetchReviews = api.get('/reviews', { params: { restaurantId } })
    const fetchMenus = api.get('/menus', { params: { restaurantId } })

    Promise.all([fetchOrders, fetchReviews, fetchMenus])
      .then(([ordersRes, reviewsRes, menusRes]) => {
        const ensure = (res, url) => {
          if (!res) throw new Error(`No response from ${url}`)
          // If backend returned HTML string (SPA fallback), surface snippet
          if (typeof res.data === 'string') {
            const snippet = String(res.data).slice(0, 300)
            throw new Error(`Expected JSON from ${url} but received HTML/text: ${snippet}`)
          }
          return res.data
        }

        const o = ensure(ordersRes, '/api/orders')
        const r = ensure(reviewsRes, '/api/reviews')
        const m = ensure(menusRes, '/api/menus')

        const unwrap = (payload) => (Array.isArray(payload) ? payload : (payload && (payload.data || payload)) || [])

        setOrders(unwrap(o))
        setReviews(unwrap(r))
        setMenus(unwrap(m))
      })
      .catch((err) => setError(err.message || 'Failed to fetch data'))
      .finally(() => setLoading(false))
  }, [restaurantId])

  // Derived metrics memoized for performance
  const metrics = useMemo(() => {
    // Prepare time ranges
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-index

    // Initialize monthly sales (Jan-Dec)
    const monthlySales = Array.from({ length: 12 }, () => 0)

    // Daily orders for current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const dailyOrders = Array.from({ length: daysInMonth }, () => 0)
    // Daily revenue for current month (completed orders only)
    const dailyRevenue = Array.from({ length: daysInMonth }, () => 0)

    // Weekly sales buckets for current month (weeks starting on day 1)
    const weekCount = Math.ceil(daysInMonth / 7)
    const weeklySales = Array.from({ length: weekCount }, () => 0)

    // Order status counts
    const statusCounts = {
      pending: 0,
      in_process: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    }

    let totalRevenue = 0
    let totalOrders = 0

    // Top meals accumulator {menuId: { qty, revenue }}
    const mealMap = new Map()

    // Ratings counts
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

    // Process orders
    for (const o of orders) {
      const total = safe(o.totalPrice, safe(o.total, 0))
      const created = new Date(o.createdAt || o.date || o.created)
      if (!isNaN(created.getTime())) {
        // Monthly sales
        if (created.getFullYear() === currentYear) {
          monthlySales[created.getMonth()] += Number(total || 0)
        }

        // Daily orders for current month
        if (created.getMonth() === currentMonth && created.getFullYear() === currentYear) {
          const day = created.getDate() - 1
          dailyOrders[day] = (dailyOrders[day] || 0) + 1
          const weekIdx = Math.floor(day / 7)
          // weeklySales will accumulate only completed orders for revenue
          // dailyRevenue accumulates revenue using items (price × qty) when available
          const isCompleted = String((o.status || o.orderStatus || '')).toLowerCase().includes('complete') || String((o.status || o.orderStatus || '')).toLowerCase() === 'approved'
          if (isCompleted) {
            // compute order revenue from items when possible
            const items = Array.isArray(o.items) ? o.items : o.orderItems || o.itemsOrdered || []
            let orderRev = 0
            if (items && items.length) {
              for (const it of items) {
                const qty = Number(it.quantity || it.qty || 1)
                const price = Number(it.price || it.unitPrice || 0)
                orderRev += qty * price
              }
            } else {
              orderRev = Number(total || 0)
            }
            weeklySales[weekIdx] = (weeklySales[weekIdx] || 0) + orderRev
            dailyRevenue[day] = (dailyRevenue[day] || 0) + orderRev
          }
        }
      }

      // Status counts
      const s = String((o.status || o.orderStatus || '').toLowerCase())
      if (s.includes('pending')) statusCounts.pending += 1
      else if (s.includes('process') || s.includes('in_process') || s.includes('in-process')) statusCounts.in_process += 1
      else if (s.includes('complete')) statusCounts.completed += 1
      else if (s.includes('reject') || s.includes('rejected')) statusCounts.rejected += 1
      else if (s.includes('cancel')) statusCounts.cancelled += 1
      else statusCounts.pending += 0

      totalRevenue += Number(total || 0)
      totalOrders += 1

      // Items aggregation (assumes order.items is an array of { menuItemId, quantity, price })
      const items = Array.isArray(o.items) ? o.items : o.orderItems || o.itemsOrdered || []
      for (const it of items) {
        const id = it.menuItemId || it.menuId || it.id || it._id || it.productId
        const qty = Number(it.quantity || it.qty || 1)
        const price = Number(it.price || it.unitPrice || 0)
        if (!id) continue
        const prev = mealMap.get(id) || { qty: 0, revenue: 0 }
        prev.qty += qty
        prev.revenue += qty * price
        mealMap.set(id, prev)
      }
    }

    // Process reviews
    let avgRating = 0
    if (reviews.length > 0) {
      let sum = 0
      for (const r of reviews) {
        const rate = Number(r.rating || r.stars || r.score || 0)
        sum += rate
        if (ratingCounts[rate]) ratingCounts[rate] += 1
      }
      avgRating = sum / reviews.length
    }

    // Prepare top meals array by mapping menu data
    const topMeals = Array.from(mealMap.entries()).map(([menuId, stats]) => {
      const menu = menus.find((m) => String(m._id || m.id) === String(menuId)) || {}
      return {
        id: menuId,
        name: menu.name || menu.title || `Item ${menuId}`,
        qty: stats.qty,
        revenue: stats.revenue,
      }
    })

    topMeals.sort((a, b) => b.qty - a.qty)

    // Order distribution for pie chart
    const orderDistribution = [statusCounts.pending, statusCounts.completed, statusCounts.cancelled || statusCounts.rejected]

    // cumulative monthly
    const cumulativeMonthly = []
    monthlySales.reduce((acc, cur, idx) => {
      const next = acc + cur
      cumulativeMonthly[idx] = next
      return next
    }, 0)

    // cumulative daily for current month
    const cumulativeDaily = []
    dailyRevenue.reduce((acc, cur, idx) => {
      const next = Math.round((acc + cur) * 100) / 100
      cumulativeDaily[idx] = next
      return next
    }, 0)

    return {
      dailyOrders,
      dailyRevenue,
      cumulativeDaily,
      monthlySales,
      cumulativeMonthly,
      weeklySales,
      statusCounts,
      totalRevenue,
      totalOrders,
      topMeals,
      avgRating,
      ratingCounts,
      orderDistribution,
    }
  }, [orders, reviews, menus])

  // Chart datasets and options
  const dailyChart = useMemo(() => {
    const labels = metrics.dailyOrders.map((_, i) => String(i + 1))
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: metrics.dailyOrders,
            backgroundColor: 'rgba(59,130,246,0.8)',
            hoverBackgroundColor: 'rgba(59,130,246,1)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Daily Orders (This Month)' } },
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
      },
    }
  }, [metrics.dailyOrders])

  const monthlyChart = useMemo(() => {
    const labels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Monthly Revenue',
            data: metrics.monthlySales,
            borderColor: 'rgba(34,197,94,0.95)',
            backgroundColor: 'rgba(34,197,94,0.12)',
            tension: 0.25,
            fill: true,
            pointRadius: 4,
          },
          {
            label: 'Cumulative',
            data: metrics.cumulativeMonthly,
            borderColor: 'rgba(99,102,241,0.9)',
            borderDash: [6, 4],
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: `Monthly Sales (${new Date().getFullYear()})` },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed && (ctx.parsed.y ?? ctx.parsed)
                return `${ctx.dataset.label || ''}: ${formatLKR(Number(val) || 0)}`
              },
            },
          },
        },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatLKR(Number(v) || 0) } } },
      },
    }
  }, [metrics.monthlySales, metrics.cumulativeMonthly])

  const dailyCumulativeChart = useMemo(() => {
    const labels = Array.from({ length: metrics.dailyRevenue?.length || 0 }, (_, i) => String(i + 1))
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Cumulative (This Month)',
            data: metrics.cumulativeDaily || [],
            borderColor: 'rgba(99,102,241,0.95)',
            backgroundColor: 'rgba(99,102,241,0.12)',
            tension: 0.25,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: `Daily Cumulative (This Month)` },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed && (ctx.parsed.y ?? ctx.parsed)
                return `${ctx.dataset.label || ''}: ${formatLKR(Number(val) || 0)}`
              },
            },
          },
        },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatLKR(Number(v) || 0) } } },
      },
    }
  }, [metrics.cumulativeDaily, metrics.dailyRevenue])

  const weeklyChart = useMemo(() => {
    const labels = metrics.weeklySales.map((_, i) => `Week ${i + 1}`)
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Weekly Sales',
            data: metrics.weeklySales,
            backgroundColor: 'rgba(234,88,12,0.9)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Weekly Sales (This Month)' } },
        scales: { x: { beginAtZero: true }, y: { grid: { display: false } } },
      },
    }
  }, [metrics.weeklySales])

  const ratingChart = useMemo(() => {
    const counts = [metrics.ratingCounts[5], metrics.ratingCounts[4], metrics.ratingCounts[3], metrics.ratingCounts[2], metrics.ratingCounts[1]]
    return {
      data: {
        labels: ['5★', '4★', '3★', '2★', '1★'],
        datasets: [
          {
            data: counts,
            backgroundColor: [
              'rgba(16,185,129,0.9)',
              'rgba(34,197,94,0.75)',
              'rgba(249,115,22,0.75)',
              'rgba(245,158,11,0.75)',
              'rgba(239,68,68,0.9)',
            ],
            hoverOffset: 8,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'right' }, title: { display: true, text: 'Rating Distribution' } } },
    }
  }, [metrics.ratingCounts])

  const distributionChart = useMemo(() => {
    return {
      data: {
        labels: ['Pending', 'Completed', 'Cancelled/Rejected'],
        datasets: [
          {
            data: metrics.orderDistribution,
            backgroundColor: ['#60A5FA', '#34D399', '#F87171'],
            hoverOffset: 6,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Order Distribution' } } },
    }
  }, [metrics.orderDistribution])

  if (!restaurantId) {
    return (
      <div className="p-6">
        <div className="text-red-600">Restaurant ID is required to load overview.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse bg-slate-100 rounded-lg p-6">Loading overview...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error loading data: {error}</div>
      </div>
    )
  }

  // Render
  return (
    <div className="p-6 space-y-6">
      {/* Top metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="mt-2 text-2xl font-semibold">{metrics.totalOrders}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="mt-2 text-2xl font-semibold text-yellow-600">{metrics.statusCounts.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">In Process</div>
          <div className="mt-2 text-2xl font-semibold text-indigo-600">{metrics.statusCounts.in_process}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="mt-2 text-2xl font-semibold text-green-600">{metrics.statusCounts.completed}</div>
        </div>
      </div>

      {/* Revenue and rating summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Revenue (YTD)</div>
              <div className="mt-1 text-3xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              <div className="text-sm text-gray-400">Cumulative shown in monthly chart</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Average Rating</div>
              <div className="mt-1 text-2xl font-semibold">{metrics.avgRating ? metrics.avgRating.toFixed(2) : '—'}</div>
              <div className="text-xs text-gray-400">Based on {reviews.length} reviews</div>
            </div>
          </div>

          <div className="mt-4">
            <Line {...monthlyChart} />
          </div>
          <div className="mt-6">
            <div className="text-sm text-gray-500 mb-2">Daily cumulative (this month)</div>
            <Line {...dailyCumulativeChart} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="text-sm text-gray-500">Ratings Breakdown</div>
          <div className="mt-2 flex-1">
            <Doughnut {...ratingChart} />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>5★</div>
              <div>{metrics.ratingCounts[5] || 0} ({reviews.length ? Math.round(((metrics.ratingCounts[5] || 0) / reviews.length) * 100) : 0}%)</div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>4★</div>
              <div>{metrics.ratingCounts[4] || 0} ({reviews.length ? Math.round(((metrics.ratingCounts[4] || 0) / reviews.length) * 100) : 0}%)</div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>3★</div>
              <div>{metrics.ratingCounts[3] || 0} ({reviews.length ? Math.round(((metrics.ratingCounts[3] || 0) / reviews.length) * 100) : 0}%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts grid: daily, weekly, distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
          <Bar {...dailyChart} />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <Bar {...weeklyChart} />
          <div className="mt-4">
            <Doughnut {...distributionChart} />
          </div>
        </div>
      </div>

      {/* Top selling meals table */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Selling Items</h3>
          <div className="text-sm text-gray-500">Top {Math.min(10, metrics.topMeals.length)} by quantity</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead className="text-sm text-gray-500 border-b">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topMeals.slice(0, 10).map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">{m.name}</td>
                  <td className="py-3">{m.qty}</td>
                  <td className="py-3">{formatCurrency(m.revenue)}</td>
                </tr>
              ))}
              {metrics.topMeals.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No sales data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
