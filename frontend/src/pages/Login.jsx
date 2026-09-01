import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, LogIn, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner, toast } from '../components/ui'

const DEMO = [
  { label: 'Admin', email: 'admin@yangrent.vn', pass: 'admin123' },
  { label: 'Chủ nhà', email: 'hung.nguyen@yangrent.vn', pass: 'yangrent123' },
  { label: 'Người thuê', email: 'lan.vu@yangrent.vn', pass: 'yangrent123' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast(`Chào mừng trở lại, ${user.full_name}!`)
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
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Đăng nhập YangRent</h1>
            <p className="mt-1 text-sm text-ink-500">Chào mừng bạn quay trở lại!</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <input type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={17} className="text-white" /> : <LogIn size={17} />} Đăng nhập
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-500">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline">Đăng ký ngay</Link>
          </p>
        </div>


      </div>
    </div>
  )
}
