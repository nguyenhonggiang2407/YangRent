import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BarChart3, Building2, Calendar, CheckCircle2, FileText, Gauge, Hammer, Home,
  LayoutDashboard, Plus, QrCode, Receipt, RefreshCw, ShieldCheck, Sparkles, TrendingUp,
  User, Users, Wallet, Wrench,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import {
  Avatar, Badge, EmptyState, ErrorBanner, Modal, Skeleton, Spinner, StatCard, toast,
} from '../components/ui'
import {
  CONTRACT_STATUS_LABEL, INVOICE_STATUS_LABEL, MAINTENANCE_STATUS_LABEL,
  METER_TYPE_LABEL, PRIORITY_LABEL, ROOM_STATUS_LABEL, ROOM_TYPE_LABEL, fmtDate, timeAgo, vnd,
} from '../utils/format'
import SmartImage from '../components/SmartImage'
import RevenueDetailModal from '../components/RevenueDetailModal'

const LANDLORD_MENU = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'rooms', label: 'Phòng của tôi', icon: Home },
  { key: 'bookings', label: 'Yêu cầu chốt phòng', icon: Calendar },
  { key: 'contracts', label: 'Hợp đồng', icon: FileText },
  { key: 'invoices', label: 'Hóa đơn', icon: Receipt },
  { key: 'meters', label: 'Điện nước', icon: Gauge },
  { key: 'maintenance', label: 'Sửa chữa', icon: Wrench },
  { key: 'roommates', label: 'Ở ghép', icon: Users },
  { key: 'profile', label: 'Hồ sơ', icon: User },
]

const TENANT_MENU = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'room', label: 'Phòng của tôi', icon: Home },
  { key: 'bookings', label: 'Yêu cầu chốt phòng', icon: Calendar },
  { key: 'contracts', label: 'Hợp đồng', icon: FileText },
  { key: 'invoices', label: 'Hóa đơn', icon: Receipt },
  { key: 'meters', label: 'Điện nước', icon: Gauge },
  { key: 'maintenance', label: 'Sửa chữa', icon: Wrench },
  { key: 'profile', label: 'Hồ sơ', icon: User },
]

function MiniBarChart({ data, color = 'bg-brand-500' }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-lg ${color} transition-all`}
              style={{ height: `${Math.max((d.value / max) * 100, 3)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[10px] font-medium text-ink-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ label, tone = 'bg-ink-100 text-ink-600' }) {
  return <Badge className={tone}>{label}</Badge>
}

export default function Dashboard() {
  const { role } = useParams()
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Ưu tiên role từ URL; nếu không chỉ định rõ thì dựa vào role của user
  const isLandlord = role === 'landlord' ? true : role === 'tenant' ? false : hasRole('LANDLORD')
  const menu = isLandlord ? LANDLORD_MENU : TENANT_MENU

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/dashboard/${isLandlord ? 'landlord' : 'tenant'}`)
      setData(res.data)
    } catch (e) {
      setError(e.message || 'Không tải được dữ liệu dashboard')
    } finally {
      setLoading(false)
    }
  }, [isLandlord])

  useEffect(() => {
    if (user && !hasRole('LANDLORD') && !hasRole('TENANT') && !hasRole('ADMIN')) {
      navigate('/')
      return
    }
    if (role === 'admin') {
      navigate('/dashboard/admin')
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user])

  if (loading && !data) {
    return (
      <div className="container-x py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="mt-6 h-64" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="container-x py-10">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="container-x flex flex-col gap-6 py-8 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 lg:w-60">
        <div className="card p-3">
          <div className="mb-3 flex items-center gap-3 px-2 pt-1">
            <Avatar src={user?.avatar_url} name={user?.full_name} size={42} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{user?.full_name}</p>
              <p className="truncate text-xs text-ink-400">{isLandlord ? 'Chủ nhà' : 'Người thuê'}</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {menu.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => setActive(m.key)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active === m.key ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
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

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-6">
        {isLandlord ? (
          <LandlordView data={data} active={active} load={load} />
        ) : (
          <TenantView data={data} active={active} load={load} onNavigate={setActive} />
        )}
      </div>
    </div>
  )
}

// ================= LANDLORD =================
function LandlordView({ data, active, load }) {
  const navigate = useNavigate()
  const o = data.overview || {}
  const charts = data.charts || {}
  const [revenueOpen, setRevenueOpen] = useState(false)

  if (active === 'overview') {
    const revenueData = (charts.revenue_by_month || []).map((m) => ({
      label: m.month.slice(5),
      value: m.revenue,
    }))
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Tổng quan chủ nhà</h1>
            <p className="text-sm text-ink-500">Quản lý bất động sản và doanh thu của bạn</p>
          </div>
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Home} label="Tổng phòng" value={o.total_rooms ?? 0} color="bg-brand-50 text-brand-600" />
          <StatCard icon={CheckCircle2} label="Phòng trống" value={o.rooms_available ?? 0} color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users} label="Đang cho thuê" value={o.rooms_rented ?? 0} color="bg-indigo-50 text-indigo-600" />
          <StatCard
            icon={Wallet}
            label="Doanh thu"
            value={vnd(o.revenue ?? 0)}
            sub="Bấm để xem chi tiết"
            color="bg-amber-50 text-amber-600"
            onClick={() => setRevenueOpen(true)}
          />
          <StatCard icon={Receipt} label="Hóa đơn chưa thu" value={o.unpaid_invoices ?? 0} color="bg-rose-50 text-rose-600" />
          <StatCard icon={Wrench} label="Sửa chữa chờ xử lý" value={o.maintenance_pending ?? 0} color="bg-orange-50 text-orange-600" />
          <StatCard icon={Users} label="Người thuê đang ở" value={o.active_tenants ?? 0} color="bg-cyan-50 text-cyan-600" />
          <StatCard icon={TrendingUp} label="Tỷ lệ lấp đầy" value={`${charts.fill_rate ?? 0}%`} color="bg-violet-50 text-violet-600" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <button
            onClick={() => setRevenueOpen(true)}
            className="card group p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <h3 className="mb-1 flex items-center justify-between font-display text-base font-bold text-ink-900">
              <span className="flex items-center gap-2">
                <BarChart3 size={18} className="text-brand-600" /> Doanh thu 6 tháng gần nhất
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
                Xem chi tiết →
              </span>
            </h3>
            <p className="mb-4 text-xs text-ink-400">Bấm để xem bảng dữ liệu chi tiết</p>
            {revenueData.length ? (
              <MiniBarChart data={revenueData} />
            ) : (
              <EmptyState icon={BarChart3} title="Chưa có dữ liệu doanh thu" />
            )}
          </button>
          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <Home size={18} className="text-brand-600" /> Hoạt động gần đây
            </h3>
            <RecentActivity data={data} />
          </div>
        </div>

        <RevenueDetailModal open={revenueOpen} onClose={() => setRevenueOpen(false)} scope="landlord" />
      </>
    )
  }

  if (active === 'rooms') return <LandlordRooms rooms={data.rooms || []} onChanged={load} />
  if (active === 'bookings') return <BookingsTab role="landlord" bookings={data.bookings || []} onChanged={load} />
  if (active === 'contracts') return <ContractsTab role="landlord" contracts={data.contracts || []} onChanged={load} />
  if (active === 'invoices') return <InvoicesTab role="landlord" invoices={data.invoices || []} onChanged={load} />
  if (active === 'meters') return <MetersTab rooms={data.rooms || []} />
  if (active === 'maintenance') return <MaintenanceTab role="landlord" items={data.maintenance || []} onChanged={load} />
  if (active === 'roommates') return <RoommateShortcut />
  if (active === 'profile') return <ProfileShortcut />

  return null
}

function RecentActivity({ data }) {
  const items = [
    ...(data.maintenance || []).slice(0, 3).map((m) => ({
      icon: <Wrench size={15} className="text-orange-500" />,
      text: `Yêu cầu sửa chữa: ${m.title}`,
      time: timeAgo(m.created_at),
    })),
    ...(data.invoices || []).slice(0, 3).map((i) => ({
      icon: <Receipt size={15} className="text-brand-500" />,
      text: `Hóa đơn ${i.period} — ${vnd(i.total_amount)}`,
      time: timeAgo(i.created_at),
    })),
  ]
  if (!items.length) return <p className="text-sm text-ink-400">Chưa có hoạt động nào.</p>
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50">{it.icon}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-800">{it.text}</p>
            <p className="text-xs text-ink-400">{it.time}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function LandlordRooms({ rooms, onChanged }) {
  const navigate = useNavigate()
  const [updating, setUpdating] = useState(null)
  const updateStatus = async (room, status) => {
    setUpdating(room.id)
    try {
      await api.put(`/rooms/${room.id}`, { ...room, status })
      toast(`Đã chuyển phòng sang "${ROOM_STATUS_LABEL[status]}"`)
      onChanged()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setUpdating(null)
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Phòng của tôi</h1>
          <p className="text-sm text-ink-500">{rooms.length} phòng đang được quản lý</p>
        </div>
        <Link to="/post-room" className="btn-primary"><Plus size={16} /> Đăng phòng mới</Link>
      </div>
      <div className="mt-5 space-y-4">
        {rooms.length === 0 && <EmptyState icon={Home} title="Bạn chưa có phòng nào" description="Đăng phòng đầu tiên để bắt đầu cho thuê" action={<Link to="/post-room" className="btn-primary">Đăng phòng</Link>} />}
        {rooms.map((room) => (
          <div key={room.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
            <button onClick={() => navigate(`/rooms/${room.id}`)} className="block h-36 w-full shrink-0 overflow-hidden rounded-xl sm:w-48">
              <SmartImage src={room.images?.[0]?.image_url} alt={room.title} className="h-full w-full object-cover transition hover:scale-105" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={ROOM_STATUS_LABEL[room.status] || room.status}
                  tone={room.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'} />
                {room.is_verified && <StatusBadge label="✓ Đã xác minh" tone="bg-brand-50 text-brand-700" />}
              </div>
              <button onClick={() => navigate(`/rooms/${room.id}`)} className="mt-1.5 block text-left font-display text-base font-bold text-ink-900 hover:text-brand-600">
                {room.title}
              </button>
              <p className="mt-0.5 text-sm text-ink-500">📍 {room.district}, {room.city}</p>
              <p className="mt-1 text-sm text-ink-500">
                {room.area}m² · {ROOM_TYPE_LABEL[room.room_type] || room.room_type}
              </p>
              <p className="mt-1 font-display text-lg font-extrabold text-brand-600">{vnd(room.price)}<span className="text-xs font-medium text-ink-400">/tháng</span></p>
            </div>
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
              <button onClick={() => navigate(`/rooms/${room.id}`)} className="btn-secondary !py-2 text-sm">Chi tiết</button>
              <button
                disabled={updating === room.id}
                onClick={() => updateStatus(room, room.status === 'AVAILABLE' ? 'RENTED' : 'AVAILABLE')}
                className="btn-ghost !py-2 text-sm"
              >
                {updating === room.id ? <Spinner size={14} /> : room.status === 'AVAILABLE' ? 'Đánh dấu đã thuê' : 'Mở lại phòng'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookingsTab({ role, bookings, onChanged }) {
  const [updating, setUpdating] = useState(null)
  const [detail, setDetail] = useState(null)

  const BOOKING_STATUS_LABEL = { PENDING: 'Chờ xử lý', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' }
  const BOOKING_STATUS_TONE = {
    PENDING: 'bg-amber-50 text-amber-700',
    ACCEPTED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-ink-100 text-ink-500',
  }

  const handleAction = async (bookingId, action) => {
    setUpdating(bookingId)
    try {
      await api.put(`/bookings/${bookingId}/${action}`)
      toast(action === 'accept' ? 'Đã chấp nhận yêu cầu chốt phòng' : 'Đã từ chối yêu cầu')
      onChanged()
    } catch (e) { toast(e.message, 'error') }
    finally { setUpdating(null) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Yêu cầu chốt phòng</h1>
          <p className="text-sm text-ink-500">
            {role === 'landlord' ? 'Xem và xử lý yêu cầu từ người thuê' : 'Theo dõi trạng thái yêu cầu chốt phòng của bạn'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {bookings.length === 0 && <EmptyState icon={Calendar} title="Chưa có yêu cầu chốt phòng" description="Yêu cầu sẽ hiển thị ở đây khi có người muốn thuê phòng của bạn" />}
        {bookings.map((b) => (
          <div key={b.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {/* Room info */}
            {b.room && (
              <button onClick={() => setDetail(b)} className="flex h-20 w-28 shrink-0 items-center overflow-hidden rounded-xl bg-ink-100">
                {b.room.images?.[0]?.image_url ? (
                  <img src={b.room.images[0].image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-ink-400"><Home size={18} /></div>
                )}
              </button>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-bold text-ink-900">{b.room?.title || `Phòng #${b.room_id}`}</p>
                <StatusBadge label={BOOKING_STATUS_LABEL[b.status] || b.status} tone={BOOKING_STATUS_TONE[b.status] || ''} />
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {role === 'landlord' ? `Từ: ${b.seeker?.full_name || 'Người dùng'}` : `Chủ nhà: ${b.landlord?.full_name || ''}`}{' '}
                · {vnd(b.room?.price || 0)}/tháng
              </p>
              {b.move_in_date && <p className="text-xs text-ink-400">Chuyển vào: {fmtDate(b.move_in_date)} {b.lease_duration ? `· Thuê ${b.lease_duration} tháng` : ''}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setDetail(b)} className="btn-secondary !py-2 !text-xs">Chi tiết</button>
              {role === 'landlord' && b.status === 'PENDING' && (
                <>
                  <button
                    disabled={updating === b.id}
                    onClick={() => handleAction(b.id, 'accept')}
                    className="btn-primary !py-2 !text-xs"
                  >
                    {updating === b.id ? <Spinner size={13} /> : <CheckCircle2 size={13} />} Chấp nhận
                  </button>
                  <button
                    disabled={updating === b.id}
                    onClick={() => handleAction(b.id, 'reject')}
                    className="btn-ghost !py-2 !text-xs text-red-500 hover:bg-red-50"
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết yêu cầu chốt phòng" width="max-w-lg">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {detail.room?.images?.[0]?.image_url && <img src={detail.room.images[0].image_url} alt="" className="h-16 w-20 rounded-lg object-cover" />}
              <div>
                <p className="font-display text-sm font-bold text-ink-900">{detail.room?.title}</p>
                <p className="text-lg font-extrabold text-brand-700">{vnd(detail.room?.price || 0)}/tháng</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-ink-50 p-4 text-sm">
              <div><span className="text-ink-400">Người thuê:</span> <b>{detail.seeker?.full_name}</b></div>
              <div><span className="text-ink-400">SĐT:</span> <b>{detail.seeker?.phone || 'Chưa có'}</b></div>
              <div><span className="text-ink-400">Ngày chuyển vào:</span> <b>{detail.move_in_date ? fmtDate(detail.move_in_date) : 'Chưa rõ'}</b></div>
              <div><span className="text-ink-400">Thời hạn:</span> <b>{detail.lease_duration ? `${detail.lease_duration} tháng` : 'Chưa rõ'}</b></div>
              <div><span className="text-ink-400">Tiền cọc:</span> <b>{detail.deposit_amount ? vnd(detail.deposit_amount) : 'Chưa rõ'}</b></div>
              <div><span className="text-ink-400">Trạng thái:</span> <b>{BOOKING_STATUS_LABEL[detail.status]}</b></div>
            </div>
            {detail.message && (
              <div className="rounded-xl border border-ink-100 bg-white p-4">
                <p className="text-xs font-semibold text-ink-400">Tin nhắn:</p>
                <p className="mt-1 text-sm text-ink-700">{detail.message}</p>
              </div>
            )}
            {role === 'landlord' && detail.status === 'PENDING' && (
              <div className="flex justify-end gap-2">
                <button onClick={() => { handleAction(detail.id, 'reject'); setDetail(null) }} className="btn-ghost text-red-500">Từ chối</button>
                <button onClick={() => { handleAction(detail.id, 'accept'); setDetail(null) }} className="btn-primary"><CheckCircle2 size={16} /> Chấp nhận</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ContractsTab({ role, contracts, onChanged }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState(null)
  const [signing, setSigning] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [form, setForm] = useState({ room_id: '', tenant_id: '', monthly_rent: '', deposit_amount: '', start_date: '', end_date: '', terms: '' })

  const create = async () => {
    setBusy(true)
    try {
      await api.post('/contracts', {
        room_id: Number(form.room_id),
        tenant_id: Number(form.tenant_id),
        monthly_rent: Number(form.monthly_rent),
        deposit_amount: Number(form.deposit_amount) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
        terms: form.terms || 'Hợp đồng thuê chỗ ở theo thỏa thuận giữa hai bên.',
      })
      toast('Tạo hợp đồng thành công')
      setOpen(false)
      setForm({ room_id: '', tenant_id: '', monthly_rent: '', deposit_amount: '', start_date: '', end_date: '', terms: '' })
      onChanged()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Hợp đồng</h1>
          <p className="text-sm text-ink-500">{role === 'landlord' ? 'Tạo và theo dõi hợp đồng cho thuê' : 'Hợp đồng thuê của bạn'}</p>
        </div>
        {role === 'landlord' && (
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Tạo hợp đồng</button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {contracts.length === 0 && <EmptyState icon={FileText} title="Chưa có hợp đồng" description="Hợp đồng sẽ hiển thị ở đây sau khi được tạo" />}
        {contracts.map((c) => (
          <div key={c.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">{c.code}</p>
                <p className="truncate text-sm text-ink-500">
                  {c.room?.title || `Phòng #${c.room_id}`} · {c.tenant?.full_name || `Người thuê #${c.tenant_id}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="whitespace-nowrap text-ink-600 font-medium">{vnd(c.monthly_rent)}/tháng</span>
              <StatusBadge label={CONTRACT_STATUS_LABEL[c.status] || c.status}
                tone={c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setDetail(c); setSignatureName(user?.full_name || '') }} className="btn-secondary !py-2 !text-xs">Xem chi tiết</button>
              <div className="text-right text-xs text-ink-400">
                {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contract Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết hợp đồng" width="max-w-2xl">
        {detail && (
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            {/* Header contract */}
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-center text-white">
              <p className="text-xs font-semibold text-brand-100">HỢP ĐỒNG THUÊ PHÒNG</p>
              <p className="mt-1 font-display text-lg font-extrabold">Mã: {detail.code}</p>
              <p className="mt-1 text-xs text-brand-200">Ngày tạo: {fmtDate(detail.created_at)}</p>
            </div>

            {/* Parties */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-100 p-4">
                <p className="text-xs font-bold text-brand-600">BÊN A — CHỦ NHÀ</p>
                <p className="mt-2 font-semibold text-ink-900">{detail.landlord?.full_name}</p>
                <p className="text-sm text-ink-500">{detail.landlord?.email}</p>
                <p className="text-sm text-ink-500">SĐT: {detail.landlord?.phone || 'Chưa có'}</p>
                {detail.landlord_signed_at && (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    ✓ Đã ký: {detail.landlord_signature_name} ({fmtDate(detail.landlord_signed_at)})
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-ink-100 p-4">
                <p className="text-xs font-bold text-brand-600">BÊN B — NGƯỜI THUÊ</p>
                <p className="mt-2 font-semibold text-ink-900">{detail.tenant?.full_name}</p>
                <p className="text-sm text-ink-500">{detail.tenant?.email}</p>
                <p className="text-sm text-ink-500">SĐT: {detail.tenant?.phone || 'Chưa có'}</p>
                {detail.tenant_signed_at && (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    ✓ Đã ký: {detail.tenant_signature_name} ({fmtDate(detail.tenant_signed_at)})
                  </div>
                )}
              </div>
            </div>

            {/* Room info */}
            <div className="rounded-xl bg-ink-50 p-4">
              <p className="text-xs font-bold text-ink-500">THÔNG TIN PHÒNG</p>
              <p className="mt-1 font-semibold text-ink-900">{detail.room?.title || `Phòng #${detail.room_id}`}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>Giá thuê: <b>{vnd(detail.monthly_rent)}/tháng</b></div>
                <div>Tiền cọc: <b>{detail.deposit_amount ? vnd(detail.deposit_amount) : '—'}</b></div>
                <div>Thời hạn: <b>{fmtDate(detail.start_date)} → {fmtDate(detail.end_date)}</b></div>
                <div>Trạng thái: <b>{CONTRACT_STATUS_LABEL[detail.status] || detail.status}</b></div>
              </div>
            </div>

            {/* Terms */}
            {detail.terms && (
              <div className="rounded-xl border border-ink-100 p-4">
                <p className="text-xs font-bold text-ink-500">ĐIỀU KHOẢN HỢP ĐỒNG</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{detail.terms}</p>
              </div>
            )}

            {/* Signing status */}
            <div className="flex items-center gap-4 rounded-xl bg-ink-50 p-4 text-sm">
              <div className="flex items-center gap-2">
                {detail.landlord_signed_at ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Clock size={16} className="text-ink-400" />}
                <span className={detail.landlord_signed_at ? 'font-semibold text-emerald-700' : 'text-ink-500'}>Chủ nhà đã ký</span>
              </div>
              <div className="flex items-center gap-2">
                {detail.tenant_signed_at ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Clock size={16} className="text-ink-400" />}
                <span className={detail.tenant_signed_at ? 'font-semibold text-emerald-700' : 'text-ink-500'}>Người thuê đã ký</span>
              </div>
            </div>

            {/* Sign button */}
            {['PENDING_TENANT', 'PENDING_LANDLORD', 'DRAFT'].includes(detail.status) && (() => {
              const isTenant = user?.id === detail.tenant_id
              const isLandlord = user?.id === detail.landlord_id
              const canSign = (isTenant && detail.status === 'PENDING_TENANT') || (isLandlord && detail.status === 'PENDING_LANDLORD') || (detail.status === 'DRAFT' && (isTenant || isLandlord))
              if (!canSign) return null
              return (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm font-bold text-brand-800">Ký hợp đồng</p>
                  <p className="mt-1 text-xs text-brand-600">Bằng việc ký, bạn xác nhận đồng ý với toàn bộ điều khoản hợp đồng.</p>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="label">Họ tên ký</label>
                      <input className="input" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Nhập họ tên để ký" />
                    </div>
                    <button
                      disabled={signing || signatureName.length < 2}
                      onClick={async () => {
                        setSigning(true)
                        try {
                          await api.post(`/contracts/${detail.id}/sign`, { signature_name: signatureName })
                          toast('Ký hợp đồng thành công!')
                          setDetail(null)
                          onChanged()
                        } catch (e) { toast(e.message, 'error') }
                        finally { setSigning(false) }
                      }}
                      className="btn-primary"
                    >
                      {signing ? <Spinner size={16} /> : <CheckCircle2 size={16} />} Xác nhận ký
                    </button>
                  </div>
                </div>
              )
            })()}

            <div className="flex justify-end">
              <button className="btn-secondary" onClick={() => setDetail(null)}>Đóng</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Tạo hợp đồng mới" width="max-w-xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-label">Phòng (ID)
            <input type="number" className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} placeholder="VD: 1" />
          </label>
          <label className="field-label">Người thuê (ID)
            <input type="number" className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} placeholder="VD: 3" />
          </label>
          <label className="field-label">Giá thuê (đ/tháng)
            <input type="number" className="input" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} placeholder="VD: 2800000" />
          </label>
          <label className="field-label">Tiền cọc (đ)
            <input type="number" className="input" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} placeholder="VD: 2800000" />
          </label>
          <label className="field-label">Ngày bắt đầu
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </label>
          <label className="field-label">Ngày kết thúc
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </label>
          <label className="field-label sm:col-span-2">Điều khoản
            <textarea className="input min-h-20" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Điều khoản hợp đồng..." />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Hủy</button>
          <button className="btn-primary" disabled={busy} onClick={create}>
            {busy ? <Spinner size={16} /> : <FileText size={16} />} Tạo hợp đồng
          </button>
        </div>
      </Modal>
    </div>
  )
}


function InvoicesTab({ role, invoices, onChanged }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(null)
  const [payTarget, setPayTarget] = useState(null) // invoice đang chọn để thanh toán QR
  const [form, setForm] = useState({ room_id: '', tenant_id: '', period: '', rent_amount: '', electricity_amount: '', water_amount: '', internet_amount: '', service_amount: '', other_amount: '' })

  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const create = async () => {
    setBusy(true)
    try {
      await api.post('/invoices', {
        room_id: Number(form.room_id),
        tenant_id: Number(form.tenant_id),
        period: form.period || defaultPeriod,
        rent_amount: Number(form.rent_amount) || 0,
        electricity_amount: Number(form.electricity_amount) || 0,
        water_amount: Number(form.water_amount) || 0,
        internet_amount: Number(form.internet_amount) || 0,
        service_amount: Number(form.service_amount) || 0,
        other_amount: Number(form.other_amount) || 0,
      })
      toast('Tạo hóa đơn thành công')
      setOpen(false)
      setForm({ room_id: '', tenant_id: '', period: '', rent_amount: '', electricity_amount: '', water_amount: '', internet_amount: '', service_amount: '', other_amount: '' })
      onChanged()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmPay = async (inv) => {
    setPaying(inv.id)
    try {
      await api.post(`/invoices/${inv.id}/pay`, { method: 'QR' })
      toast('Thanh toán thành công')
      setPayTarget(null)
      onChanged()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setPaying(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Hóa đơn</h1>
          <p className="text-sm text-ink-500">{role === 'landlord' ? 'Tạo hóa đơn và theo dõi thanh toán' : 'Hóa đơn tiền phòng và dịch vụ'}</p>
        </div>
        {role === 'landlord' && (
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Tạo hóa đơn</button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {invoices.length === 0 && <EmptyState icon={Receipt} title="Chưa có hóa đơn" description="Hóa đơn sẽ hiển thị ở đây sau khi được tạo" />}
        {invoices.map((inv) => (
          <div key={inv.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Receipt size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{inv.period} · {inv.room?.title || `Phòng #${inv.room_id}`}</p>
                <p className="truncate text-sm text-ink-500">
                  {inv.tenant?.full_name || `Người thuê #${inv.tenant_id}`} · Hạn: {fmtDate(inv.due_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap font-display text-base font-extrabold text-ink-900">{vnd(inv.total_amount)}</span>
              <StatusBadge label={INVOICE_STATUS_LABEL[inv.status] || inv.status}
                tone={inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-ink-100 text-ink-600'} />
              {role !== 'landlord' && inv.status === 'PENDING' && (
                <button onClick={() => setPayTarget(inv)} className="btn-primary !py-2 text-sm">
                  <QrCode size={14} /> Thanh toán
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tạo hóa đơn mới" width="max-w-xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-label">Phòng (ID)
            <input type="number" className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} placeholder="VD: 1" />
          </label>
          <label className="field-label">Người thuê (ID)
            <input type="number" className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} placeholder="VD: 3" />
          </label>
          <label className="field-label">Kỳ (YYYY-MM)
            <input type="text" className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder={defaultPeriod} />
          </label>
          <label className="field-label">Tiền phòng (đ)
            <input type="number" className="input" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} placeholder="VD: 2800000" />
          </label>
          <label className="field-label">Tiền điện (đ)
            <input type="number" className="input" value={form.electricity_amount} onChange={(e) => setForm({ ...form, electricity_amount: e.target.value })} placeholder="VD: 350000" />
          </label>
          <label className="field-label">Tiền nước (đ)
            <input type="number" className="input" value={form.water_amount} onChange={(e) => setForm({ ...form, water_amount: e.target.value })} placeholder="VD: 120000" />
          </label>
          <label className="field-label">Internet (đ)
            <input type="number" className="input" value={form.internet_amount} onChange={(e) => setForm({ ...form, internet_amount: e.target.value })} placeholder="VD: 100000" />
          </label>
          <label className="field-label">Dịch vụ (đ)
            <input type="number" className="input" value={form.service_amount} onChange={(e) => setForm({ ...form, service_amount: e.target.value })} placeholder="VD: 50000" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Hủy</button>
          <button className="btn-primary" disabled={busy} onClick={create}>
            {busy ? <Spinner size={16} /> : <Receipt size={16} />} Tạo hóa đơn
          </button>
        </div>
      </Modal>

      {/* QR payment modal */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Thanh toán hóa đơn" width="max-w-md">
        {payTarget && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={13} /> QR Payment · Mô phỏng
            </div>
            <p className="font-display text-xl font-extrabold text-ink-900">{vnd(payTarget.total_amount)}</p>
            <p className="mt-0.5 text-sm text-ink-500">Hóa đơn {payTarget.period} · {payTarget.room?.title || `Phòng #${payTarget.room_id}`}</p>

            <div className="my-5 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payTarget.qr_content || `TF${payTarget.room_id}-${payTarget.period}`)}`}
                alt="QR thanh toán"
                className="h-44 w-44"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <p className="max-w-xs text-xs text-ink-400">
              Quét mã QR bằng ứng dụng ngân hàng để thanh toán. Đây là luồng mô phỏng — khi tích hợp cổng thanh toán thật, mã QR sẽ được tạo từ gateway.
            </p>
            <div className="mt-5 w-full rounded-xl bg-ink-50 px-4 py-2.5 text-left font-mono text-xs text-ink-500">
              Mã giao dịch: <span className="font-semibold text-ink-700">{payTarget.qr_content || `TF${payTarget.room_id}-${payTarget.period}`}</span>
            </div>
            <div className="mt-5 flex w-full gap-2">
              <button className="btn-ghost flex-1" onClick={() => setPayTarget(null)}>Hủy</button>
              <button className="btn-primary flex-1" disabled={paying === payTarget.id} onClick={() => confirmPay(payTarget)}>
                {paying === payTarget.id ? <Spinner size={16} /> : <CheckCircle2 size={16} />} Đã thanh toán
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MetersTab({ rooms }) {
  const [roomId, setRoomId] = useState('')
  const [meters, setMeters] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ meter_type: 'ELECTRICITY', previous_value: '', current_value: '', unit_price: '', image_url: '' })
  const [ocrResult, setOcrResult] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  const runOcr = async () => {
    if (!form.image_url) { toast('Nhập URL ảnh công tơ trước', 'error'); return }
    setOcrLoading(true)
    setOcrResult(null)
    try {
      const res = await api.get('/ai/ocr', { params: { image_url: form.image_url } })
      setOcrResult(res.data)
      if (res.data.value) {
        setForm((f) => ({ ...f, current_value: String(res.data.value) }))
      }
      toast(`OCR đọc được: ${res.data.value} ${res.data.unit} (${Math.round(res.data.confidence * 100)}%)`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setOcrLoading(false)
    }
  }

  const loadRoom = async (rid) => {
    if (!rid) { setMeters([]); setAnalysis(null); return }
    setLoading(true)
    try {
      const [mRes, aRes] = await Promise.all([
        api.get(`/meters/room/${rid}`),
        api.get(`/meters/room/${rid}/analysis`),
      ])
      setMeters(mRes.data || [])
      setAnalysis(aRes.data || null)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roomId) loadRoom(roomId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  const create = async () => {
    setBusy(true)
    try {
      await api.post('/meters', {
        room_id: Number(roomId),
        meter_type: form.meter_type,
        previous_value: Number(form.previous_value),
        current_value: Number(form.current_value),
        unit_price: Number(form.unit_price),
        image_url: form.image_url || undefined,
      })
      toast('Nhập chỉ số thành công')
      setOpen(false)
      setForm({ meter_type: 'ELECTRICITY', previous_value: '', current_value: '', unit_price: '', image_url: '' })
      loadRoom(roomId)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const anomaly = (a) => {
    if (!a || !a.is_anomaly) return null
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        ⚠️ {a.message || 'Mức tiêu thụ tăng bất thường'}
      </div>
    )
  }

  const forecast = (f) => {
    if (!f) return null
    return (
      <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm">
        <p className="font-semibold text-brand-700">🤖 Dự báo tháng sau</p>
        <p className="mt-0.5 text-brand-800">
          {f.low !== undefined && f.high !== undefined ? `${vnd(f.low)} – ${vnd(f.high)}` : 'Chưa đủ dữ liệu'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Điện nước</h1>
          <p className="text-sm text-ink-500">Nhập chỉ số công tơ và xem phân tích AI</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="field-label flex-1 sm:max-w-xs">
          Chọn phòng
          <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">-- Chọn phòng --</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <button onClick={() => setOpen(true)} disabled={!roomId} className="btn-primary">
          <Plus size={16} /> Nhập chỉ số mới
        </button>
      </div>

      {loading && <div className="mt-5 grid gap-4 sm:grid-cols-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>}

      {!loading && roomId && (
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card p-5">
              <h3 className="mb-3 font-display text-base font-bold text-ink-900">Lịch sử chỉ số</h3>
              {meters.length === 0 && <p className="text-sm text-ink-400">Chưa có chỉ số nào cho phòng này.</p>}
              <div className="space-y-2">
                {meters.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`badge ${m.meter_type === 'ELECTRICITY' ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-cyan-700'}`}>
                        {METER_TYPE_LABEL[m.meter_type] || m.meter_type}
                      </span>
                      <span className="text-sm font-semibold text-ink-800">{m.period}</span>
                    </div>
                    <div className="text-sm text-ink-600">
                      {m.previous_value} → {m.current_value} ({m.meter_type === 'ELECTRICITY' ? 'kWh' : 'm³'})
                    </div>
                    <span className="font-semibold text-ink-900">{vnd(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <Sparkles size={17} className="text-brand-600" /> AI phân tích
              </h3>
              {analysis ? (
                <div className="space-y-3">
                  {anomaly(analysis.electricity_anomaly)}
                  {anomaly(analysis.water_anomaly)}
                  {forecast(analysis.electricity_forecast)}
                  {forecast(analysis.water_forecast)}
                </div>
              ) : (
                <p className="text-sm text-ink-400">Chọn phòng để xem phân tích.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nhập chỉ số công tơ" width="max-w-lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-label sm:col-span-2">
            Loại chỉ số
            <select className="input" value={form.meter_type} onChange={(e) => setForm({ ...form, meter_type: e.target.value })}>
              <option value="ELECTRICITY">Điện (kWh)</option>
              <option value="WATER">Nước (m³)</option>
            </select>
          </label>
          <label className="field-label">Chỉ số cũ
            <input type="number" className="input" value={form.previous_value} onChange={(e) => setForm({ ...form, previous_value: e.target.value })} placeholder="VD: 125" />
          </label>
          <label className="field-label">Chỉ số mới
            <input type="number" className="input" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} placeholder="VD: 158" />
          </label>
          <label className="field-label sm:col-span-2">Đơn giá (đ/đơn vị)
            <input type="number" className="input" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="VD: 3500" />
          </label>
          <label className="field-label sm:col-span-2">Ảnh công tơ (URL - OCR đọc chỉ số)
            <div className="flex gap-2">
              <input type="text" className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://images.unsplash.com/..." />
              <button type="button" onClick={runOcr} disabled={ocrLoading} className="btn-secondary shrink-0">
                {ocrLoading ? <Spinner size={15} /> : <Sparkles size={15} />} OCR
              </button>
            </div>
          </label>
          {ocrResult && (
            <div className="sm:col-span-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-800">
                    Đọc chỉ số: <span className="font-display text-lg">{ocrResult.value} {ocrResult.unit}</span>
                  </p>
                  <p className="text-xs text-brand-600">Độ tin cậy {Math.round(ocrResult.confidence * 100)}% · {ocrResult.engine}</p>
                </div>
                <button type="button" onClick={() => setOcrResult(null)} className="text-xs font-semibold text-brand-600 hover:underline">Bỏ qua</button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-400">{ocrResult.note}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-ink-400">💡 Dán URL ảnh công tơ, bấm OCR để tự động đọc chỉ số (mock OCR, sẵn sàng tích hợp model thật).</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Hủy</button>
          <button className="btn-primary" disabled={busy} onClick={create}>
            {busy ? <Spinner size={16} /> : <Gauge size={16} />} Lưu chỉ số
          </button>
        </div>
      </Modal>
    </div>
  )
}

function MaintenanceTab({ role, items, onChanged }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', room_id: '' })
  const [updating, setUpdating] = useState(null)

  const create = async () => {
    setBusy(true)
    try {
      await api.post('/maintenance', {
        title: form.title,
        description: form.description,
        priority: form.priority,
        room_id: form.room_id ? Number(form.room_id) : undefined,
      })
      toast('Gửi yêu cầu sửa chữa thành công')
      setOpen(false)
      setForm({ title: '', description: '', priority: 'MEDIUM', room_id: '' })
      onChanged()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const updateStatus = async (item, status) => {
    setUpdating(item.id)
    try {
      await api.put(`/maintenance/${item.id}/status`, { status })
      toast('Cập nhật trạng thái thành công')
      onChanged()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Yêu cầu sửa chữa</h1>
          <p className="text-sm text-ink-500">{role === 'landlord' ? 'Theo dõi và xử lý yêu cầu của người thuê' : 'Báo sự cố và theo dõi tiến độ'}</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Tạo yêu cầu</button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && <EmptyState icon={Wrench} title="Chưa có yêu cầu sửa chữa" />}
        {items.map((m) => (
          <div key={m.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Wrench size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{m.title}</p>
                <p className="line-clamp-1 text-sm text-ink-500">{m.description}</p>
                <p className="mt-0.5 text-xs text-ink-400">{m.room?.title || `Phòng #${m.room_id}`} · {timeAgo(m.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge label={PRIORITY_LABEL[m.priority] || m.priority}
                tone={m.priority === 'URGENT' || m.priority === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-ink-100 text-ink-600'} />
              <StatusBadge label={MAINTENANCE_STATUS_LABEL[m.status] || m.status}
                tone={m.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : m.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-ink-100 text-ink-600'} />
              {role === 'landlord' && m.status !== 'RESOLVED' && (
                <button
                  disabled={updating === m.id}
                  onClick={() => updateStatus(m, m.status === 'PENDING' ? 'IN_PROGRESS' : 'RESOLVED')}
                  className="btn-secondary !py-1.5 !px-3 !text-xs"
                >
                  {updating === m.id ? <Spinner size={13} /> : m.status === 'PENDING' ? 'Bắt đầu' : 'Hoàn thành'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tạo yêu cầu sửa chữa" width="max-w-lg">
        <div className="grid gap-4">
          <label className="field-label">
            Tiêu đề
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Điều hòa không hoạt động" />
          </label>
          <label className="field-label">
            Mô tả chi tiết
            <textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sự cố..." />
          </label>
          <label className="field-label">
            Mức độ ưu tiên
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </label>
          {role === 'tenant' && (
            <label className="field-label">
              Phòng (ID - để trống nếu không rõ)
              <input type="number" className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} placeholder="VD: 1" />
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Hủy</button>
          <button className="btn-primary" disabled={busy} onClick={create}>
            {busy ? <Spinner size={16} /> : <Wrench size={16} />} Gửi yêu cầu
          </button>
        </div>
      </Modal>
    </div>
  )
}

function RoommateShortcut() {
  const navigate = useNavigate()
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Users size={26} />
      </div>
      <h1 className="font-display text-xl font-extrabold text-ink-900">Tìm người ở ghép</h1>
      <p className="max-w-md text-sm text-ink-500">
        Đăng bài tìm phòng hoặc tìm người ở ghép, sử dụng AI Match để tìm người phù hợp nhất với bạn.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/roommates" className="btn-primary">Xem bài đăng</Link>
        <Link to="/roommates/new" className="btn-secondary">Đăng bài mới</Link>
      </div>
    </div>
  )
}

function ProfileShortcut() {
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <User size={26} />
      </div>
      <h1 className="font-display text-xl font-extrabold text-ink-900">Hồ sơ cá nhân</h1>
      <p className="max-w-md text-sm text-ink-500">Cập nhật thông tin cá nhân, xác minh danh tính và quản lý tài khoản.</p>
      <Link to="/profile" className="btn-primary">Mở hồ sơ</Link>
    </div>
  )
}

// ================= TENANT =================
function TenantView({ data, active, load, onNavigate }) {
  const navigate = useNavigate()
  const { contract, room, current_invoice: currentInvoice, invoices, total_unpaid, meters, maintenance, bookings } = data

  if (active === 'overview') {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Tổng quan người thuê</h1>
            <p className="text-sm text-ink-500">Theo dõi chỗ ở, hóa đơn và các yêu cầu của bạn</p>
          </div>
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Home} label="Phòng đang thuê" value={room ? room.title : 'Chưa có'} color="bg-brand-50 text-brand-600" />
          <StatCard icon={Wallet} label="Tiền phòng tháng này" value={currentInvoice ? vnd(currentInvoice.total_amount) : '—'} color="bg-amber-50 text-amber-600" />
          <StatCard icon={Receipt} label="Tổng nợ chưa thanh toán" value={vnd(total_unpaid || 0)} color="bg-rose-50 text-rose-600" />
          <StatCard icon={CheckCircle2} label="Hợp đồng" value={contract ? CONTRACT_STATUS_LABEL[contract.status] || contract.status : 'Chưa có'} color="bg-emerald-50 text-emerald-600" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden">
            {room ? (
              <>
                <div className="relative h-44">
                  <SmartImage src={room.images?.[0]?.image_url} alt={room.title} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 badge bg-white/90 text-ink-800 backdrop-blur">
                    {ROOM_STATUS_LABEL[room.status] || room.status}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-ink-900">{room.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">📍 {room.address}, {room.district}, {room.city}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink-600">
                    <span className="badge bg-ink-100 text-ink-600">{room.area}m²</span>
                    <span className="badge bg-ink-100 text-ink-600">{ROOM_TYPE_LABEL[room.room_type] || room.room_type}</span>
                    <span className="badge bg-ink-100 text-ink-600">{room.max_occupants} người</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="font-display text-xl font-extrabold text-brand-600">{vnd(room.price)}<span className="text-xs font-medium text-ink-400">/tháng</span></p>
                    <button onClick={() => navigate(`/rooms/${room.id}`)} className="btn-secondary !py-2 text-sm">Xem phòng</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5">
                <EmptyState icon={Home} title="Bạn chưa thuê phòng nào" description="Tìm phòng phù hợp và gửi yêu cầu thuê ngay" action={<Link to="/rooms" className="btn-primary">Tìm phòng</Link>} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {currentInvoice && (
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-ink-900">Hóa đơn {currentInvoice.period}</h3>
                  <StatusBadge label={INVOICE_STATUS_LABEL[currentInvoice.status] || currentInvoice.status} tone="bg-amber-50 text-amber-700" />
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-ink-500">Tiền phòng</dt><dd className="font-medium text-ink-800">{vnd(currentInvoice.rent_amount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-500">Tiền điện</dt><dd className="font-medium text-ink-800">{vnd(currentInvoice.electricity_amount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-500">Tiền nước</dt><dd className="font-medium text-ink-800">{vnd(currentInvoice.water_amount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-500">Internet</dt><dd className="font-medium text-ink-800">{vnd(currentInvoice.internet_amount)}</dd></div>
                  {currentInvoice.service_amount > 0 && (
                    <div className="flex justify-between"><dt className="text-ink-500">Dịch vụ</dt><dd className="font-medium text-ink-800">{vnd(currentInvoice.service_amount)}</dd></div>
                  )}
                  <div className="flex justify-between border-t border-ink-100 pt-2 font-display text-base font-extrabold text-ink-900">
                    <dt>TỔNG</dt><dd>{vnd(currentInvoice.total_amount)}</dd>
                  </div>
                </dl>
                <button
                  onClick={() => onNavigate('invoices')}
                  className="btn-primary mt-4 w-full"
                >
                  <Receipt size={16} /> Thanh toán ngay
                </button>
              </div>
            )}

            <div className="card p-5">
              <h3 className="mb-3 font-display text-base font-bold text-ink-900">Điện nước gần đây</h3>
              {meters.length === 0 ? (
                <p className="text-sm text-ink-400">Chưa có dữ liệu chỉ số.</p>
              ) : (
                <div className="space-y-2">
                  {meters.slice(0, 4).map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5 text-sm">
                      <span className="flex items-center gap-2 font-medium text-ink-700">
                        <Gauge size={15} className={m.meter_type === 'ELECTRICITY' ? 'text-amber-500' : 'text-cyan-500'} />
                        {METER_TYPE_LABEL[m.meter_type]} · {m.period}
                      </span>
                      <span className="font-semibold text-ink-900">{vnd(m.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (active === 'room') {
    return (
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Phòng của tôi</h1>
        {room ? (
          <div className="mt-5 card overflow-hidden">
            <div className="h-56 sm:h-72">
              <SmartImage src={room.images?.[0]?.image_url} alt={room.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={ROOM_STATUS_LABEL[room.status] || room.status}
                  tone={room.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'} />
                {room.is_verified && <StatusBadge label="✓ Đã xác minh" tone="bg-brand-50 text-brand-700" />}
              </div>
              <h2 className="mt-2 font-display text-xl font-extrabold text-ink-900">{room.title}</h2>
              <p className="mt-1 text-sm text-ink-500">{room.address}, {room.district}, {room.city}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs text-ink-400">Giá thuê</p>
                  <p className="mt-1 font-display text-lg font-extrabold text-brand-600">{vnd(room.price)}</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs text-ink-400">Diện tích</p>
                  <p className="mt-1 font-display text-lg font-extrabold text-ink-900">{room.area}m²</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs text-ink-400">Số người</p>
                  <p className="mt-1 font-display text-lg font-extrabold text-ink-900">{room.max_occupants}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(room.amenities || []).map((a) => <span key={a} className="badge bg-brand-50 text-brand-700">{a}</span>)}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button onClick={() => navigate(`/rooms/${room.id}`)} className="btn-primary">Xem chi tiết</button>
                <button onClick={() => onNavigate('invoices')} className="btn-secondary">Xem hóa đơn</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState icon={Home} title="Bạn chưa thuê phòng nào" description="Tìm phòng phù hợp và gửi yêu cầu thuê ngay" action={<Link to="/rooms" className="btn-primary">Tìm phòng</Link>} />
          </div>
        )}
      </div>
    )
  }

  if (active === 'bookings') return <BookingsTab role="tenant" bookings={bookings || []} onChanged={load} />
  if (active === 'contracts') return <ContractsTab role="tenant" contracts={contract ? [contract] : []} onChanged={load} />
  if (active === 'invoices') return <InvoicesTab role="tenant" invoices={invoices || []} onChanged={load} />
  if (active === 'meters') return <TenantMeters meters={meters || []} />
  if (active === 'maintenance') return <MaintenanceTab role="tenant" items={maintenance || []} onChanged={load} />
  if (active === 'profile') return <ProfileShortcut />

  return null
}

function TenantMeters({ meters }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Điện nước</h1>
      <p className="text-sm text-ink-500">Lịch sử tiêu thụ điện nước của phòng bạn</p>
      <div className="mt-5 space-y-2">
        {meters.length === 0 && <EmptyState icon={Gauge} title="Chưa có dữ liệu chỉ số" description="Chủ nhà sẽ nhập chỉ số định kỳ" />}
        {meters.map((m) => (
          <div key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.meter_type === 'ELECTRICITY' ? 'bg-amber-50 text-amber-600' : 'bg-cyan-50 text-cyan-600'}`}>
                <Gauge size={19} />
              </div>
              <div>
                <p className="font-semibold text-ink-900">{METER_TYPE_LABEL[m.meter_type] || m.meter_type} · {m.period}</p>
                <p className="text-sm text-ink-500">
                  {m.previous_value} → {m.current_value} ({m.meter_type === 'ELECTRICITY' ? 'kWh' : 'm³'}) · tiêu thụ {m.consumption}
                </p>
              </div>
            </div>
            <span className="font-display text-lg font-extrabold text-ink-900">{vnd(m.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
