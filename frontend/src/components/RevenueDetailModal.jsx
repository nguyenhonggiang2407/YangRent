import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, Clock, Receipt, Wallet } from 'lucide-react'
import api from '../api/client'
import { EmptyState, ErrorBanner, Modal, Skeleton } from './ui'
import { fmtDate, vnd } from '../utils/format'

const BREAKDOWN = [
  { key: 'rent', label: 'Tiền phòng', color: 'bg-brand-500' },
  { key: 'electricity', label: 'Tiền điện', color: 'bg-amber-400' },
  { key: 'water', label: 'Tiền nước', color: 'bg-cyan-500' },
  { key: 'internet', label: 'Internet', color: 'bg-indigo-400' },
  { key: 'service', label: 'Dịch vụ', color: 'bg-violet-400' },
  { key: 'other', label: 'Phí khác', color: 'bg-ink-300' },
]

// Modal chi tiết doanh thu / doanh số — dữ liệu thật từ backend
// (scope='landlord': /dashboard/landlord/revenue · scope='admin': /admin/revenue)
export default function RevenueDetailModal({ open, onClose, scope = 'landlord' }) {
  const [months, setMonths] = useState(6)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)
    const endpoint = scope === 'admin' ? '/admin/revenue' : '/dashboard/landlord/revenue'
    api.get(endpoint, { params: { months } })
      .then((res) => { if (!cancelled) setData(res.data) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Không tải được dữ liệu doanh thu') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, scope, months])

  const breakdown = data?.breakdown || {}
  const breakdownTotal = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1
  const stats = data?.invoice_stats || {}
  const monthly = data?.monthly || []

  return (
    <Modal open={open} onClose={onClose} title={scope === 'admin' ? 'Chi tiết doanh thu hệ thống' : 'Chi tiết doanh thu của bạn'} width="max-w-3xl">
      {/* Chọn khoảng thời gian */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">Dữ liệu từ hóa đơn thực tế · bấm để chọn khoảng thời gian</p>
        <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${months === m ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'}`}
            >
              {m} tháng
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={() => setMonths((m) => m)} />}

      {!loading && !error && data && (
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          {/* Tổng doanh thu + hóa đơn */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-100">
                <Wallet size={14} /> Tổng doanh thu
              </p>
              <p className="mt-1.5 font-display text-2xl font-extrabold">{vnd(data.total_revenue)}</p>
              <p className="mt-0.5 text-xs text-brand-100">{stats.paid} hóa đơn đã thanh toán</p>
            </div>
            <div className="card flex flex-col justify-center p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={14} /> Đã thanh toán
              </p>
              <p className="mt-1.5 font-display text-xl font-extrabold text-ink-900">{stats.paid ?? 0}</p>
              <p className="mt-0.5 text-xs text-ink-400">hóa đơn</p>
            </div>
            <div className="card flex flex-col justify-center p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <Clock size={14} /> Chưa thanh toán
              </p>
              <p className="mt-1.5 font-display text-xl font-extrabold text-ink-900">{stats.pending ?? 0}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                quá hạn: {stats.expired ?? 0} · thất bại: {stats.failed ?? 0}
              </p>
            </div>
          </div>

          {/* Phân theo loại phí */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink-900">
              <Receipt size={15} className="text-brand-600" /> Doanh thu theo loại phí
            </h4>
            {breakdownTotal <= 1 ? (
              <p className="text-sm text-ink-400">Chưa có hóa đơn đã thanh toán trong khoảng thời gian này.</p>
            ) : (
              <div className="space-y-2.5">
                {BREAKDOWN.map((b) => {
                  const val = breakdown[b.key] || 0
                  const pct = Math.round((val / breakdownTotal) * 100)
                  return (
                    <div key={b.key} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm text-ink-600">{b.label}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold text-ink-800">{vnd(val)}</span>
                      <span className="w-10 shrink-0 text-right text-xs text-ink-400">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Theo tháng */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink-900">
              <BarChart3 size={15} className="text-brand-600" /> Doanh thu theo tháng
            </h4>
            <div className="overflow-x-auto rounded-xl border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-2.5">Kỳ</th>
                    <th className="px-4 py-2.5 text-right">Doanh thu</th>
                    <th className="px-4 py-2.5 text-right">Hóa đơn đã thu</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.period} className="border-t border-ink-100">
                      <td className="px-4 py-2.5 font-medium text-ink-800">{m.period}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-brand-700">{vnd(m.revenue)}</td>
                      <td className="px-4 py-2.5 text-right text-ink-500">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hóa đơn gần đây */}
          <div>
            <h4 className="mb-3 font-display text-sm font-bold text-ink-900">Hóa đơn đã thanh toán gần đây</h4>
            {data.invoices.length === 0 ? (
              <EmptyState icon={Receipt} title="Chưa có hóa đơn đã thanh toán" />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-ink-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-2.5">Kỳ</th>
                      <th className="px-4 py-2.5">Phòng</th>
                      <th className="px-4 py-2.5">Người thuê</th>
                      <th className="px-4 py-2.5 text-right">Tổng tiền</th>
                      <th className="px-4 py-2.5 text-right">Thanh toán lúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-ink-100">
                        <td className="px-4 py-2.5 text-ink-600">{inv.period}</td>
                        <td className="px-4 py-2.5 text-ink-800">{inv.room_title || `Phòng #${inv.id}`}</td>
                        <td className="px-4 py-2.5 text-ink-600">{inv.tenant_name || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink-900">{vnd(inv.total_amount)}</td>
                        <td className="px-4 py-2.5 text-right text-ink-500">{fmtDate(inv.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
