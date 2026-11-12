import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import api from '../api/client'
import RoomCard from '../components/RoomCard'
import { EmptyState, ErrorBanner, Pagination, RoomCardSkeleton } from '../components/ui'
import { ROOM_TYPE_LABEL, vnd } from '../utils/format'
import { PROPERTY_TYPES } from '../config/brand'

const amenities = [
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'ac', label: 'Máy lạnh' },
  { key: 'parking', label: 'Chỗ để xe' },
  { key: 'furnished', label: 'Có nội thất' },
]

function selectedFilters(filters) {
  const roomType = Object.hasOwn(ROOM_TYPE_LABEL, filters.room_type) ? ROOM_TYPE_LABEL[filters.room_type] : filters.room_type
  const bathroom = filters.bathroom_type === 'PRIVATE' ? 'WC riêng'
    : filters.bathroom_type === 'SHARED' ? 'WC chung' : filters.bathroom_type
  const chips = [
    ['keyword', filters.keyword && `“${filters.keyword}”`],
    ['city', filters.city],
    ['district', filters.district],
    ['room_type', roomType],
    ['price_min', filters.price_min && `Từ ${vnd(filters.price_min)}/tháng`],
    ['price_max', filters.price_max && `Đến ${vnd(filters.price_max)}/tháng`],
    ['area_min', filters.area_min && `Từ ${filters.area_min} m²`],
    ['bathroom_type', bathroom],
    ...amenities.map(({ key, label }) => [key, filters[key] && (filters[key] === 'false' ? `Không có ${label.toLowerCase()}` : label)]),
  ]
  return chips.filter(([, label]) => label)
}

export default function RoomList() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [retry, setRetry] = useState(0)
  const filterToggle = useRef(null)

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
    page: Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1),
  }), [params])

  useEffect(() => {
    const request = new AbortController()
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value) })
    query.set('page_size', '12')
    setLoading(true)
    setError(null)
    api.get(`/rooms?${query.toString()}`, { signal: request.signal })
      .then(({ data: result }) => {
        if (request.signal.aborted) return
        setData(result.items)
        setMeta(result)
      })
      .catch((err) => { if (!request.signal.aborted) setError(err.message) })
      .finally(() => { if (!request.signal.aborted) setLoading(false) })
    return () => request.abort()
  }, [filters, retry])

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
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

  const applyKeyword = (event) => {
    event.preventDefault()
    updateFilter('keyword', keywordInput.trim())
  }

  const resetFilters = () => setParams(new URLSearchParams(), { replace: true })

  const chips = selectedFilters(filters)
  const toggleBool = (key) => updateFilter(key, filters[key] === 'true' ? '' : 'true')

  return (
    <div className="container-x py-6 sm:py-9">
      <header className="mb-5 rounded-2xl border border-ink-200 bg-[#f5f3ed] px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Khám phá chỗ ở</h1>
          <Link to="/ai-recommend" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-800 hover:bg-white">
            <Sparkles size={16} aria-hidden="true" /> YangMatch
          </Link>
        </div>
        <form onSubmit={applyKeyword} role="search" aria-label="Tìm chỗ ở" className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Tên chỗ ở hoặc khu vực</span>
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              className="input h-11 !pl-10"
              placeholder="Tên chỗ ở, khu vực…"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary h-11 shrink-0 px-3.5 sm:px-5">Tìm kiếm</button>
        </form>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
        <button
          ref={filterToggle}
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="listing-filters"
          className="btn-secondary min-h-11 justify-self-start lg:hidden"
        >
          <SlidersHorizontal size={16} aria-hidden="true" /> Bộ lọc {chips.length > 0 && `(${chips.length})`}
        </button>
        <aside id="listing-filters" aria-labelledby="listing-filter-title" className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="card space-y-5 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 id="listing-filter-title" className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <Filter size={15} aria-hidden="true" className="text-brand-600" /> Bộ lọc
              </h2>
              <button onClick={resetFilters} className="min-h-9 text-xs font-semibold text-brand-700 hover:underline">Đặt lại</button>
            </div>

            <div>
              <label htmlFor="filter-city" className="label">Thành phố</label>
              <select id="filter-city" className="input" value={filters.city} onChange={(e) => updateCity(e.target.value)}>
                <option value="">Tất cả thành phố</option>
                <option>Hà Nội</option>
                <option>TP.HCM</option>
              </select>
              <label htmlFor="filter-district" className="label mt-3">Quận, huyện</label>
              <select id="filter-district" className="input" value={filters.district} onChange={(e) => updateFilter('district', e.target.value)}>
                <option value="">Tất cả quận huyện</option>
                {['Cầu Giấy', 'Nam Từ Liêm', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông', 'Hoàng Mai', 'Ba Đình', 'Tây Hồ', 'Bắc Từ Liêm'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <fieldset className="min-w-0">
              <legend className="label">Giá thuê (đ/tháng)</legend>
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Giá thấp nhất" className="input min-w-0" type="number" placeholder="Từ" value={filters.price_min} onChange={(e) => updateFilter('price_min', e.target.value)} />
                <input aria-label="Giá cao nhất" className="input min-w-0" type="number" placeholder="Đến" value={filters.price_max} onChange={(e) => updateFilter('price_max', e.target.value)} />
              </div>
            </fieldset>

            <div>
              <label htmlFor="filter-area" className="label">Diện tích (m²)</label>
              <select id="filter-area" className="input" value={filters.area_min} onChange={(e) => updateFilter('area_min', e.target.value)}>
                <option value="">Bất kỳ</option>
                <option value="15">Từ 15m²</option>
                <option value="20">Từ 20m²</option>
                <option value="25">Từ 25m²</option>
                <option value="30">Từ 30m²</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-room-type" className="label">Loại chỗ ở</label>
              <select id="filter-room-type" className="input" value={filters.room_type} onChange={(e) => updateFilter('room_type', e.target.value)}>
                {PROPERTY_TYPES.map((t) => <option key={t.value || 'all'} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="filter-bathroom" className="label">Phòng tắm</label>
              <select id="filter-bathroom" className="input" value={filters.bathroom_type} onChange={(e) => updateFilter('bathroom_type', e.target.value)}>
                <option value="">Tất cả</option>
                <option value="PRIVATE">WC riêng</option>
                <option value="SHARED">WC chung</option>
              </select>
            </div>

            <fieldset>
              <legend className="label">Tiện ích</legend>
              <div className="space-y-2.5">
                {amenities.map((opt) => (
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
            </fieldset>
            <button type="button" onClick={() => { setShowFilters(false); filterToggle.current?.focus() }} className="btn-primary w-full lg:hidden">Xem kết quả</button>
          </div>
        </aside>

        <section aria-label="Kết quả tìm chỗ ở" className="min-w-0">
          {chips.length > 0 && (
            <div role="group" aria-label="Bộ lọc đang dùng" className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Bỏ lọc ${label}`}
                  onClick={() => key === 'city' ? updateCity('') : updateFilter(key, '')}
                  className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 text-left text-xs font-semibold text-brand-800 hover:bg-brand-100"
                >
                  <span className="min-w-0 break-words">{label}</span><X size={14} aria-hidden="true" className="shrink-0" />
                </button>
              ))}
              <button onClick={resetFilters} className="min-h-9 px-1 text-xs font-semibold text-brand-800 underline underline-offset-2">Xóa bộ lọc</button>
            </div>
          )}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p role="status" className="text-sm font-semibold text-ink-800">
              {loading ? 'Đang tải…' : !error && meta ? `${meta.total} kết quả` : ''}
            </p>
            <select
              aria-label="Sắp xếp kết quả"
              className="input !w-auto max-w-[60%] !py-2"
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

          {error ? <ErrorBanner message={error} onRetry={() => setRetry((value) => value + 1)} /> : loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)}
            </div>
          ) : data?.length === 0 ? (
            <EmptyState
              title="Không tìm thấy chỗ ở phù hợp"
              description="Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khoá khác nhé."
              action={chips.length > 0 && <button onClick={resetFilters} className="btn-primary">Xóa bộ lọc</button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {(data || []).map((room) => <RoomCard key={room.id} room={room} />)}
              </div>
              <Pagination page={filters.page} totalPages={meta?.total_pages || 1} onChange={(p) => updateFilter('page', String(p))} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
