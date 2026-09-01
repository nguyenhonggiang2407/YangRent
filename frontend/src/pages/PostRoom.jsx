import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, ImagePlus, Loader2, Send, Trash2, Upload } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Spinner, toast } from '../components/ui'
import { ROOM_TYPE_LABEL } from '../utils/format'
import { PROPERTY_TYPES } from '../config/brand'

const DISTRICTS = ['Cầu Giấy', 'Nam Từ Liêm', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông', 'Hoàng Mai', 'Ba Đình', 'Tây Hồ', 'Bắc Từ Liêm']

export default function PostRoom() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const [amenities, setAmenities] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', price: '', area: '', address: '', city: 'Hà Nội',
    district: 'Cầu Giấy', ward: '', room_type: 'RENTAL_ROOM', bathroom_type: 'PRIVATE',
    furnished: true, max_occupants: 1, electricity_price: 4000, water_price: 25000,
    internet_price: 100000, latitude: '', longitude: '',
    amenity_ids: [], images: ['', '', '', '', '', ''], video_url: '', view_3d_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(null) // index dang upload
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputs = useRef({})

  useEffect(() => {
    api.get('/rooms/meta').then((res) => setAmenities(res.data.amenities || [])).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setNum = (k) => (e) => setForm({ ...form, [k]: e.target.value === '' ? '' : Number(e.target.value) })
  const setImg = (i) => (e) => {
    const images = [...form.images]
    images[i] = e.target.value
    setForm({ ...form, images })
  }

  // Upload file tu may -> backend (Supabase Storage) -> URL
  const uploadFile = async (i, file) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      toast('Chỉ hỗ trợ JPG, PNG, WEBP, GIF', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Ảnh quá lớn (tối đa 5MB)', 'error')
      return
    }
    setUploading(i)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const res = await api.post('/uploads/image', { data_url: reader.result })
          const images = [...form.images]
          images[i] = res.data.url
          setForm({ ...form, images })
          toast('Đã tải ảnh lên ✓')
        } catch (e) {
          toast(e.message, 'error')
        } finally {
          setUploading(null)
        }
      }
      reader.readAsDataURL(file)
    } catch (e) {
      toast('Không đọc được file ảnh', 'error')
      setUploading(null)
    }
  }
  const toggleAmenity = (id) => {
    const ids = form.amenity_ids.includes(id)
      ? form.amenity_ids.filter((x) => x !== id)
      : [...form.amenity_ids, id]
    setForm({ ...form, amenity_ids: ids })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        area: Number(form.area),
        max_occupants: Number(form.max_occupants),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        images: form.images.filter((u) => u.trim()).map((u, i) => ({ image_url: u.trim(), is_primary: i === 0, sort_order: i })),
        video_url: form.video_url.trim() || undefined,
        view_3d_url: form.view_3d_url.trim() || undefined,
        view_360_enabled: !!form.view_3d_url.trim(),
      }
      await api.post('/rooms', payload)
      toast('Đăng tin thành công! Bài đăng đang chờ quản trị viên duyệt.')
      navigate('/dashboard/landlord')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!hasRole('LANDLORD') && !hasRole('ADMIN')) {
    return (
      <div className="container-x max-w-lg py-20 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Bạn cần tài khoản chủ nhà</h1>
        <p className="mt-2 text-sm text-ink-500">Đăng ký tài khoản chủ nhà để đăng bất động sản cho thuê trên YangRent.</p>
        <button onClick={() => navigate('/register')} className="btn-primary mt-6">Tạo tài khoản chủ nhà</button>
      </div>
    )
  }

  const previewRoom = {
    title: form.title || 'Tiêu đề chỗ ở của bạn',
    price: Number(form.price) || 0,
    area: form.area || 0,
    district: form.district,
    city: form.city,
    images: form.images.filter(Boolean).map((u) => ({ image_url: u })),
    amenities: amenities.filter((a) => form.amenity_ids.includes(a.id)).map((a) => a.name),
  }

  return (
    <div className="container-x max-w-4xl py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Đăng tin cho thuê</h1>
      <p className="mt-1 text-sm text-ink-500">Điền đầy đủ thông tin để bài đăng của bạn tiếp cận nhiều người thuê hơn. Bài đăng sẽ được admin duyệt trước khi công khai.</p>

      <form onSubmit={submit} className="card mt-6 space-y-8 p-6 sm:p-8">
        {/* Thông tin cơ bản */}
        <div>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">1. Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Tiêu đề *</label>
              <input className="input" required minLength={5} value={form.title} onChange={set('title')} placeholder="VD: Studio 25m² full nội thất gần Keangnam" />
            </div>
            <div>
              <label className="label">Giá thuê (đ/tháng) *</label>
              <input className="input" type="number" required min={0} value={form.price} onChange={setNum('price')} placeholder="2800000" />
            </div>
            <div>
              <label className="label">Diện tích (m²) *</label>
              <input className="input" type="number" required min={0} value={form.area} onChange={setNum('area')} placeholder="25" />
            </div>
            <div>
              <label className="label">Thành phố</label>
              <select className="input" value={form.city} onChange={set('city')}>
                <option>Hà Nội</option>
                <option>TP.HCM</option>
              </select>
            </div>
            <div>
              <label className="label">Quận huyện *</label>
              <select className="input" value={form.district} onChange={set('district')}>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phường/xã</label>
              <input className="input" value={form.ward} onChange={set('ward')} placeholder="VD: Dịch Vọng Hậu" />
            </div>
            <div>
              <label className="label">Địa chỉ chi tiết</label>
              <input className="input" value={form.address} onChange={set('address')} placeholder="Số nhà, ngõ, đường..." />
            </div>
          </div>
        </div>

        {/* Loại chỗ ở */}
        <div>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">2. Loại chỗ ở & tiện ích</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Loại chỗ ở</label>
              <select className="input" value={form.room_type} onChange={set('room_type')}>
                {PROPERTY_TYPES.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{ROOM_TYPE_LABEL[t.value] || t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phòng tắm</label>
              <select className="input" value={form.bathroom_type} onChange={set('bathroom_type')}>
                <option value="PRIVATE">WC riêng</option>
                <option value="SHARED">WC chung</option>
              </select>
            </div>
            <div>
              <label className="label">Số người tối đa</label>
              <input className="input" type="number" min={1} value={form.max_occupants} onChange={setNum('max_occupants')} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={form.furnished} onChange={(e) => setForm({ ...form, furnished: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
            <span className="text-sm text-ink-700">Chỗ ở đã có nội thất</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {amenities.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => toggleAmenity(a.id)}
                className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                  form.amenity_ids.includes(a.id)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-500 hover:border-ink-300'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Điện nước */}
        <div>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">3. Giá điện - nước - internet</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Giá điện (đ/kWh)</label>
              <input className="input" type="number" value={form.electricity_price} onChange={setNum('electricity_price')} />
            </div>
            <div>
              <label className="label">Giá nước (đ/m³)</label>
              <input className="input" type="number" value={form.water_price} onChange={setNum('water_price')} />
            </div>
            <div>
              <label className="label">Internet (đ/tháng)</label>
              <input className="input" type="number" value={form.internet_price} onChange={setNum('internet_price')} />
            </div>
          </div>
        </div>

        {/* Hình ảnh */}
        <div>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">4. Hình ảnh chỗ ở (khuyến nghị 5-6 ảnh)</h2>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-400">
            <ImagePlus size={14} /> Tải ảnh từ máy (lưu lên Supabase Storage) hoặc dán URL ảnh trực tiếp (Unsplash, Pexels...).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {form.images.map((url, i) => (
              <div key={i} className="rounded-xl border border-ink-200 p-3">
                <label className="label">Ảnh {i + 1}{i === 0 ? ' (ảnh chính)' : ''}</label>
                {/* Upload file */}
                <input
                  ref={(el) => { fileInputs.current[i] = el }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(i, f); e.target.value = '' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputs.current[i]?.click()}
                  disabled={uploading === i}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  {uploading === i ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading === i ? 'Đang tải lên...' : 'Tải ảnh từ máy'}
                </button>
                {/* Hoac dan URL */}
                <div className="relative">
                  <input className="input !pr-9 !py-1.5 !text-xs" value={url} onChange={setImg(i)} placeholder="Hoặc dán URL ảnh..." />
                  {url && (
                    <button type="button" onClick={() => setImg(i)({ target: { value: '' } })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {url ? (
                  <img src={url} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.3 }} />
                ) : (
                  <div className="mt-2 flex h-20 w-full items-center justify-center rounded-lg bg-ink-50 text-xs text-ink-300">Chưa có ảnh</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Video & 360 View */}
        <div>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">6. Video & Chế độ xem 360° (không bắt buộc)</h2>
          <p className="mb-3 text-xs text-ink-400">Thêm video giới thiệu hoặc link panorama 360° để người thuê trải nghiệm phòng tốt hơn.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Video URL (YouTube, Vimeo, hoặc link trực tiếp .mp4)</label>
              <input className="input" value={form.video_url} onChange={set('video_url')} placeholder="https://youtube.com/watch?v=..." />
              {form.video_url && (
                <div className="mt-2 overflow-hidden rounded-xl border border-ink-100">
                  <div className="relative aspect-video bg-ink-900">
                    {form.video_url.includes('youtube') || form.video_url.includes('youtu.be') ? (
                      <iframe src={`https://www.youtube.com/embed/${form.video_url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ''}`} className="h-full w-full" allowFullScreen title="Video preview" />
                    ) : (
                      <video src={form.video_url} controls preload="metadata" className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="label">Link 360° Panorama (URL ảnh equirectangular)</label>
              <input className="input" value={form.view_3d_url} onChange={set('view_3d_url')} placeholder="https://images.example.com/panorama.jpg" />
              {form.view_3d_url && (
                <div className="mt-2 rounded-xl border border-ink-100 bg-ink-50 p-4 text-center">
                  <img src={form.view_3d_url} alt="360 preview" className="mx-auto h-24 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  <p className="mt-2 text-xs text-ink-400">✓ Link 360° đã hợp lệ — người thuê sẽ thấy nút "Xem không gian phòng 360°"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mô tả + toạ độ */}
        <div>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">5. Mô tả & vị trí</h2>
          <label className="label">Mô tả chi tiết *</label>
          <textarea className="input min-h-36" required value={form.description} onChange={set('description')}
            placeholder="Mô tả chỗ ở, khu vực xung quanh, điều kiện thuê, giờ giấc..." />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Vĩ độ (latitude)</label>
              <input className="input" value={form.latitude} onChange={set('latitude')} placeholder="VD: 21.0310" />
            </div>
            <div>
              <label className="label">Kinh độ (longitude)</label>
              <input className="input" value={form.longitude} onChange={set('longitude')} placeholder="VD: 105.8000" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => setPreviewOpen(!previewOpen)}>
            <Eye size={17} /> Xem trước
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Spinner size={17} className="text-white" /> : <Send size={17} />} Đăng tin
          </button>
        </div>
      </form>

      {/* Preview */}
      {previewOpen && (
        <div className="card mt-6 overflow-hidden">
          <div className="border-b border-ink-100 px-6 py-4">
            <h3 className="font-display text-base font-bold text-ink-900">Xem trước bài đăng</h3>
          </div>
          <div className="grid sm:grid-cols-[300px_1fr]">
            <div className="h-56 bg-ink-100 sm:h-full">
              {previewRoom.images.length > 0 ? (
                <img src={previewRoom.images[0].image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-400">Chưa có ảnh</div>
              )}
            </div>
            <div className="p-6">
              <h4 className="font-display text-lg font-bold text-ink-900">{previewRoom.title}</h4>
              <p className="mt-1 text-sm text-ink-500">📍 {previewRoom.district}, {previewRoom.city}</p>
              <p className="mt-3 font-display text-2xl font-extrabold text-brand-700">
                {previewRoom.price ? new Intl.NumberFormat('vi-VN').format(previewRoom.price) + 'đ/tháng' : 'Chưa nhập giá'}
              </p>
              <p className="mt-1 text-sm text-ink-500">{previewRoom.area}m²</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {previewRoom.amenities.map((a) => (
                  <span key={a} className="badge bg-brand-50 text-brand-700">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
