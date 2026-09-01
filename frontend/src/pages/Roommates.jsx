import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Briefcase, Calendar, GraduationCap, MapPin, Plus, Search, Users, Wallet } from 'lucide-react'
import api from '../api/client'
import SmartImage from '../components/SmartImage'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, EmptyState, ErrorBanner, Pagination, RoomCardSkeleton } from '../components/ui'
import { GENDER_LABEL, POST_TYPE_LABEL, timeAgo, vnd } from '../utils/format'

export default function Roommates() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    post_type: searchParams.get('post_type') || '',
    district: searchParams.get('district') || '',
    keyword: searchParams.get('keyword') || '',
  })
  const page = parseInt(searchParams.get('page') || '1', 10)

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) q.set(k, v) })
      q.set('page', String(page))
      q.set('page_size', '12')
      const res = await api.get(`/roommates?${q.toString()}`)
      setData(res.data.items)
      setMeta(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Use serialized filters to avoid unnecessary re-fetches
  const filterKey = JSON.stringify(filters)
  useEffect(() => { fetchPosts() }, [page, filterKey])

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  const setPage = (p) => {
    const params = new URLSearchParams(searchParams)
    if (p > 1) params.set('page', String(p))
    else params.delete('page')
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="container-x py-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Tìm người ở ghép</h1>
          <p className="mt-1 text-sm text-ink-500">
            {data ? `${meta?.total} bài đăng` : 'Tìm bạn ở ghép phù hợp với AI Match'}
          </p>
        </div>
        <Link to={user ? '/roommates/new' : '/login'} className="btn-primary">
          <Plus size={17} /> Đăng bài
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input !pl-10"
            placeholder="Tìm theo tiêu đề, khu vực, trường học, nơi làm việc..."
            value={filters.keyword}
            onChange={(e) => updateFilter('keyword', e.target.value)}
          />
        </div>          <select className="input !w-auto" value={filters.post_type} onChange={(e) => updateFilter('post_type', e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="LOOKING_ROOM">Đang tìm phòng</option>
          <option value="LOOKING_ROOMMATE">Tìm người ở ghép</option>
        </select>          <select className="input !w-auto" value={filters.district} onChange={(e) => updateFilter('district', e.target.value)}>
          <option value="">Tất cả khu vực</option>
          {['Cầu Giấy', 'Nam Từ Liêm', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông', 'Hoàng Mai'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchPosts} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)}
        </div>
      ) : data?.length === 0 ? (
        <EmptyState
          title="Chưa có bài đăng phù hợp"
          description="Hãy là người đầu tiên đăng bài tìm phòng hoặc tìm bạn ở ghép!"
          action={<Link to={user ? '/roommates/new' : '/login'} className="btn-primary"><Plus size={16} /> Đăng bài</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(data || []).map((post) => (
              <Link key={post.id} to={`/roommates/${post.id}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
                {post.images?.length > 0 && (
                  <SmartImage src={post.images[0]} alt={post.title} className="h-40 w-full" />
                )}
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge className={post.post_type === 'LOOKING_ROOMMATE' ? 'bg-brand-50 text-brand-700' : 'bg-blue-50 text-blue-700'}>
                      {POST_TYPE_LABEL[post.post_type]}
                    </Badge>
                    <span className="text-xs text-ink-400">{timeAgo(post.created_at)}</span>
                  </div>
                  <h3 className="line-clamp-2 font-display text-[15px] font-bold text-ink-900 group-hover:text-brand-700">{post.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{post.description}</p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500">
                    <span className="flex items-center gap-1"><MapPin size={13} className="text-brand-600" /> {post.district}</span>
                    {post.budget_min && (
                      <span className="flex items-center gap-1"><Wallet size={13} className="text-brand-600" /> {vnd(post.budget_min)} - {vnd(post.budget_max || post.budget_min)}</span>
                    )}
                    {post.move_in_date && (
                      <span className="flex items-center gap-1"><Calendar size={13} className="text-brand-600" /> {post.move_in_date}</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar src={post.user?.avatar_url} name={post.user?.full_name} size={30} />
                      <span className="text-xs font-semibold text-ink-700">{post.user?.full_name}</span>
                    </div>
                    {post.gender_pref !== 'ANY' && (
                      <span className="text-xs text-ink-400">Giới tính: {GENDER_LABEL[post.gender_pref]}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={meta?.total_pages || 1} onChange={setPage} />
        </>
      )}
    </div>
  )
}
