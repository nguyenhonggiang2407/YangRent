import L from 'leaflet'

// leaflet.markercluster là UMD build: nó tự gắn MarkerClusterGroup vào biến
// toàn cục `L`. Trong Vite (ESM) không có global L, nên phải gán thủ công
// trước khi nạp plugin. Dùng dynamic import để tránh top-level await
// (không tương thích build target mặc định es2020).
let ready = null

// Trả về promise của Leaflet đã sẵn sàng dùng L.markerClusterGroup()
export function getLeaflet() {
  if (!ready) {
    if (typeof window !== 'undefined') {
      window.L = L
    }
    ready = import('leaflet.markercluster').then(() => L)
  }
  return ready
}

export default L
