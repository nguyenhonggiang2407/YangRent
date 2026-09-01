import { Link } from 'react-router-dom'
import { Building2, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { BRAND } from '../../config/brand'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Building2 size={19} /></div>
            <span className="font-display text-xl font-extrabold text-ink-900">Yang<span className="text-brand-600">Rent</span></span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">{BRAND.description} {BRAND.slogan}</p>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-ink-900">Khám phá</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
            <li><Link to="/rooms?room_type=WHOLE_HOUSE" className="hover:text-brand-600">Thuê nhà</Link></li>
            <li><Link to="/rooms?room_type=RENTAL_ROOM" className="hover:text-brand-600">Thuê phòng</Link></li>
            <li><Link to="/rooms?room_type=APARTMENT" className="hover:text-brand-600">Căn hộ</Link></li>
            <li><Link to="/roommates" className="hover:text-brand-600">Tìm người ở ghép</Link></li>
            <li><Link to="/ai-recommend" className="hover:text-brand-600">YangMatch</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-ink-900">Dành cho chủ nhà</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
            <li><Link to="/post-room" className="hover:text-brand-600">Đăng tin</Link></li>
            <li><Link to="/dashboard/landlord" className="hover:text-brand-600">Quản lý bất động sản</Link></li>
            <li><Link to="/chat" className="hover:text-brand-600">Tin nhắn</Link></li>
            <li><Link to="/register" className="hover:text-brand-600">Tạo tài khoản</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-ink-900">Hỗ trợ</h4>
          <ul className="mt-4 space-y-3 text-sm text-ink-500">
            <li className="flex items-start gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" /> Hà Nội, Việt Nam</li>
            <li className="flex items-center gap-2.5"><Mail size={16} className="shrink-0 text-brand-600" /> support@yangrent.vn</li>
            <li className="flex items-center gap-2.5"><ShieldCheck size={16} className="shrink-0 text-brand-600" /> An toàn &amp; quyền riêng tư</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-5">
        <div className="container-x flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
          <p>© 2026 YangRent. Bảo lưu mọi quyền.</p>
          <p>Thông tin demo phục vụ học tập • Không đại diện tin cho thuê thực tế</p>
        </div>
      </div>
    </footer>
  )
}
