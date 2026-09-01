import { useRef, useState } from 'react'
import { BadgeCheck, Camera, KeyRound, Save, Trash2, Upload, User } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, Spinner, toast } from '../components/ui'

export default function Profile() {
  const { user, refresh, logout } = useAuth()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    date_of_birth: user?.date_of_birth || '',
  })
  const [pw, setPw] = useState({ old_password: '', new_password: '' })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileRef = useRef(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put('/auth/me', form)
      await refresh()
      toast('Cập nhật hồ sơ thành công')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setSavingPw(true)
    try {
      await api.put('/auth/change-password', pw)
      toast('Đổi mật khẩu thành công')
      setPw({ old_password: '', new_password: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSavingPw(false)
    }
  }

  const uploadAvatar = async (file) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      toast('Chỉ hỗ trợ JPG, PNG, WEBP, GIF', 'error'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Ảnh quá lớn (tối đa 5MB)', 'error'); return
    }
    setAvatarUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const res = await api.put('/users/avatar', { data_url: reader.result })
          await refresh()
          setAvatarPreview(null)
          toast('Đã cập nhật ảnh đại diện')
        } catch (e) { toast(e.message, 'error') }
        finally { setAvatarUploading(false) }
      }
      reader.readAsDataURL(file)
    } catch { setAvatarUploading(false) }
  }

  const removeAvatar = async () => {
    try {
      await api.put('/users/avatar', { avatar_url: '' })
      await refresh()
      setAvatarPreview(null)
      toast('Đã xóa ảnh đại diện')
    } catch (e) { toast(e.message, 'error') }
  }

  if (!user) return null

  return (
    <div className="container-x max-w-3xl py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Hồ sơ của tôi</h1>

      <div className="card mt-6 p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar upload area */}
          <div className="group relative">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarPreview(URL.createObjectURL(f)); uploadAvatar(f); } e.target.value = '' }}
            />
            <button
              onClick={() => fileRef.current?.click()
              }
              disabled={avatarUploading}
              className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-brand-300 bg-brand-50 transition hover:border-brand-500"
              title="Thay đổi ảnh đại diện"
            >
              {(avatarPreview || user.avatar_url) ? (
                <img src={avatarPreview || user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brand-400">
                  <Camera size={28} />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-ink-900/40 opacity-0 transition group-hover:opacity-100">
                {avatarUploading ? <Spinner size={20} className="text-white" /> : <Camera size={22} className="text-white" />}
              </div>
            </button>
            {user.avatar_url && (
              <button
                onClick={removeAvatar}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
                title="Xóa ảnh đại diện"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-bold text-ink-900">{user.full_name}</p>
              {user.is_verified && <BadgeCheck size={18} className="text-brand-600" />}
            </div>
            <p className="text-sm text-ink-500">{user.email}</p>
            <div className="mt-1.5 flex justify-center gap-1.5 sm:justify-start">
              {(user.roles || []).map((r) => (
                <span key={r} className="badge bg-brand-50 text-brand-700">{r}</span>
              ))}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="btn-secondary mt-3 !py-1.5 !text-xs"
            >
              {avatarUploading ? <Spinner size={14} /> : <Upload size={14} />} Thay đổi ảnh đại diện
            </button>
          </div>
        </div>

        <form onSubmit={saveProfile} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Họ và tên</label>
            <input className="input" value={form.full_name} onChange={set('full_name')} />
          </div>
          <div>
            <label className="label">Số điện thoại</label>
            <input className="input" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label">Giới tính</label>
            <select className="input" value={form.gender || ''} onChange={set('gender')}>
              <option value="">Không chọn</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
            </select>
          </div>
          <div>
            <label className="label">Ngày sinh</label>
            <input type="date" className="input" value={form.date_of_birth || ''} onChange={set('date_of_birth')} />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={17} className="text-white" /> : <Save size={17} />} Lưu thay đổi
            </button>
          </div>
        </form>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
          <KeyRound size={17} className="text-brand-600" /> Đổi mật khẩu
        </h2>
        <form onSubmit={savePassword} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Mật khẩu cũ</label>
            <input type="password" className="input" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} required />
          </div>
          <div>
            <label className="label">Mật khẩu mới</label>
            <input type="password" className="input" minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-secondary" disabled={savingPw}>
              {savingPw ? <Spinner size={16} /> : <KeyRound size={16} />} Đổi mật khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
