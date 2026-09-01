import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import api from '../api/client'
import RoomCard from '../components/RoomCard'
import { EmptyState, ErrorBanner, Pagination, RoomCardSkeleton, Spinner } from '../components/ui'
import { ROOM_TYPE_LABEL } from '../utils/format'
import { PROPERTY_TYPES } from '../config/brand'

export default function RoomList() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  // Đồng bộ ô tìm kiếm với URL (kể cả khi Reset / bấm liên kết tới /rooms?...)
  useEffect(() => {
    setKeywordInput(params.get('keyword') || '')
  }, [params])

  const filters = useMemo(() => ({
    keyword: params.get('keyword') || '',
    city: params.get('city') || '',
    district: params.get('district') || '',
    price_min: params.get('price_min') || '',
    price_max: params.get('price_max') || '',
    area_min: params.get('area_min') || '',
    room_type: params.get('room_type') || '',
    bathroom_type: params.get('bathroom_type') || '',
    furnished: params.get('furnished') || '',
    wifi: params.get('wifi') || '',
    ac: params.get('ac') || '',
    parking: params.get('parking') || '',
    sort: params.get('sort') || 'newest',
    page: parseInt(params.get('page') || '1', 10),
  }), [params])

  const fetchRooms = async (override = {}) => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      Object.entries({ ...filters, ...override }).forEach(([k, v]) => { if (v) q.set(k, v) })
      q.set('page_size', '12')
      const res = await api.get(`/rooms?${q.toString()}`)
      setData(res.data.items)
      setMeta(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRooms() }, [params])

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next, { replace: true })
  }

  // Đổi thành phố PHẢI đồng thời xoá quận đang chọn - một lần cập nhật URL duy nhất
  // (trước đây gọi 2 lần updateFilter nên thay đổi thành phố bị ghi đè và không có tác dụng)
  const updateCity = (city) => {
    const next = new URLSearchParams(params)
    if (city) next.set('city', city)
    else next.delete('city')
    next.delete('district')
    next.delete('page')
    setParams(next, { replace: true })
  }

  const applyKeyword = () => updateFilter('keyword', keywordInput.trim())

  const resetFilters = () => setParams(new URLSearchParams(), { replace: true })

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    v && !['sort', 'page'].includes(k)).length

  const toggleBool = (key) => updateFilter(key, filters[key] ? '' : 'true')

  return (
    <div className="container-x py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">Khám phá chỗ ở</h1>
        <p className="mt-1 text-sm text-ink-500">
          {data ? `Tìm thấy ${meta?.total} chỗ ở phù hợp` : 'Đang tìm chỗ ở phù hợp với bạn...'}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input !pl-10"
            placeholder="Tìm theo tên chỗ ở, địa chỉ, quận huyện..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyKeyword() }}
          />
        </div>
        <button onClick={applyKeyword} disabled={loading} className="btn-primary min-w-28">
          {loading ? <Spinner size={16} /> : <Search size={16} />} Tìm kiếm
        </button>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary lg:hidden">
          <SlidersHorizontal size={16} /> Bộ lọc {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
        <button onClick={resetFilters} className="btn-ghost">
          <X size={16} /> Xoá lọc
        </button>
        <Link to="/ai-recommend" className="btn-primary">
          <Sparkles size={16} /> YangMatch
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ===== Filter sidebar ===== */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="card sticky top-20 space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
                <Filter size={15} className="text-brand-600" /> Bộ lọc
              </h3>
              <button onClick={resetFilters} className="text-xs font-semibold text-brand-600 hover:underline">Đặt lại</button>
            </div>

            <div>
              <label className="label">Khu vực</label>
              <select className="input" value={filters.city} onChange={(e) => updateCity(e.target.value)}>
                <option value="">Tất cả thành phố</option>
                <option>Hà Nội</option>
                <option>TP.HCM</option>
              </select>
              <select className="input mt-2" value={filters.district} onChange={(e) => updateFilter('district', e.target.value)}>
                <option value="">Tất cả quận huyện</option>
                {['Cầu Giấy', 'Nam Từ Liêm', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông', 'Hoàng Mai', 'Ba Đình', 'Tây Hồ', 'Bắc Từ Liêm'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Giá thuê (đ/tháng)</label>
              <div className="flex items-center gap-2">
                <input className="input" type="number" placeholder="Từ" value={filters.price_min} onChange={(e) => updateFilter('price_min', e.target.value)} />
                <span className="text-ink-400">-</span>
                <input className="input" type="number" placeholder="Đến" value={filters.price_max} onChange={(e) => updateFilter('price_max', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Diện tích (m²)</label>
              <select className="input" value={filters.area_min} onChange={(e) => updateFilter('area_min', e.target.value)}>
                <option value="">Bất kỳ</option>
                <option value="15">Từ 15m²</option>
                <option value="20">Từ 20m²</option>
                <option value="25">Từ 25m²</option>
                <option value="30">Từ 30m²</option>
              </select>
            </div>

            <div>
              <label className="label">Loại chỗ ở</label>
              <select className="input" value={filters.room_type} onChange={(e) => updateFilter('room_type', e.target.value)}>
                {PROPERTY_TYPES.map((t) => <option key={t.value || 'all'} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Phòng tắm</label>
              <select className="input" value={filters.bathroom_type} onChange={(e) => updateFilter('bathroom_type', e.target.value)}>
                <option value="">Tất cả</option>
                <option value="PRIVATE">WC riêng</option>
                <option value="SHARED">WC chung</option>
              </select>
            </div>

            <div>
              <label className="label">Tiện ích</label>
              <div className="space-y-2.5">
                {[
                  { key: 'wifi', label: 'WiFi' },
                  { key: 'ac', label: 'Máy lạnh' },
                  { key: 'parking', label: 'Chỗ để xe' },
                  { key: 'furnished', label: 'Có nội thất' },
                ].map((opt) => (
                  <label key={opt.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={filters[opt.key] === 'true'}
                      onChange={() => toggleBool(opt.key)}
                      className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ===== Results ===== */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              {loading ? 'Đang tải...' : meta ? `${meta.total} kết quả` : ''}
            </p>
            <select
              className="input !w-auto !py-2"
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="area_desc">Diện tích lớn nhất</option>
              <option value="featured">Nổi bật nhất</option>
            </select>
          </div>

          {error && <ErrorBanner message={error} onRetry={() => fetchRooms()} />}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)}
            </div>
          ) : data?.length === 0 ? (
            <EmptyState
              title="Không tìm thấy chỗ ở phù hợp"
              description="Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khoá khác nhé."
              action={<button onClick={resetFilters} className="btn-primary">Xoá bộ lọc</button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {(data || []).map((room) => <RoomCard key={room.id} room={room} />)}
              </div>
              <Pagination page={filters.page} totalPages={meta?.total_pages || 1} onChange={(p) => updateFilter('page', String(p))} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
