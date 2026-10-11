import axios from 'axios'

// Axios instance - tự gắn JWT token từ localStorage vào mọi request
// Production: VITE_API_URL includes the API prefix (https://api.example.com/api).
// Nếu không đặt, mặc định dùng '/api' (cùng domain - dev proxy hoặc reverse proxy).
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  // Finite timeout; a sleeping API may need the user to retry.
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
  // Backend YangRent chuẩn hoá mọi response dưới dạng
  // { success, data, message }. Trả về envelope này thay vì AxiosResponse
  // để toàn bộ frontend có thể dùng nhất quán res.data.*.
  (res) => res.data,
  (error) => {
    const detail = error.response?.data?.detail
    const msg = error.response?.data?.message
      || (typeof detail === 'string' ? detail : null)
      || 'Có lỗi xảy ra, vui lòng thử lại'
    const err = new Error(msg)
    err.status = error.response?.status
    throw err
  }
)

export default api
