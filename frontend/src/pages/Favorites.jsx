import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import api from '../api/client'
import RoomCard from '../components/RoomCard'
import { useAuth } from '../context/AuthContext'
import { EmptyState, ErrorBanner, RoomCardSkeleton } from '../components/ui'

export default function Favorites() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.get('/rooms/favorites/me')
      .then((res) => setRooms(res.data))
      .catch((e) => setError(e.message))
  }, [user, navigate])

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Phòng đã lưu</h1>
      <p className="mt-1 text-sm text-ink-500">Những phòng bạn yêu thích sẽ được lưu tại đây</p>

      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {rooms === null ? (
          Array.from({ length: 8 }).map((_, i) => <RoomCardSkeleton key={i} />)
        ) : rooms.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Heart}
              title="Chưa có phòng nào được lưu"
              description="Nhấn vào icon trái tim trên phòng bạn thích để lưu lại nhé."
            />
          </div>
        ) : (
          rooms.map((room) => <RoomCard key={room.id} room={room} />)
        )}
      </div>
    </div>
  )
}
