import axios from 'axios'

const baseURL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:8000';

const api = axios.create({
  baseURL: baseURL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add token to requests
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

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login (unless already on login page)
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Visual Relationship Viewer - Fetch workflow data
export const getEOPAsByPI = (piId) => api.get(`/api/eopa/by-pi/${piId}`)
export const getPOsByEOPA = (eopaId) => api.get(`/api/po/by-eopa/${eopaId}`)
export const getInvoicesByPO = (poId) => api.get(`/api/invoice/po/${poId}`)

export default api
