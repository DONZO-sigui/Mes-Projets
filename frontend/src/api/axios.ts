import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Mutex to prevent multiple concurrent refresh calls ──────────────────────
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function drainQueue(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken))
  refreshQueue = []
}

function rejectQueue() {
  refreshQueue = []
}

// ── Request interceptor — inject access token ────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor — transparent token refresh ─────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      _logout()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          original.headers['Authorization'] = `Bearer ${token}`
          resolve(apiClient(original))
        })
        // If refresh ultimately fails, reject all queued calls
        setTimeout(() => {
          if (isRefreshing) {
            reject(error)
          }
        }, 15_000)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      const newAccessToken: string = data.access_token
      const newRefreshToken: string = data.refresh_token

      localStorage.setItem('access_token', newAccessToken)
      localStorage.setItem('refresh_token', newRefreshToken)

      original.headers['Authorization'] = `Bearer ${newAccessToken}`
      drainQueue(newAccessToken)

      return apiClient(original)
    } catch {
      rejectQueue()
      _logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export function _logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.dispatchEvent(new Event('auth:logout'))
}
