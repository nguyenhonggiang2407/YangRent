import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Briefcase, Calendar, Cpu, Flag, GraduationCap, MapPin, MessageCircle, Sparkles, Users, Wallet, XCircle, RotateCcw } from 'lucide-react'
import api from '../api/client'
import SmartImage from '../components/SmartImage'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, ErrorBanner, Modal, Spinner, toast } from '../components/ui'
import { GENDER_LABEL, POST_TYPE_LABEL, timeAgo, vnd } from '../utils/format'

export default function RoommateDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [matches, setMatches] = useState(null)
  const [matching, setMatching] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    api.get(`/roommates/${id}`)
      .then((res) => { setPost(res.data); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [id])

  const runMatch = async () => {
    if (!user) { navigate('/login'); return }
    setMatching(true)
    try {
      const res = await api.get(`/roommates/${id}/ai-match`)
      setMatches(res.data.matches)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setMatching(false)
    }
  }

  const contact = async (userId) => {
    if (!user) { navigate('/login'); return }
    try {
      const res = await api.post('/chat/conversations', {
        user_id: userId,
        initial_message: `Chào bạn, mình thấy bài đăng "${post.title}" trên YangRent, mình muốn trao đổi thêm nhé.`,
      })
      navigate('/chat', { state: { conversationId: res.data.id } })
    } catch (e) { toast(e.message, 'error') }
  }

  const submitReport = async () => {
    try {
      await api.post(`/roommates/${id}/report`)
      toast('Cảm ơn bạn! Báo cáo đã được gửi.')
      setReportOpen(false)
    } catch (e) { toast(e.message, 'error') }
  }

  // Dong / mo lai bai dang (chi chu bai)
  const toggleStatus = async () => {
    const next = post.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE'
    try {
      const res = await api.put(`/roommates/${id}`, { status: next })
      setPost(res.data)
      toast(next === 'CLOSED' ? 'Đã đóng bài đăng' : 'Đã mở lại bài đăng')
    } catch (e) { toast(e.message, 'error') }
  }

  if (loading) return <div className="container-x py-16 text-center"><Spinner size={28} /></div>
  if (error) return <div className="container-x py-16"><ErrorBanner message={error} onRetry={() => window.location.reload()} /></div>
  if (!post) return null

  const isOwner = user && post.user_id === user.id
  const images = post.images || []

  return (
    <div className="container-x py-8 animate-fadeUp">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-5 !px-2">
        <ArrowLeft size={17} /> Quay lại
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="card overflow-hidden">
            {post.status === 'CLOSED' && (
              <div className="flex items-center gap-2 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700">
                <XCircle size={16} /> Bài đăng đã đóng — không nhận thêm liên hệ
              </div>
            )}
            {images.length > 0 && <SmartImage src={images[0]} alt={post.title} className="h-64 w-full sm:h-80" />}
            {images.length > 1 && (
              <div className="grid grid-cols-3 gap-2 border-t border-ink-100 p-2">
                {images.slice(1).map((img, i) => (
                  <SmartImage key={i} src={img} alt={`${post.title} ${i + 2}`} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            )}
            <div className="p-6 sm:p-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={post.post_type === 'LOOKING_ROOMMATE' ? 'bg-brand-50 text-brand-700' : 'bg-blue-50 text-blue-700'}>
                  {POST_TYPE_LABEL[post.post_type]}
                </Badge>
                <span className="text-xs text-ink-400">Đăng {timeAgo(post.created_at)}</span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{post.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin size={15} className="text-brand-600" /> {post.district}, {post.city}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {post.budget_min && (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <Wallet size={18} className="text-brand-600" />
                    <p className="mt-2 text-xs text-ink-400">Ngân sách</p>
                    <p className="text-sm font-bold text-ink-800">{vnd(post.budget_min)} - {vnd(post.budget_max || post.budget_min)}</p>
                  </div>
                )}
                {post.cost_per_person && (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <Wallet size={18} className="text-brand-600" />
                    <p className="mt-2 text-xs text-ink-400">Chi phí/người</p>
                    <p className="text-sm font-bold text-ink-800">{vnd(post.cost_per_person)}</p>
                  </div>
                )}
                <div className="rounded-xl bg-ink-50 p-4">
                  <Users size={18} className="text-brand-600" />
                  <p className="mt-2 text-xs text-ink-400">Số người</p>
                  <p className="text-sm font-bold text-ink-800">{post.num_people} người</p>
                </div>
                {post.move_in_date && (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <Calendar size={18} className="text-brand-600" />
                    <p className="mt-2 text-xs text-ink-400">Chuyển vào</p>
                    <p className="text-sm font-bold text-ink-800">{post.move_in_date}</p>
                  </div>
                )}
                {post.school && (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <GraduationCap size={18} className="text-brand-600" />
                    <p className="mt-2 text-xs text-ink-400">Trường học</p>
                    <p className="text-sm font-bold text-ink-800">{post.school}</p>
                  </div>
                )}
                {post.workplace && (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <Briefcase size={18} className="text-brand-600" />
                    <p className="mt-2 text-xs text-ink-400">Nơi làm việc</p>
                    <p className="text-sm font-bold text-ink-800">{post.workplace}</p>
                  </div>
                )}
              </div>

              {post.desired_amenities?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-display text-sm font-bold text-ink-900">Tiện ích mong muốn</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.desired_amenities.map((a) => (
                      <span key={a} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-display text-sm font-bold text-ink-900">Mô tả</h3>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">{post.description}</p>
              </div>
            </div>
          </div>

          {/* AI Match */}
          <div className="card mt-6 overflow-hidden">
            <div className="flex flex-col items-start justify-between gap-4 border-b border-ink-100 p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink-900">AI Match - Tìm người phù hợp</h3>
                  <p className="text-xs text-ink-400">Tính điểm dựa trên khu vực, ngân sách, thời gian chuyển vào</p>
                </div>
              </div>
              <button onClick={runMatch} className="btn-primary" disabled={matching}>
                {matching ? <Spinner size={16} className="text-white" /> : <Sparkles size={16} />}
                {matches ? 'Chạy lại' : 'Tìm bằng AI'}
              </button>
            </div>

            {matches && (
              <div className="divide-y divide-ink-100">
                {matches.length === 0 && (
                  <p className="p-6 text-center text-sm text-ink-400">Chưa có người phù hợp. Quay lại sau nhé!</p>
                )}
                {matches.map((m) => (
                  <div key={m.post_id} className="flex items-center gap-4 p-5">
                    <Avatar src={m.avatar_url} name={m.user_name} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-bold text-ink-900">{m.user_name}</p>
                        <Badge className={m.post_type === 'LOOKING_ROOMMATE' ? 'bg-brand-50 text-brand-700' : 'bg-blue-50 text-blue-700'}>
                          {POST_TYPE_LABEL[m.post_type]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">{m.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.reasons.map((r) => (
                          <span key={r} className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                            <BadgeCheck size={11} /> {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <div className="relative h-14 w-14">
                        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#059669" strokeWidth="3.5"
                            strokeDasharray={`${(m.match_score / 100) * 100} 100`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-brand-700">
                          {m.match_score}%
                        </span>
                      </div>
                      <button onClick={() => contact(m.user_id)} className="btn-secondary !py-1.5 !px-3 !text-xs">
                        <MessageCircle size={13} /> Nhắn tin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card sticky top-20 p-6">
            <div className="flex items-center gap-3">
              <Avatar src={post.user?.avatar_url} name={post.user?.full_name} size={52} />
              <div>
                <p className="font-display text-base font-bold text-ink-900">{post.user?.full_name}</p>
                <p className="text-xs text-ink-400">
                  {post.gender_pref !== 'ANY' ? `${GENDER_LABEL[post.gender_pref] === 'Nam' ? 'Nam' : 'Nữ'} • ` : ''}
                  {POST_TYPE_LABEL[post.post_type]}
                </p>
              </div>
            </div>
            {isOwner ? (
              <button
                onClick={toggleStatus}
                className={`mt-5 w-full ${post.status === 'ACTIVE' ? 'btn-secondary !border-amber-300 !text-amber-700 hover:!bg-amber-50' : 'btn-primary'}`}
              >
                {post.status === 'ACTIVE' ? <XCircle size={17} /> : <RotateCcw size={17} />}
                {post.status === 'ACTIVE' ? 'Đóng bài đăng' : 'Mở lại bài đăng'}
              </button>
            ) : (
              <button onClick={() => contact(post.user_id)} disabled={post.status === 'CLOSED'} className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">
                <MessageCircle size={17} /> {post.status === 'CLOSED' ? 'Bài đăng đã đóng' : 'Nhắn tin ngay'}
              </button>
            )}
            <button onClick={() => setReportOpen(true)} className="btn-ghost mt-2 w-full text-red-500">
              <Flag size={16} /> Báo cáo bài đăng
            </button>
          </div>
        </div>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Báo cáo bài đăng">
        <p className="text-sm text-ink-500">Bài đăng này sẽ được gửi tới đội ngũ quản trị để xem xét.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setReportOpen(false)}>Huỷ</button>
          <button className="btn-primary bg-red-500 hover:bg-red-600" onClick={submitReport}>Gửi báo cáo</button>
        </div>
      </Modal>
    </div>
  )
}
