import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, Bath, Heart, MapPin, Ruler, Users } from 'lucide-react'
import SmartImage from './SmartImage'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { toast } from './ui'
import { ROOM_STATUS_LABEL, ROOM_STATUS_STYLE, ROOM_TYPE_LABEL, timeAgo, vnd } from '../utils/format'

export default function RoomCard({ room }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const image = useMemo(() => room.images?.find((x) => x.is_primary)?.image_url || room.images?.[0]?.image_url || '', [room.images])
  const [isFav, setIsFav] = useState(room.is_favorited || false)

  const toggleFav = async (e) => {
    e.preventDefault(); e.stopPropagation()
    if (!user) return navigate('/login')
    try {
      const res = await api.post(`/rooms/${room.id}/favorite`)
      setIsFav(res.data.is_favorite)
      toast(res.data.is_favorite ? 'Đã lưu vào yêu thích' : 'Đã bỏ yêu thích')
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <Link to={`/rooms/${room.id}`} className="card group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage src={image} alt={`${room.title} – ảnh đại diện`} className="h-full w-full transition duration-300 group-hover:scale-[1.02]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {room.is_verified && <span className="badge bg-brand-600/95 text-white backdrop-blur"><BadgeCheck size={13} /> Đã xác minh</span>}
          {room.is_featured && <span className="badge bg-amber-400/95 text-amber-950 backdrop-blur">Nổi bật</span>}
          {room.status === 'AVAILABLE' && room.created_at && <span className="badge bg-white/95 text-ink-700 backdrop-blur">{timeAgo(room.created_at)}</span>}
        </div>
        <button onClick={toggleFav} className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-soft transition hover:scale-110 ${isFav ? 'text-red-500' : 'text-ink-500 hover:text-red-500'}`} aria-label={isFav ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'}>
          <Heart size={17} fill={isFav ? 'currentColor' : 'none'} />
        </button>
        {room.status !== 'AVAILABLE' && <span className={`badge absolute bottom-3 left-3 ${ROOM_STATUS_STYLE[room.status] || 'bg-ink-100 text-ink-600'}`}>{ROOM_STATUS_LABEL[room.status] || room.status}</span>}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{ROOM_TYPE_LABEL[room.room_type] || 'Chỗ ở cho thuê'}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.6rem] text-[15px] font-bold leading-snug text-ink-900 group-hover:text-brand-700">{room.title}</h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-500"><MapPin size={13} className="shrink-0" /><span className="truncate">{room.ward ? `${room.ward}, ` : ''}{room.district}, {room.city}</span></p>
        <div className="mt-3 flex items-end justify-between border-t border-ink-100 pt-3">
          <p className="text-lg font-extrabold text-brand-700">{vnd(room.price)}</p><p className="pb-0.5 text-xs text-ink-400">/ tháng</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className="flex items-center gap-1"><Ruler size={13} /> {room.area} m²</span>
          <span className="flex items-center gap-1"><Users size={13} /> Tối đa {room.max_occupants || 1}</span>
          <span className="flex items-center gap-1"><Bath size={13} /> {room.bathroom_type === 'PRIVATE' ? 'WC riêng' : 'WC chung'}</span>
        </div>
        {room.amenities?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{room.amenities.slice(0, 3).map((a) => <span key={a} className="rounded-lg bg-ink-50 px-2 py-1 text-[11px] text-ink-500">{a}</span>)}</div>}
      </div>
    </Link>
  )
}
