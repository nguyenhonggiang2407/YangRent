import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, List as ListIcon, Loader2, Map as MapIcon,
  MapPin, Ruler, Wallet, X,
} from 'lucide-react'
import L, { getLeaflet } from '../../lib/leafletCluster'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import api from '../../api/client'
import { useMap } from '../../context/MapContext'
import { vnd } from '../../utils/format'
import SmartImage from '../SmartImage'

// Rút gọn giá thành nhãn trên marker: 2.800.000 -> "2.8tr", 900.000 -> "900k"
function priceLabel(price) {
  if (price >= 1_000_000) {
    const tr = price / 1_000_000
    return `${Number.isInteger(tr) ? tr : tr.toFixed(1)}tr`
  }
  return `${Math.round(price / 1000)}k`
}

// divIcon hiển thị giá thay vì icon mặc định (anchor ở đỉnh mũi tên)
function roomIcon(room, active) {
  return L.divIcon({
    className: 'tm-marker',
    html: `<div class="tm-pin ${active ? 'is-active' : ''}"><span class="tm-pin-label">${priceLabel(room.price)}</span><span class="tm-pin-tip"></span></div>`,
    iconSize: [64, 42],
    iconAnchor: [32, 42],
  })
}

const HANOI_CENTER = [21.0285, 105.8542]

function MapRoomCard({ room, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`mb-2 flex w-full gap-3 rounded-2xl border bg-white p-2.5 text-left transition hover:shadow-soft ${
        active ? 'border-brand-500 ring-2 ring-brand-100' : 'border-ink-100 hover:border-brand-200'
      }`}
    >
      <SmartImage src={room.images?.[0]?.image_url || ''} alt={room.title} className="h-20 w-24 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 pr-1 text-sm font-bold text-ink-900">{room.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
          <MapPin size={12} className="shrink-0 text-brand-600" />
          <span className="truncate">{room.district}, {room.city}</span>
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
          <span className="flex items-center gap-1"><Ruler size={12} /> {room.area}m²</span>
          {room.is_verified && (
            <span className="flex items-center gap-1 text-brand-600"><BadgeCheck size={12} /> Đã xác minh</span>
          )}
        </div>
        <p className="mt-1 font-display text-sm font-extrabold text-brand-700">
          {vnd(room.price)}<span className="text-xs font-medium text-ink-400">/tháng</span>
        </p>
      </div>
    </button>
  )
}

export default function MapOverlay() {
  const { closeMap } = useMap()
  const navigate = useNavigate()
  const [roomsAll, setRoomsAll] = useState(null)   // toàn bộ phòng (để vẽ marker)
  const [visibleRooms, setVisibleRooms] = useState([]) // phòng trong khung nhìn hiện tại
  const [listLoading, setListLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'map'
  const [mapReady, setMapReady] = useState(false)

  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const markersRef = useRef(new Map())
  const roomsByIdRef = useRef({})
  const reqIdRef = useRef(0)

  // Khoá cuộn trang khi mở overlay + đóng bằng phím Esc
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') closeMap() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [closeMap])

  // Search-as-I-move: gọi API lọc theo bounds mỗi khi di chuyển bản đồ.
  // Bỏ qua bounds 0x0 (container chưa hiện) và dedupe request đang chờ cùng bounds
  // (StrictMode/invalidateSize có thể bắn nhiều request trùng nhau).
  const inflightBoundsRef = useRef(null)
  const fetchInView = useCallback((swLat, swLng, neLat, neLng) => {
    if (Math.abs(swLat - neLat) < 1e-9 || Math.abs(swLng - neLng) < 1e-9) return // bounds rỗng
    const key = [swLat, swLng, neLat, neLng].map((n) => n.toFixed(5)).join(',')
    if (inflightBoundsRef.current === key) return // đang chờ request cùng khu vực
    inflightBoundsRef.current = key
    const id = ++reqIdRef.current
    setListLoading(true)
    api.get('/rooms', {
      params: { sw_lat: swLat, sw_lng: swLng, ne_lat: neLat, ne_lng: neLng, page_size: 50, sort: 'newest' },
    })
      .then((res) => { if (reqIdRef.current === id) setVisibleRooms(res.data?.items || []) })
      .catch(() => { if (reqIdRef.current === id) setVisibleRooms([]) })
      .finally(() => {
        inflightBoundsRef.current = null
        if (reqIdRef.current === id) setListLoading(false)
      })
  }, [])

  // Đo lại kích thước bản đồ + gọi API theo bounds hiện tại.
  // Bắt buộc gọi khi bản đồ vừa hiện (mobile chuyển từ tab Danh sách sang Bản đồ)
  // vì Leaflet khởi tạo trong container display:none sẽ có bounds = 0x0.
  const refreshView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    map.invalidateSize()
    const b = map.getBounds()
    fetchInView(b.getSouthWest().lat, b.getSouthWest().lng, b.getNorthEast().lat, b.getNorthEast().lng)
  }, [fetchInView])

  // Khởi tạo bản đồ Leaflet một lần (lazy-load leaflet + markercluster)
  useEffect(() => {
    let disposed = false
    let cleanupReady = null

    // An toàn với React StrictMode / HMR: nếu container còn map cũ thì dọn trước
    const el = document.getElementById('tm-map-container')
    if (el && el._leaflet_id) delete el._leaflet_id

    getLeaflet().then((Lx) => {
      if (disposed) return
      const map = Lx.map('tm-map-container', {
        center: HANOI_CENTER,
        zoom: 12,
        scrollWheelZoom: true,
      })
      Lx.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)
      const cluster = Lx.markerClusterGroup({ maxClusterRadius: 48, showCoverageOnHover: false })
      map.addLayer(cluster)
      mapRef.current = map
      clusterRef.current = cluster
      setMapReady(true)

      map.on('moveend', () => {
        const b = map.getBounds()
        fetchInView(b.getSouthWest().lat, b.getSouthWest().lng, b.getNorthEast().lat, b.getNorthEast().lng)
      })

      // Chờ layout xong rồi đo kích thước lần đầu (tránh bounds 0x0)
      const t = setTimeout(() => refreshView(), 120)
      const onResize = () => { if (!map._container.offsetWidth) return; map.invalidateSize() }
      window.addEventListener('resize', onResize)
      cleanupReady = () => {
        clearTimeout(t)
        window.removeEventListener('resize', onResize)
        map.remove()
      }
    })

    return () => {
      disposed = true
      if (cleanupReady) cleanupReady()
      mapRef.current = null
      clusterRef.current = null
    }
  }, [fetchInView, refreshView])

  // Tải toàn bộ phòng công khai (marker luôn đầy đủ, cluster gom khi zoom out)
  useEffect(() => {
    api.get('/rooms', { params: { page_size: 50, sort: 'newest' } })
      .then((res) => setRoomsAll(res.data?.items || []))
      .catch(() => setRoomsAll([]))
  }, [])

  // Vẽ marker khi có dữ liệu phòng + bản đồ đã sẵn sàng
  useEffect(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!map || !cluster || !roomsAll || !mapReady) return

    cluster.clearLayers()
    markersRef.current.clear()
    const byId = {}
    roomsAll.forEach((room) => {
      if (room.latitude == null || room.longitude == null) return
      byId[room.id] = room
      const marker = L.marker([room.latitude, room.longitude], { icon: roomIcon(room, false) })
      marker.on('click', () => setSelected(room))
      markersRef.current.set(room.id, marker)
      cluster.addLayer(marker)
    })
    roomsByIdRef.current = byId

    // Query đầu tiên theo bounds hiện tại (sau khi layout xong)
    const t = setTimeout(() => refreshView(), 120)
    return () => clearTimeout(t)
  }, [roomsAll, mapReady, refreshView])

  // Cập nhật trạng thái active của marker khi chọn phòng
  useEffect(() => {
    markersRef.current.forEach((m, id) => {
      const room = roomsByIdRef.current[id]
      if (room) m.setIcon(roomIcon(room, id === selected?.id))
    })
  }, [selected])

  // Click vào thẻ phòng bên danh sách -> di chuyển bản đồ tới phòng đó
  const focusRoom = (room) => {
    setSelected(room)
    setMobileView('map')
    // Mobile: container vừa hiện lại -> đo lại kích thước rồi mới bay tới phòng
    setTimeout(() => {
      const map = mapRef.current
      if (!map) return
      map.invalidateSize()
      if (room.latitude != null) {
        map.flyTo([room.latitude, room.longitude], Math.max(map.getZoom(), 15), { duration: 0.6 })
      }
    }, 80)
  }

  // Mobile: chuyển sang tab Bản đồ -> đo lại + lọc lại theo bounds
  const switchToMap = () => {
    setMobileView('map')
    setTimeout(() => refreshView(), 80)
  }

  const goDetail = () => {
    if (!selected) return
    closeMap()
    navigate(`/rooms/${selected.id}`)
  }

  const hasGeoRooms = roomsAll !== null && roomsAll.some((r) => r.latitude != null)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <MapIcon size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink-900">Tìm phòng trên bản đồ</h2>
            <p className="truncate text-xs text-ink-400">
              {listLoading ? 'Đang tải…' : `${visibleRooms.length} phòng trong khu vực`}
            </p>
          </div>
        </div>

        {/* Tab chuyển view trên mobile */}
        <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1 lg:hidden">
          <button
            onClick={() => setMobileView('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mobileView === 'list' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'
            }`}
          >
            <ListIcon size={14} /> Danh sách
          </button>
          <button
            onClick={switchToMap}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mobileView === 'map' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'
            }`}
          >
            <MapIcon size={14} /> Bản đồ
          </button>
        </div>

        <button
          onClick={closeMap}
          aria-label="Đóng bản đồ"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
        >
          <X size={20} />
        </button>
      </div>

      {/* ===== Body: list trái / map phải ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Danh sách phòng */}
        <aside
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } w-full flex-col border-r border-ink-100 bg-ink-50/50 lg:flex lg:w-[400px] lg:shrink-0`}
        >
          <div className="flex-1 overflow-y-auto p-3">
            {listLoading && roomsAll === null ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-2.5">
                    <div className="h-20 w-24 animate-pulse rounded-xl bg-ink-100" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-ink-100" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-400">
                <Loader2 size={16} className="animate-spin" /> Đang lọc phòng trong khu vực…
              </div>
            ) : visibleRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-300">
                  <MapPin size={26} />
                </div>
                <p className="mt-4 font-display text-sm font-bold text-ink-700">Không có phòng trong khu vực này</p>
                <p className="mt-1 text-xs text-ink-400">Di chuyển bản đồ hoặc thu nhỏ để xem thêm phòng</p>
              </div>
            ) : (
              visibleRooms.map((room) => (
                <MapRoomCard key={room.id} room={room} active={selected?.id === room.id} onClick={() => focusRoom(room)} />
              ))
            )}
          </div>

          {!hasGeoRooms && (
            <p className="border-t border-ink-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              Một số phòng chưa có toạ độ nên không hiển thị trên bản đồ.
            </p>
          )}
        </aside>

        {/* Bản đồ */}
        <div className={`${mobileView === 'map' ? 'flex' : 'hidden'} relative flex-1 lg:flex`}>
          <div id="tm-map-container" className="absolute inset-0" />

          {/* Preview card khi click marker / thẻ phòng */}
          {selected && (
            <div className="absolute bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 lg:bottom-6 lg:left-6 lg:translate-x-0">
              <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
                <div className="flex gap-3 p-3">
                  <SmartImage src={selected.images?.[0]?.image_url || ''} alt={selected.title} className="h-24 w-28 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-bold text-ink-900">{selected.title}</p>
                      <button
                        onClick={() => setSelected(null)}
                        aria-label="Đóng preview"
                        className="shrink-0 rounded-lg p-1 text-ink-400 hover:bg-ink-100"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                      <MapPin size={12} className="shrink-0 text-brand-600" /> {selected.district}, {selected.city}
                    </p>
                    <p className="mt-1.5 font-display text-base font-extrabold text-brand-700">
                      {vnd(selected.price)}<span className="text-xs font-medium text-ink-400">/tháng</span>
                    </p>
                    <button
                      onClick={goDetail}
                      className="btn-primary mt-2 h-9 w-full px-3 text-xs"
                    >
                      Xem chi tiết <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
