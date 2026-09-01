import axios from 'axios'

// Axios instance - tự gắn JWT token từ localStorage vào mọi request
// Production: đặt VITE_API_URL = URL đầy đủ của backend (VD: https://api.example.com)
// Nếu không đặt, mặc định dùng '/api' (cùng domain - dev proxy hoặc reverse proxy).
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  // 60s: đủ cho Render free tier "đánh thức" sau giấc ngủ (~30-60s cold start)
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('yangrent_token') || localStorage.getItem('troflow_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại'
    const err = new Error(msg)
    err.status = error.response?.status
    throw err
  }
)

export default api
