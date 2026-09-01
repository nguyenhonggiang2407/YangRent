import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, Plus, Send, Trash2, Upload } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Spinner, toast } from '../components/ui'

const DEFAULT = {
  post_type: 'LOOKING_ROOM',
  title: '',
  description: '',
  district: 'Cầu Giấy',
  budget_min: '',
  budget_max: '',
  gender_pref: 'ANY',
  num_people: 1,
  move_in_date: '',
  school: '',
  workplace: '',
  desired_amenities: [],
  room_price: '',
  current_people: 0,
  needed_people: 1,
  cost_per_person: '',
  room_area: '',
  room_address: '',
  images: [],
}

export default function RoommatePostCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [amenityText, setAmenityText] = useState('')
  const fileInputs = useRef({})

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setNum = (k) => (e) => setForm({ ...form, [k]: e.target.value === '' ? '' : Number(e.target.value) })

  const addAmenity = () => {
    const v = amenityText.trim()
    if (v && !form.desired_amenities.includes(v)) {
      setForm({ ...form, desired_amenities: [...form.desired_amenities, v] })
    }
    setAmenityText('')
  }

  // Upload file -> backend (Supabase Storage) -> URL
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
    } catch {
      toast('Không đọc được file ảnh', 'error')
      setUploading(null)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        budget_min: form.budget_min === '' ? null : Number(form.budget_min),
        budget_max: form.budget_max === '' ? null : Number(form.budget_max),
        room_price: form.room_price === '' ? null : Number(form.room_price),
        cost_per_person: form.cost_per_person === '' ? null : Number(form.cost_per_person),
        room_area: form.room_area === '' ? null : Number(form.room_area),
      }
      const res = await api.post('/roommates', payload)
      toast('Đăng bài thành công! 🎉')
      navigate(`/roommates/${res.data.id}`)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const isLookingRoom = form.post_type === 'LOOKING_ROOM'

  return (
    <div className="container-x max-w-3xl py-8">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-5 !px-2">
        <ArrowLeft size={17} /> Quay lại
      </button>
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Đăng bài ở ghép</h1>
      <p className="mt-1 text-sm text-ink-500">Chia sẻ nhu cầu của bạn để tìm phòng hoặc bạn ở ghép phù hợp</p>

      <form onSubmit={submit} className="card mt-6 space-y-6 p-6 sm:p-8">
        <div>
          <label className="label">Loại bài đăng</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, post_type: 'LOOKING_ROOM' })}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                isLookingRoom ? 'border-brand-600 bg-brand-50' : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <p className="font-display text-sm font-bold text-ink-900">🏠 Tôi đang tìm phòng</p>
              <p className="mt-1 text-xs text-ink-500">Tôi cần tìm một chỗ ở phù hợp</p>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, post_type: 'LOOKING_ROOMMATE' })}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                !isLookingRoom ? 'border-brand-600 bg-brand-50' : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <p className="font-display text-sm font-bold text-ink-900">🤝 Tôi có phòng, tìm người ở ghép</p>
              <p className="mt-1 text-xs text-ink-500">Tôi muốn tìm bạn ở ghép cùng phòng</p>
            </button>
          </div>
        </div>

        <div>
          <label className="label">Tiêu đề *</label>
          <input className="input" required value={form.title} onChange={set('title')} placeholder="VD: Nữ sinh viên tìm phòng ở Cầu Giấy" />
        </div>

        <div>
          <label className="label">Mô tả *</label>
          <textarea className="input min-h-32" required value={form.description} onChange={set('description')}
            placeholder="Giới thiệu về bản thân, nhu cầu, thói quen sinh hoạt, mong muốn của bạn..." />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Khu vực *</label>
            <select className="input" value={form.district} onChange={set('district')}>
              {['Cầu Giấy', 'Nam Từ Liêm', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông', 'Hoàng Mai'].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Giới tính mong muốn</label>
            <select className="input" value={form.gender_pref} onChange={set('gender_pref')}>
              <option value="ANY">Không yêu cầu</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
            </select>
          </div>
        </div>

        {isLookingRoom ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Ngân sách tối thiểu</label>
              <input className="input" type="number" value={form.budget_min} onChange={setNum('budget_min')} placeholder="2.000.000" />
            </div>
            <div>
              <label className="label">Ngân sách tối đa</label>
              <input className="input" type="number" value={form.budget_max} onChange={setNum('budget_max')} placeholder="3.000.000" />
            </div>
            <div>
              <label className="label">Thời gian chuyển vào</label>
              <input className="input" type="month" value={form.move_in_date} onChange={set('move_in_date')} />
            </div>
            <div>
              <label className="label">Số người ở</label>
              <input className="input" type="number" min={1} value={form.num_people} onChange={setNum('num_people')} />
            </div>
            <div>
              <label className="label">Trường học</label>
              <input className="input" value={form.school} onChange={set('school')} placeholder="Đại học ..." />
            </div>
            <div>
              <label className="label">Nơi làm việc</label>
              <input className="input" value={form.workplace} onChange={set('workplace')} placeholder="Công ty ..." />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Giá phòng</label>
              <input className="input" type="number" value={form.room_price} onChange={setNum('room_price')} />
            </div>
            <div>
              <label className="label">Số người hiện tại</label>
              <input className="input" type="number" min={0} value={form.current_people} onChange={setNum('current_people')} />
            </div>
            <div>
              <label className="label">Cần thêm người</label>
              <input className="input" type="number" min={1} value={form.needed_people} onChange={setNum('needed_people')} />
            </div>
            <div>
              <label className="label">Chi phí dự kiến/người</label>
              <input className="input" type="number" value={form.cost_per_person} onChange={setNum('cost_per_person')} />
            </div>
            <div>
              <label className="label">Diện tích (m²)</label>
              <input className="input" type="number" value={form.room_area} onChange={setNum('room_area')} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Tiện ích mong muốn</label>
          <div className="flex gap-2">
            <input className="input" value={amenityText} onChange={(e) => setAmenityText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity() } }}
              placeholder="VD: WiFi, Máy lạnh... rồi Enter" />
            <button type="button" onClick={addAmenity} className="btn-secondary"><Plus size={16} /></button>
          </div>
          {form.desired_amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.desired_amenities.map((a) => (
                <span key={a} className="badge bg-brand-50 text-brand-700">
                  {a}
                  <button type="button" onClick={() => setForm({ ...form, desired_amenities: form.desired_amenities.filter((x) => x !== a) })} className="ml-1">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hình ảnh */}
        <div>
          <h2 className="mb-3 font-display text-base font-bold text-ink-900">Hình ảnh (tuỳ chọn, tối đa 3)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-ink-200 p-3">
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
                {form.images[i] ? (
                  <div className="relative">
                    <img src={form.images[i]} alt="" className="h-20 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const images = [...form.images]
                        images.splice(i, 1)
                        setForm({ ...form, images })
                      }}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-lg bg-ink-50 text-xs text-ink-300">
                    <ImagePlus size={16} className="mr-1" /> Chưa có ảnh
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner size={17} className="text-white" /> : <Send size={17} />} Đăng bài
        </button>
      </form>
    </div>
  )
}
