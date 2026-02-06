import axios from 'axios'

// Try ports in order: 5001 (default), 5002, 5003
const tryPort = async (port) => {
  try {
    const response = await axios.get(`http://localhost:${port}/api/health`, { timeout: 2000 })
    // treat 200 or 429 (rate-limited health) as a valid backend port
    if (response.status === 200 || response.status === 429) return port
    return null
  } catch (err) {
    // if server responded with 429 it's likely the backend is present but rate-limiting
    if (err.response && err.response.status === 429) return port
    return null
  }
}

let API_BASE_URL = 'http://localhost:5001/api'

// Try to find the correct backend port
const initializeAPI = async () => {
  for (const port of [5001, 5002, 5003]) {
    const validPort = await tryPort(port)
    if (validPort) {
      API_BASE_URL = `http://localhost:${validPort}/api`
      console.log(`✅ Backend found on port ${validPort}`)
      break
    }
  }
}

initializeAPI()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }

    if (status === 429) {
      // Rate limited: show a friendly message and stop further immediate retries
      try {
        // avoid multiple alerts in quick succession
        if (!window._apiRateLimited) {
          window._apiRateLimited = true
          alert('Too many requests. The server is rate limiting your requests. Please wait a moment and try again.')
          setTimeout(() => { window._apiRateLimited = false }, 5000)
        }
      } catch (e) {
        // ignore
      }
    }

    return Promise.reject(error)
  }
)

export default api
