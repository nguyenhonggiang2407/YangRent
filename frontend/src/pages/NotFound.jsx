import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass size={30} />
      </div>
      <h1 className="font-display text-5xl font-extrabold text-ink-900">404</h1>
      <p className="mt-3 text-ink-500">Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
      <Link to="/" className="btn-primary mt-6">Về trang chủ</Link>
    </div>
  )
}
