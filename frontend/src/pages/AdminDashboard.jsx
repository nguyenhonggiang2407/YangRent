import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeCheck, BarChart3, Building2, ClipboardList, Home, LayoutDashboard, RefreshCw,
  ShieldAlert, TrendingUp, User, Users, Wallet,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import {
  Avatar, Badge, EmptyState, ErrorBanner, Modal, Pagination, Skeleton, Spinner, StatCard, toast,
} from '../components/ui'
import {
  CONTRACT_STATUS_LABEL, MODERATION_LABEL, REPORT_STATUS_LABEL, ROOM_STATUS_LABEL,
  fmtDate, timeAgo, vnd,
} from '../utils/format'
import SmartImage from '../components/SmartImage'
import RevenueDetailModal from '../components/RevenueDetailModal'

const MENU = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Người dùng', icon: Users },
  { key: 'rooms', label: 'Bất động sản', icon: Home },
  { key: 'roommates', label: 'Ở ghép', icon: Users },
  { key: 'reports', label: 'Báo cáo', icon: ShieldAlert },
]

function StatusPill({ label, tone = 'bg-ink-100 text-ink-600' }) {
  return <Badge className={tone}>{label}</Badge>
}

export default function AdminDashboard() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // Filter ban đầu cho từng tab (khi bấm vào thẻ thống kê)
  const [userRole, setUserRole] = useState('')
  const [roomStatus, setRoomStatus] = useState('')
  const [roomModeration, setRoomModeration] = useState('')
  const [reportStatus, setReportStatus] = useState('')

  // Bấm thẻ thống kê → chuyển tab + áp filter sẵn
  const goTo = (tab, opts = {}) => {
    setUserRole(opts.role || '')
    setRoomStatus(opts.status || '')
    // Khi bấm từ thẻ thống kê phòng: xem theo trạng thái thuê, hiện cả bài đã duyệt lẫn chờ duyệt
    setRoomModeration(opts.moderation ?? '')
    setReportStatus(opts.report || '')
    setActive(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (user && !hasRole('ADMIN')) {
      navigate('/')
      return
    }
    if (!user) return
    Promise.all([api.get('/admin/overview'), api.get('/admin/charts')])
      .then(([o, c]) => {
        setOverview(o.data)
        setCharts(c.data)
        setError('')
      })
      .catch((e) => setError(e.message || 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [user, hasRole, navigate, reloadKey])

  if (loading) {
    return (
      <div className="container-x py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="mt-6 h-64" />
      </div>
    )
  }

  if (error && !overview) {
    return (
      <div className="container-x py-10">
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    )
  }

  const o = overview || {}

  return (
    <div className="container-x flex flex-col gap-6 py-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-60">
        <div className="card p-3">
          <div className="mb-3 flex items-center gap-3 px-2 pt-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white">
              <ShieldAlert size={19} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">Admin</p>
              <p className="text-xs text-ink-400">Quản trị hệ thống</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {MENU.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => setActive(m.key)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active === m.key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <Icon size={17} />
                  {m.label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        {active === 'overview' && <Overview o={o} charts={charts} onRefresh={() => setReloadKey((k) => k + 1)} onNavigate={goTo} />}
        {active === 'users' && <UsersTab key={userRole} initialRole={userRole} />}
        {active === 'rooms' && <RoomsTab key={roomStatus + roomModeration} initialStatus={roomStatus} initialModeration={roomModeration} />}
        {active === 'roommates' && <RoommatesTab />}
        {active === 'reports' && <ReportsTab key={reportStatus} initialStatus={reportStatus} />}
      </div>
    </div>
  )
}

function MiniBarChart({ data, color = 'bg-brand-500' }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <div className={`w-full rounded-t-lg ${color} transition-all`} style={{ height: `${Math.max((d.value / max) * 100, 3)}%` }} title={`${d.label}: ${d.value}`} />
          </div>
          <span className="text-[10px] font-medium text-ink-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Overview({ o, charts, onRefresh, onNavigate }) {
  const c = charts || {}
  const [revenueOpen, setRevenueOpen] = useState(false)
  const revenueData = (c.revenue_by_month || []).map((m) => ({ label: m.month.slice(5), value: m.revenue }))
  const userData = (c.user_growth || []).map((m) => ({ label: m.month.slice(5), value: m.users }))
  const occupancy = c.room_occupancy || []

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Dashboard quản trị</h1>
          <p className="text-sm text-ink-500">Tổng quan toàn bộ hệ thống YangRent</p>
        </div>
        <button onClick={onRefresh} className="btn-secondary"><RefreshCw size={15} /> Làm mới</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Tổng người dùng" value={o.total_users ?? 0} color="bg-brand-50 text-brand-600" onClick={() => onNavigate('users')} />
        <StatCard icon={Building2} label="Chủ nhà" value={o.total_landlords ?? 0} color="bg-indigo-50 text-indigo-600" onClick={() => onNavigate('users', { role: 'LANDLORD' })} />
        <StatCard icon={User} label="Người thuê" value={o.total_tenants ?? 0} color="bg-cyan-50 text-cyan-600" onClick={() => onNavigate('users', { role: 'TENANT' })} />
        <StatCard icon={Home} label="Tổng phòng" value={o.total_rooms ?? 0} color="bg-emerald-50 text-emerald-600" onClick={() => onNavigate('rooms')} />
        <StatCard icon={CheckIcon} label="Phòng trống" value={o.rooms_available ?? 0} color="bg-lime-50 text-lime-600" onClick={() => onNavigate('rooms', { status: 'AVAILABLE' })} />
        <StatCard icon={ClipboardList} label="Phòng đang thuê" value={o.rooms_rented ?? 0} color="bg-amber-50 text-amber-600" onClick={() => onNavigate('rooms', { status: 'RENTED' })} />
        <StatCard
          icon={Wallet}
          label="Doanh thu"
          value={vnd(o.revenue ?? 0)}
          sub="Bấm để xem chi tiết"
          color="bg-rose-50 text-rose-600"
          onClick={() => setRevenueOpen(true)}
        />
        <StatCard icon={ShieldAlert} label="Báo cáo chờ xử lý" value={o.pending_reports ?? 0} color="bg-orange-50 text-orange-600" onClick={() => onNavigate('reports', { report: 'PENDING' })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <button
          onClick={() => setRevenueOpen(true)}
          className="card group p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <h3 className="mb-1 flex items-center justify-between font-display text-base font-bold text-ink-900">
            <span className="flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-600" /> Doanh thu 6 tháng
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
              Xem chi tiết →
            </span>
          </h3>
          <p className="mb-4 text-xs text-ink-400">Bấm để xem bảng dữ liệu chi tiết</p>
          {revenueData.length ? <MiniBarChart data={revenueData} /> : <EmptyState icon={BarChart3} title="Chưa có dữ liệu" />}
        </button>
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <TrendingUp size={18} className="text-brand-600" /> Người dùng mới 6 tháng
          </h3>
          {userData.length ? <MiniBarChart data={userData} color="bg-indigo-500" /> : <EmptyState icon={TrendingUp} title="Chưa có dữ liệu" />}
        </div>
      </div>

      <RevenueDetailModal open={revenueOpen} onClose={() => setRevenueOpen(false)} scope="admin" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900">Phân bổ phòng</h3>
          <div className="space-y-3">
            {occupancy.map((x) => (
              <div key={x.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{x.name}</span>
                  <span className="text-ink-500">{x.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${o.total_rooms ? (x.value / o.total_rooms) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900">Hệ thống</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Hợp đồng đang hiệu lực</dt><dd className="font-semibold text-ink-900">{o.active_contracts ?? 0} / {o.total_contracts ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Phòng chờ duyệt</dt><dd className="font-semibold text-ink-900">{o.rooms_pending ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Hóa đơn chưa thanh toán</dt><dd className="font-semibold text-ink-900">{o.pending_invoices ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Bài đăng ở ghép</dt><dd className="font-semibold text-ink-900">{o.roommate_posts ?? 0}</dd></div>
          </dl>
        </div>
      </div>
    </>
  )
}

function CheckIcon({ size = 20, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5" /></svg>
}

function UsersTab({ initialRole = '' }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState(initialRole)
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.role = filter
      if (keyword) params.keyword = keyword
      const res = await api.get('/admin/users', { params })
      setUsers(res.data.items || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filter, keyword])

  useEffect(() => { load() }, [load])

  const toggleBan = async (u) => {
    setBusyId(u.id)
    try {
      await api.put(`/admin/users/${u.id}/status`, { status: u.status === 'BANNED' ? 'ACTIVE' : 'BANNED' })
      toast(u.status === 'BANNED' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Người dùng</h1>
          <p className="text-sm text-ink-500">Quản lý tài khoản, khóa/mở khóa người dùng</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {['', 'ADMIN', 'LANDLORD', 'TENANT', 'USER'].map((r) => (
          <button key={r} onClick={() => setFilter(r)} className={`badge cursor-pointer transition ${filter === r ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
            {r || 'Tất cả'}
          </button>
        ))}
        <input
          className="input ml-auto max-w-56"
          placeholder="Tìm theo tên / email..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading && <Skeleton className="h-64" />}
        {!loading && users.length === 0 && <EmptyState icon={Users} title="Không tìm thấy người dùng" />}
        {users.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center gap-3 p-4">
            <Avatar src={u.avatar_url} name={u.full_name} size={42} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-ink-900">
                {u.full_name}
                {u.is_verified && <BadgeCheck size={15} className="text-brand-600" />}
              </p>
              <p className="truncate text-sm text-ink-500">{u.email}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(u.roles || []).map((r) => <Badge key={r} className={r === 'ADMIN' ? 'bg-ink-900 text-white' : 'bg-brand-50 text-brand-700'}>{r}</Badge>)}
            </div>
            <StatusPill label={u.status === 'BANNED' ? 'Đã khóa' : 'Hoạt động'} tone={u.status === 'BANNED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} />
            <button disabled={busyId === u.id} onClick={() => toggleBan(u)} className={u.status === 'BANNED' ? 'btn-secondary !py-2 text-sm' : 'btn-ghost !py-2 !text-red-600'}>
              {busyId === u.id ? <Spinner size={14} /> : u.status === 'BANNED' ? 'Mở khóa' : 'Khóa'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoomsTab({ initialStatus = '', initialModeration = 'PENDING' }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [modFilter, setModFilter] = useState(initialModeration)
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (modFilter) params.moderation_status = modFilter
      const res = await api.get('/admin/rooms', { params })
      setRooms(res.data.items || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, modFilter])

  useEffect(() => { load() }, [load])

  const moderate = async (room, status) => {
    setBusyId(room.id)
    try {
      await api.put(`/admin/rooms/${room.id}/moderation`, { moderation_status: status })
      toast(status === 'APPROVED' ? 'Đã duyệt phòng' : status === 'REJECTED' ? 'Đã từ chối phòng' : 'Đã chuyển về chờ duyệt')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (room) => {
    if (!window.confirm(`Xóa phòng "${room.title}"? Hành động này không thể hoàn tác.`)) return
    setBusyId(room.id)
    try {
      await api.delete(`/admin/rooms/${room.id}`)
      toast('Đã xóa bài đăng vi phạm')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Bất động sản</h1>
          <p className="text-sm text-ink-500">Duyệt bài đăng và quản lý bất động sản</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Trạng thái:</span>
          {[{ v: '', l: 'Tất cả' }, { v: 'AVAILABLE', l: 'Còn trống' }, { v: 'RENTED', l: 'Đang thuê' }, { v: 'RESERVED', l: 'Đã giữ chỗ' }, { v: 'HIDDEN', l: 'Đã ẩn' }].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={`badge cursor-pointer transition ${statusFilter === s.v ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
              {s.l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Duyệt bài:</span>
          {[{ v: '', l: 'Tất cả' }, { v: 'PENDING', l: 'Chờ duyệt' }, { v: 'APPROVED', l: 'Đã duyệt' }, { v: 'REJECTED', l: 'Từ chối' }].map((s) => (
            <button key={s.v} onClick={() => setModFilter(s.v)} className={`badge cursor-pointer transition ${modFilter === s.v ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading && <Skeleton className="h-64" />}
        {!loading && rooms.length === 0 && <EmptyState icon={Home} title="Không có phòng nào" description="Không có phòng ở trạng thái này" />}
        {rooms.map((room) => (
          <div key={room.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
            <button onClick={() => setDetail(room)} className="block h-32 w-full shrink-0 overflow-hidden rounded-xl sm:w-44">
              <SmartImage src={room.images?.[0]?.image_url} alt={room.title} className="h-full w-full object-cover" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label={ROOM_STATUS_LABEL[room.status] || room.status} tone={room.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'} />
                <StatusPill label={MODERATION_LABEL[room.moderation_status] || room.moderation_status} tone={room.moderation_status === 'APPROVED' ? 'bg-brand-50 text-brand-700' : room.moderation_status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'} />
              </div>
              <button onClick={() => setDetail(room)} className="mt-1.5 block text-left font-display text-base font-bold text-ink-900 hover:text-brand-600">
                {room.title}
              </button>
              <p className="mt-0.5 text-sm text-ink-500">📍 {room.district}, {room.city} · {vnd(room.price)}/tháng</p>
              <p className="mt-1 text-xs text-ink-400">
                {room.landlord?.full_name || `Chủ nhà #${room.landlord_id}`} · Đăng {timeAgo(room.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
              {room.moderation_status !== 'APPROVED' && (
                <button disabled={busyId === room.id} onClick={() => moderate(room, 'APPROVED')} className="btn-primary !py-2 text-sm">
                  {busyId === room.id ? <Spinner size={14} /> : <BadgeCheck size={14} />} Duyệt
                </button>
              )}
              {room.moderation_status !== 'REJECTED' && (
                <button disabled={busyId === room.id} onClick={() => moderate(room, 'REJECTED')} className="btn-ghost !py-2 text-sm">
                  Từ chối
                </button>
              )}
              <button disabled={busyId === room.id} onClick={() => remove(room)} className="btn-ghost !py-2 !text-red-600 text-sm">
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết phòng" width="max-w-2xl">
        {detail && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {(detail.images || []).slice(0, 3).map((img, i) => (
                <SmartImage key={img.id} src={img.image_url} alt={`${detail.title} ${i + 1}`} className="h-28 w-full rounded-xl object-cover" />
              ))}
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-ink-900">{detail.title}</h3>
            <p className="text-sm text-ink-500">{detail.address}, {detail.district}, {detail.city}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge bg-brand-50 text-brand-700">{vnd(detail.price)}/tháng</span>
              <span className="badge bg-ink-100 text-ink-600">{detail.area}m²</span>
              <span className="badge bg-ink-100 text-ink-600">{detail.max_occupants} người</span>
            </div>
            <p className="mt-3 line-clamp-4 text-sm text-ink-600">{detail.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => { navigate(`/rooms/${detail.id}`); setDetail(null) }} className="btn-secondary">Xem trên website</button>
              <button onClick={() => { moderate(detail, 'APPROVED'); setDetail(null) }} className="btn-primary"><BadgeCheck size={15} /> Duyệt phòng</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function RoommatesTab() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/roommate-posts')
      setPosts(res.data || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Bài đăng ở ghép</h1>
      <p className="text-sm text-ink-500">Tất cả bài đăng tìm phòng / tìm người ở ghép</p>
      <div className="mt-5 space-y-3">
        {loading && <Skeleton className="h-64" />}
        {!loading && posts.length === 0 && <EmptyState icon={Users} title="Chưa có bài đăng" />}
        {posts.map((p) => (
          <div key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Avatar src={p.user?.avatar_url} name={p.user?.full_name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">{p.title}</p>
              <p className="truncate text-sm text-ink-500">
                {p.user?.full_name} · {p.district}, {p.city} · {p.budget_min ? `${vnd(p.budget_min)} – ${vnd(p.budget_max || p.budget_min)}` : p.room_price ? vnd(p.room_price) : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill label={p.post_type === 'LOOKING_ROOM' ? 'Tìm phòng' : 'Tìm người ở ghép'} tone="bg-brand-50 text-brand-700" />
              <span className="text-xs text-ink-400">{timeAgo(p.created_at)}</span>
              <button onClick={() => navigate(`/roommates/${p.id}`)} className="btn-secondary !py-2 text-sm">Xem</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportsTab({ initialStatus = 'PENDING' }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(initialStatus)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/reports', { params: filter ? { status: filter } : {} })
      setReports(res.data || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const update = async (r, status) => {
    setBusyId(r.id)
    try {
      await api.put(`/admin/reports/${r.id}/status`, { status })
      toast('Đã cập nhật báo cáo')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const targetLabel = (t) => ({
    ROOM: 'Bất động sản',
    USER: 'Người dùng',
    ROOMMATE_POST: 'Bài đăng ở ghép',
  })[t] || t

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Báo cáo vi phạm</h1>
          <p className="text-sm text-ink-500">Xử lý các báo cáo từ người dùng</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {['', 'PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`badge cursor-pointer transition ${filter === s ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
            {s ? (REPORT_STATUS_LABEL[s] || s) : 'Tất cả'}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading && <Skeleton className="h-64" />}
        {!loading && reports.length === 0 && <EmptyState icon={ShieldAlert} title="Không có báo cáo" />}
        {reports.map((r) => (
          <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-900">{targetLabel(r.target_type)} #{r.target_id}</span>
                <StatusPill label={REPORT_STATUS_LABEL[r.status] || r.status}
                  tone={r.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : r.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : r.status === 'REJECTED' ? 'bg-ink-100 text-ink-600' : 'bg-brand-50 text-brand-700'} />
              </div>
              <p className="mt-1 text-sm font-medium text-ink-800">{r.reason}</p>
              {r.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{r.description}</p>}
              <p className="mt-1 text-xs text-ink-400">Bởi {r.reporter?.full_name || `#${r.reporter_id}`} · {timeAgo(r.created_at)}</p>
            </div>
            <div className="flex shrink-0 flex-row gap-2">
              {r.status !== 'RESOLVED' && (
                <button disabled={busyId === r.id} onClick={() => update(r, 'RESOLVED')} className="btn-primary !py-2 text-sm">
                  {busyId === r.id ? <Spinner size={14} /> : 'Xử lý xong'}
                </button>
              )}
              {r.status !== 'REJECTED' && (
                <button disabled={busyId === r.id} onClick={() => update(r, 'REJECTED')} className="btn-ghost !py-2 text-sm">
                  Bỏ qua
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
