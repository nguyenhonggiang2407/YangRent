import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner, toast } from '../components/ui'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', roles: ['USER'] })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggleRole = (r) => {
    const roles = form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r]
    setForm({ ...form, roles: roles.length ? roles : ['USER'] })
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await register(form)
      toast('Đăng ký thành công! Chào mừng bạn đến với YangRent ')
      const roles = user.roles || []
      if (roles.includes('ADMIN')) navigate('/dashboard/admin')
      else if (roles.includes('LANDLORD')) navigate('/dashboard/landlord')
      else if (roles.includes('TENANT')) navigate('/dashboard/tenant')
      else navigate('/')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
              <Home size={26} />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Tạo tài khoản</h1>
            <p className="mt-1 text-sm text-ink-500">Bắt đầu hành trình tìm chỗ ở phù hợp với bạn</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Họ và tên</label>
              <input className="input" required value={form.full_name} onChange={set('full_name')} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={form.email} onChange={set('email')} placeholder="you@email.com" />
            </div>
            <div>
              <label className="label">Số điện thoại</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="0912 345 678" />
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <input type="password" className="input" required minLength={6} value={form.password} onChange={set('password')} placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div>
              <label className="label">Bạn là ai?</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'USER', label: 'Người tìm chỗ ở' },
                  { key: 'LANDLORD', label: 'Chủ nhà' },
                  { key: 'TENANT', label: 'Người thuê' },
                ].map((r) => (
                  <button
                    type="button"
                    key={r.key}
                    onClick={() => toggleRole(r.key)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                      form.roles.includes(r.key)
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-ink-200 text-ink-500 hover:border-ink-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-400">Có thể chọn nhiều vai trò, ví dụ vừa là chủ nhà vừa là người thuê.</p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={17} className="text-white" /> : <UserPlus size={17} />} Đăng ký
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
