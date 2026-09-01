import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronDown, Heart, LayoutDashboard, LogOut, Map as MapIcon, Menu, MessageSquare, Plus, User, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMap } from '../../context/MapContext'
import { Avatar } from '../ui'
import api from '../../api/client'
import { useNotificationStream } from '../../hooks/useNotificationStream'
import { BRAND } from '../../config/brand'

const navItems = [
  { to: '/rooms', label: 'Khám phá' },
  { to: '/rooms?room_type=RENTAL_ROOM', label: 'Thuê phòng' },
  { to: '/rooms?room_type=WHOLE_HOUSE', label: 'Thuê nhà' },
  { to: '/rooms?room_type=APARTMENT', label: 'Căn hộ' },
  { to: '/roommates', label: 'Ở ghép' },
]

export default function Header() {
  const { user, logout, hasRole } = useAuth()
  const { openMap } = useMap()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const menuRef = useRef(null)
  const { unreadCount } = useNotificationStream(user)

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (user) api.get('/notifications').then((res) => setNotifications(res.data?.items || [])).catch(() => {})
  }, [user])

  const dashboardPath = hasRole('ADMIN')
    ? '/dashboard/admin'
    : hasRole('LANDLORD') ? '/dashboard/landlord' : hasRole('TENANT') ? '/dashboard/tenant' : null

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
      <div className="container-x flex h-[68px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${BRAND.name} - Trang chủ`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            <Building2 size={19} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-ink-900">
            Yang<span className="text-brand-600">Rent</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={({ isActive }) => `rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive && !item.to.includes('?') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}
            >
              {item.label}
            </NavLink>
          ))}
          <button onClick={openMap} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
            <MapIcon size={16} className="text-brand-600" /> Bản đồ
          </button>
        </nav>

        <div className="relative flex items-center gap-1.5" ref={menuRef}>
          <Link to={user ? '/post-room' : '/login'} className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 md:flex">
            <Plus size={17} /> Đăng tin
          </Link>
          {user && (
            <Link to="/chat" aria-label="Tin nhắn" className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 hover:text-brand-600 sm:flex">
              <MessageSquare size={19} />
            </Link>
          )}
          <button onClick={() => navigate(user ? '/favorites' : '/login')} aria-label="Yêu thích" className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 hover:text-red-500 sm:flex">
            <Heart size={19} />
          </button>

          {user ? (
            <>
              <button
                className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 sm:flex"
                onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v); setMenuOpen(false) }}
                aria-label="Thông báo"
              >
                <Bell size={19} />
                {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="absolute right-12 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-white p-2 shadow-lift">
                  <p className="px-3 py-2 text-sm font-bold text-ink-900">Thông báo</p>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-400">Chưa có thông báo</p>}
                    {notifications.slice(0, 8).map((n) => (
                      <button key={n.id} onClick={() => { setNotifOpen(false); navigate(n.link || '/') }} className={`block w-full rounded-xl px-3 py-2.5 text-left hover:bg-ink-50 ${!n.is_read ? 'bg-brand-50/60' : ''}`}>
                        <p className="text-sm font-semibold text-ink-800">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.content}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); setNotifOpen(false) }} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-ink-50" aria-label="Mở menu tài khoản">
                <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                <ChevronDown size={15} className="hidden text-ink-400 sm:block" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-ink-100 bg-white p-2 shadow-lift">
                  <div className="border-b border-ink-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-ink-900">{user.full_name}</p>
                    <p className="truncate text-xs text-ink-400">{user.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"><User size={16} /> Hồ sơ</Link>
                  {dashboardPath && <Link to={dashboardPath} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"><LayoutDashboard size={16} /> Bảng điều khiển</Link>}
                  <Link to="/chat" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"><MessageSquare size={16} /> Tin nhắn</Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut size={16} /> Đăng xuất</button>
                </div>
              )}
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="btn-ghost">Đăng nhập</Link>
              <Link to="/register" className="btn-primary">Đăng ký</Link>
            </div>
          )}

          <button onClick={() => setMobileOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:bg-ink-50 xl:hidden" aria-label="Menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-100 bg-white px-4 py-4 xl:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => <Link key={`${item.to}-mobile`} to={item.to} onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">{item.label}</Link>)}
            <button onClick={() => { setMobileOpen(false); openMap() }} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-ink-700"><MapIcon size={17} className="text-brand-600" /> Bản đồ</button>
            <Link to={user ? '/favorites' : '/login'} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-ink-700"><Heart size={17} className="text-red-500" /> Yêu thích</Link>
            {user && <Link to="/chat" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-ink-700"><MessageSquare size={17} /> Tin nhắn</Link>}
            {!user && <><Link to="/login" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-ink-700">Đăng nhập</Link><Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary mt-1">Đăng ký</Link></>}
            <Link to={user ? '/post-room' : '/login'} onClick={() => setMobileOpen(false)} className="btn-primary mt-1"><Plus size={17} /> Đăng tin cho thuê</Link>
          </div>
        </div>
      )}
    </header>
  )
}
