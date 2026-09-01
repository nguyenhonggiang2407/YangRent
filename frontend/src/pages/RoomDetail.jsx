import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Bath, Box, Calendar, ChevronLeft, ChevronRight,
  Clock, Droplets, DollarSign, Eye, Flag, Heart, MapPin, Maximize, MessageCircle,
  Phone, Play, Ruler, Send, ShieldCheck, Users, Video, Wifi, KeyRound, X, Zap,
} from 'lucide-react'
import api from '../api/client'
import SmartImage from '../components/SmartImage'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, EmptyState, ErrorBanner, Modal, Spinner, toast } from '../components/ui'
import { ROOM_STATUS_LABEL, ROOM_STATUS_STYLE, ROOM_TYPE_LABEL, timeAgo, vnd } from '../utils/format'

/* ========== 360 Panorama Viewer ========== */
function PanoramaViewer({ url, onClose }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window._pannellumLoaded) { setReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.pannellum.org/2.5/pannellum.js'
    s.onload = () => {
      const l = document.createElement('link')
      l.rel = 'stylesheet'; l.href = 'https://cdn.pannellum.org/2.5/pannellum.css'
      document.head.appendChild(l); window._pannellumLoaded = true; setReady(true)
    }
    document.body.appendChild(s)
  }, [])
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      try {
        window.pannellum.viewer('panorama-container', {
          type: 'equirectangular', panorama: url,
          autoLoad: true, showControls: true, compass: true,
          hfov: 110, minHfov: 50, maxHfov: 120,
        })
      } catch (e) { console.error('Panorama error:', e) }
    }, 200)
    return () => clearTimeout(timer)
  }, [ready, url])
  return (
    <div className="fixed inset-0 z-[70] bg-black/90">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-3 text-white hover:bg-white/30 transition" aria-label="Đóng">
        <X size={24} />
      </button>
      <div className="flex h-full items-center justify-center">
        {!ready ? <Spinner size={40} className="text-white" /> : <div id="panorama-container" className="h-full w-full" />}
      </div>
    </div>
  )
}

/* ========== Booking Modal ========== */
function BookingModal({ room, user, navigate, onBooked }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ message: '', move_in_date: '', lease_duration: '', deposit_amount: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!user) { navigate('/login'); return }
    setLoading(true)
    try {
      await api.post(`/rooms/${room.id}/book`, {
        ...form,
        lease_duration: form.lease_duration ? Number(form.lease_duration) : null,
        deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : 0,
      })
      toast('Yêu cầu thuê đã được gửi!')
      setOpen(false)
      onBooked?.()
    } catch (e) { toast(e.message, 'error') } finally { setLoading(false) }
  }
  return (
    <>
      <button onClick={() => user ? setOpen(true) : navigate('/login')} className="btn-primary w-full">
        <DollarSign size={17} /> Chốt phòng
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Yêu cầu thuê chỗ ở">
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="font-display text-sm font-bold text-brand-800">{room.title}</p>
            <p className="mt-1 text-lg font-bold text-brand-700">{vnd(room.price)}/tháng</p>
          </div>
          <div>
            <label className="label">Ngày dự kiến chuyển vào</label>
            <input className="input" type="date" value={form.move_in_date} onChange={(e) => setForm({...form, move_in_date: e.target.value})} />
          </div>
          <div>
            <label className="label">Thời hạn thuê (tháng)</label>
            <input className="input" type="number" min={1} value={form.lease_duration} onChange={(e) => setForm({...form, lease_duration: e.target.value})} placeholder="VD: 12" />
          </div>
          <div>
            <label className="label">Tiền đặt cọc (VNĐ)</label>
            <input className="input" type="number" min={0} value={form.deposit_amount} onChange={(e) => setForm({...form, deposit_amount: e.target.value})} placeholder="VD: 5600000" />
          </div>
          <div>
            <label className="label">Tin nhắn cho chủ nhà (không bắt buộc)</label>
            <textarea className="input min-h-20" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} placeholder="Giới thiệu bản thân, nhu cầu..." />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setOpen(false)}>Huỷ</button>
            <button className="btn-primary" onClick={submit} disabled={loading}>
              {loading ? <Spinner size={16} className="text-white" /> : <Send size={16} />} Gửi yêu cầu
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ========== Map (Leaflet lazy load) ========== */
function RoomMap({ lat, lng, title }) {
  const [Map, setMap] = useState(null)
  useEffect(() => {
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css')
      if (!window._leafletInit) {
        window._leafletInit = true
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })
      }
      setMap(() => L)
    })
  }, [])

  useEffect(() => {
    if (!Map || !lat || !lng) return
    const map = Map.map('room-map', { center: [lat, lng], zoom: 15, scrollWheelZoom: false })
    Map.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    Map.marker([lat, lng]).addTo(map).bindPopup('<b>' + title + '</b>').openPopup()
    return () => map.remove()
  }, [Map, lat, lng, title])

  if (!lat || !lng) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-ink-50 text-sm text-ink-400">
        <MapPin size={18} className="mr-2" /> Không có vị trí bản đồ
      </div>
    )
  }
  return <div id="room-map" className="h-64 w-full rounded-2xl border border-ink-100" />
}

/* ========== Main RoomDetail ========== */
export default function RoomDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!lightbox) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') setActiveImg((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1))
      if (e.key === 'ArrowRight') setActiveImg((i) => (i + 1) % Math.max(images.length, 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightbox, images.length])
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [sending, setSending] = useState(false)
  const [show360, setShow360] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/rooms/${id}`)
      .then((res) => { setRoom(res.data); setError(null) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const images = room?.images?.length ? room.images : []
  const amenities = room?.amenities || []
  const videos = room?.videos || []
  const has360 = room?.view_360_enabled && room?.view_3d_url

  const toggleFavorite = async () => {
    if (!user) { navigate('/login'); return }
    try {
      const res = await api.post(`/rooms/${room.id}/favorite`)
      toast(res.data.is_favorite ? 'Đã lưu vào yêu thích' : 'Đã bỏ yêu thích')
    } catch (e) { toast(e.message, 'error') }
  }

  const contactLandlord = async () => {
    if (!user) { navigate('/login'); return }
    try {
      const res = await api.post('/chat/conversations', {
        user_id: room.landlord_id, room_id: room.id,
        initial_message: `Xin chào, tôi quan tâm đến phòng "${room.title}" trên YangRent. Phòng còn trống không ạ?`,
      })
      navigate('/chat', { state: { conversationId: res.data.id } })
    } catch (e) { toast(e.message, 'error') }
  }

  const submitReport = async () => {
    if (!user) { navigate('/login'); return }
    setSending(true)
    try {
      await api.post(`/rooms/${room.id}/report`, {
        target_type: 'ROOM', target_id: room.id, reason: reportReason || 'Tin đăng đáng ngờ',
        description: reportReason,
      })
      toast('Cảm ơn bạn! Báo cáo đã được gửi tới đội ngũ quản trị.')
      setReportOpen(false); setReportReason('')
    } catch (e) { toast(e.message, 'error') } finally { setSending(false) }
  }

  const nextImg = () => setActiveImg((i) => (i + 1) % Math.max(images.length, 1))
  const prevImg = () => setActiveImg((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1))

  /* --- Loading skeleton --- */
  if (loading) {
    return (
      <div className="container-x py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="h-96 animate-pulse rounded-3xl bg-ink-100" />
            <div className="mt-4 space-y-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
          <div className="h-96 animate-pulse rounded-3xl bg-ink-100" />
        </div>
      </div>
    )
  }

  if (error) return <div className="container-x py-16"><ErrorBanner message={error} onRetry={() => window.location.reload()} /></div>
  if (!room) return null

  return (
    <div className="container-x py-8 animate-fadeUp">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-5 !px-2">
        <ArrowLeft size={17} /> Quay lại
      </button>

      {/* ===== Header ===== */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{room.title}</h1>
            {room.is_verified && <span className="badge bg-brand-50 text-brand-700"><BadgeCheck size={13} /> Đã xác minh</span>}
            {room.is_featured && <span className="badge bg-amber-50 text-amber-700">★ Nổi bật</span>}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
            <MapPin size={15} className="text-brand-600" />
            {room.address || `${room.ward}, ${room.district}`}, {room.city} · Đăng {timeAgo(room.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleFavorite} className="btn-secondary" title="Lưu yêu thích">
            <Heart size={17} /> Lưu
          </button>
          <button onClick={() => setReportOpen(true)} className="btn-ghost text-red-500" title="Báo cáo">
            <Flag size={17} /> Báo cáo
          </button>
        </div>
      </div>

      {/* ===== Main grid ===== */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* Gallery */}
          <div className="relative">
            <div className="group relative h-[320px] overflow-hidden rounded-3xl sm:h-[440px]">
              {images.length > 0 ? (
                <button type="button" onClick={() => setLightbox(true)} className="h-full w-full text-left" aria-label="Xem tất cả ảnh">
                  <SmartImage
                    key={activeImg}
                    src={images[activeImg]?.image_url}
                    alt={`${room.title} – ảnh ${activeImg + 1}`}
                    eager={activeImg === 0}
                    className="h-full w-full cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </button>
              ) : (
                <SmartImage src="" alt={`${room.title} – chưa có hình ảnh`} className="h-full w-full" eager />
              )}
              {images.length > 1 && (
                <>
                  <button onClick={prevImg} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-soft backdrop-blur transition hover:scale-105" aria-label="Ảnh trước">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={nextImg} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-soft backdrop-blur transition hover:scale-105" aria-label="Ảnh sau">
                    <ChevronRight size={20} />
                  </button>
                  <button type="button" onClick={() => setLightbox(true)} className="absolute bottom-4 right-4 rounded-full bg-ink-900/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-ink-900">
                    Xem tất cả ảnh · {activeImg + 1}/{images.length}
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl transition ${i === activeImg ? 'ring-3 ring-brand-500' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <SmartImage src={img.image_url} alt={`${room.title} – ảnh thu nhỏ ${i + 1}`} className="h-full w-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===== 360 View Button ===== */}
          {has360 && (
            <button onClick={() => setShow360(true)} className="btn-secondary mt-4 w-full sm:w-auto">
              <Eye size={17} /> Xem không gian 360°
            </button>
          )}

          {/* ===== Video section ===== */}
          {videos.length > 0 && (
            <div className="card mt-6 p-6">
              <h2 className="font-display text-lg font-bold text-ink-900"><Video size={18} className="mr-2 inline text-brand-600" />Video giới thiệu</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {videos.map((v) => (
                  <div key={v.id} className="overflow-hidden rounded-2xl border border-ink-100">
                    <div className="relative aspect-video bg-ink-900">
                      <video
                        src={v.video_url}
                        controls
                        preload="metadata"
                        className="h-full w-full object-cover"
                        poster={v.thumbnail_url || ''}
                      />
                    </div>
                    {v.title && <p className="px-4 py-2 text-sm font-medium text-ink-700">{v.title}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thông tin cơ bản */}
          <div className="card mt-8 p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Thông tin chỗ ở</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { icon: Ruler, label: 'Diện tích', value: `${room.area}m²` },
                { icon: Users, label: 'Số người', value: `${room.max_occupants} người` },
                { icon: Bath, label: 'Phòng tắm', value: room.bathroom_type === 'PRIVATE' ? 'WC riêng' : 'WC chung' },
                { icon: Maximize, label: 'Loại chỗ ở', value: ROOM_TYPE_LABEL[room.room_type] || room.room_type },
                { icon: ShieldCheck, label: 'Nội thất', value: room.furnished ? 'Đầy đủ' : 'Tự sắm' },
                { icon: BadgeCheck, label: 'Trạng thái', value: ROOM_STATUS_LABEL[room.status] || room.status },
                { icon: Zap, label: 'Điện', value: `${vnd(room.electricity_price)}/kWh` },
                { icon: Droplets, label: 'Nước', value: `${vnd(room.water_price)}/m³` },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-ink-50 p-4">
                  <f.icon size={18} className="text-brand-600" />
                  <p className="mt-2 text-xs text-ink-400">{f.label}</p>
                  <p className="text-sm font-bold text-ink-800">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tiện ích */}
          <div className="card mt-6 p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Tiện ích</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {amenities.length === 0 && <p className="text-sm text-ink-400">Không có tiện ích đặc biệt</p>}
              {amenities.map((a) => (
                <span key={a} className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700">
                  <BadgeCheck size={15} /> {a}
                </span>
              ))}
            </div>
          </div>

          {/* Mô tả */}
          <div className="card mt-6 p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Mô tả chi tiết</h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">{room.description}</p>
            <div className="mt-6 grid gap-3 rounded-xl bg-ink-50 p-4 text-sm text-ink-600 sm:grid-cols-2">
              <p className="flex items-center gap-2"><Wifi size={15} className="text-brand-600" /> Internet: <b>{vnd(room.internet_price)}/tháng</b></p>
              <p className="flex items-center gap-2"><KeyRound size={15} className="text-brand-600" /> Đặt cọc tham khảo: <b>2 tháng tiền thuê</b></p>
              <p className="flex items-center gap-2"><Eye size={15} className="text-brand-600" /> Lượt xem: <b>{room.view_count}</b></p>
              <p className="flex items-center gap-2"><MapPin size={15} className="text-brand-600" /> {room.ward ? `${room.ward}, ` : ''}{room.district}, {room.city}</p>
            </div>
          </div>

          {/* Bản đồ */}
          <div className="card mt-6 p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-ink-900">Vị trí trên bản đồ</h2>
            <RoomMap lat={room.latitude} lng={room.longitude} title={room.title} />
          </div>
        </div>

        {/* ===== Sidebar ===== */}
        <div className="space-y-6">
          {/* Card giá */}
          <div className="card overflow-hidden">
            <div className="p-6">
              <div className="flex items-end justify-between">
                <p className="font-display text-3xl font-extrabold text-brand-700">{vnd(room.price)}</p>
                <span className="pb-1 text-sm text-ink-400">/tháng</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-400">Diện tích</p>
                  <p className="font-bold text-ink-800">{room.area}m²</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-400">Số người</p>
                  <p className="font-bold text-ink-800">{room.max_occupants} người</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-400">Loại phòng</p>
                  <p className="font-bold text-ink-800">{ROOM_TYPE_LABEL[room.room_type] || room.room_type}</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-400">Khu vực</p>
                  <p className="font-bold text-ink-800">{room.district}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <button onClick={contactLandlord} className="btn-primary w-full">
                  <MessageCircle size={17} /> Nhắn tin cho chủ nhà
                </button>
                <BookingModal room={room} user={user} navigate={navigate} />
                <button onClick={toggleFavorite} className="btn-ghost w-full">
                  <Heart size={16} /> Lưu vào yêu thích
                </button>
              </div>
            </div>
          </div>

          {/* Chủ nhà */}
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <Avatar src={room.landlord?.avatar_url} name={room.landlord?.full_name} size={48} />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-display text-sm font-bold text-ink-900">{room.landlord?.full_name}</p>
                  {room.landlord?.is_verified && <BadgeCheck size={15} className="text-brand-600" />}
                </div>
                <p className="text-xs text-ink-400">
                  {room.landlord?.is_verified ? 'Chủ nhà đã xác minh' : 'Chưa xác minh'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button onClick={contactLandlord} className="btn-secondary !py-2 text-xs">
                <MessageCircle size={14} /> Liên hệ
              </button>
              <button onClick={contactLandlord} className="btn-secondary !py-2 text-xs">
                <Phone size={14} /> Gọi điện
              </button>
            </div>
          </div>

          {/* Safety notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <h3 className="font-display text-sm font-bold text-amber-800">Lưu ý an toàn</h3>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-amber-800/90">
              <li>· Không chuyển tiền trước khi xem phòng thực tế</li>
              <li>· Kiểm tra phòng, đồng hồ điện nước và giấy tờ trước khi đặt cọc</li>
              <li>· Xác minh thông tin chủ nhà qua badge "Đã xác minh"</li>
              <li>· Báo cáo ngay nếu phát hiện tin đăng đáng ngờ</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== Lightbox ===== */}
      {lightbox && images.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/95 p-4" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition" aria-label="Đóng">
            <X size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevImg() }} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition" aria-label="Trước">
            <ChevronLeft size={24} />
          </button>
          <img
            src={images[activeImg]?.image_url}
            alt={`${room.title} – ảnh ${activeImg + 1}`}
            loading="eager"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-lift"
          />
          <button onClick={(e) => { e.stopPropagation(); nextImg() }} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition" aria-label="Sau">
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {/* ===== 360 Panorama Viewer ===== */}
      {show360 && has360 && <PanoramaViewer url={room.view_3d_url} onClose={() => setShow360(false)} />}

      {/* ===== Report modal ===== */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Báo cáo tin đăng">
        <p className="text-sm text-ink-500">Báo cáo này sẽ được gửi tới đội ngũ quản trị YangRent để xem xét.</p>
        <select className="input mt-4" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
          <option value="">Chọn lý do báo cáo</option>
          <option>Tin đăng lừa đảo</option>
          <option>Thông tin không đúng sự thật</option>
          <option>Giá không đúng với thực tế</option>
          <option>Spam / đăng trùng lặp</option>
          <option>Nội dung không phù hợp</option>
        </select>
        <textarea
          className="input mt-3 min-h-24"
          placeholder="Mô tả chi tiết vấn đề (không bắt buộc)"
          value={reportReason === '' ? '' : reportReason}
          onChange={(e) => setReportReason(e.target.value)}
        />
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setReportOpen(false)}>Huỷ</button>
          <button className="btn-primary bg-red-500 hover:bg-red-600" onClick={submitReport} disabled={sending}>
            {sending ? <Spinner size={16} className="text-white" /> : <Flag size={16} />} Gửi báo cáo
          </button>
        </div>
      </Modal>
    </div>
  )
}
