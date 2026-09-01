import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, MapPin, Sparkles, Wallet } from 'lucide-react'
import api from '../api/client'
import { Spinner, toast } from '../components/ui'
import { PROPERTY_TYPES } from '../config/brand'
import { vnd } from '../utils/format'

const DISTRICTS = ['Cầu Giấy', 'Nam Từ Liêm', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông', 'Hoàng Mai', 'Ba Đình', 'Tây Hồ', 'Bắc Từ Liêm']

export default function AIRecommend() {
  const [form, setForm] = useState({ budget: '', district: '', room_type: '' })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (form.budget) q.set('budget', form.budget)
      if (form.district) q.set('district', form.district)
      if (form.room_type) q.set('room_type', form.room_type)
      const res = await api.get(`/ai/recommend?${q.toString()}`)
      setResults(res.data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-x max-w-4xl py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
          <Sparkles size={26} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">YangRent · Recommendation</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">YangMatch</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-500">
          Chọn ngân sách, khu vực và loại chỗ ở. YangMatch xếp hạng các listing phù hợp bằng
          <strong className="font-semibold text-ink-700"> rule-based scoring</strong>; đây không phải mô hình machine learning.
        </p>
      </div>

      <form onSubmit={run} className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="label">Ngân sách tối đa</label>
          <select className="input" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}>
            <option value="">Bất kỳ</option>
            <option value="3000000">Đến 3 triệu</option>
            <option value="5000000">Đến 5 triệu</option>
            <option value="7000000">Đến 7 triệu</option>
            <option value="10000000">Đến 10 triệu</option>
            <option value="15000000">Đến 15 triệu</option>
          </select>
        </div>
        <div>
          <label className="label">Khu vực</label>
          <select className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
            <option value="">Bất kỳ</option>
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Loại chỗ ở</label>
          <select className="input" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })}>
            {PROPERTY_TYPES.map((t) => <option key={t.value || 'all'} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner size={17} className="text-white" /> : <Sparkles size={17} />} Tìm phù hợp
          </button>
        </div>
      </form>

      {results && (
        <div className="mt-8">
          <p className="mb-4 text-sm text-ink-500">{results.note}</p>
          <div className="space-y-3">
            {results.items.length === 0 && (
              <p className="card p-8 text-center text-sm text-ink-400">Chưa có chỗ ở phù hợp. Hãy thử nới ngân sách hoặc khu vực.</p>
            )}
            {results.items.map((r) => (
              <Link key={r.room_id} to={`/rooms/${r.room_id}`} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-sm font-extrabold text-white">
                  {r.score}%
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold text-ink-900">{r.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {r.district}</span>
                    <span className="flex items-center gap-1"><Wallet size={12} /> {vnd(r.price)}/tháng</span>
                    <span>{r.area}m²</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.reasons.map((reason) => (
                      <span key={reason} className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                        <BadgeCheck size={11} /> {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
