import { useEffect, useRef, useState } from 'react'
import api from '../api/client'

/**
 * SSE hook for notification streaming.
 * Falls back to polling every 10s if SSE is not available.
 * Returns { unreadCount, refresh }
 */
export function useNotificationStream(user) {
  const [unreadCount, setUnreadCount] = useState(0)
  const esRef = useRef(null)
  const pollRef = useRef(null)

  const fetchCount = async () => {
    try {
      const res = await api.get('/notifications')
      setUnreadCount(res.data.unread_count || 0)
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!user) return

    // Try SSE first
    const token = localStorage.getItem('token') || ''
    try {
      const es = new EventSource(`${api.defaults.baseURL}/notifications/stream?token=${token}`)
      esRef.current = es

      es.addEventListener('notification', (e) => {
        try {
          const data = JSON.parse(e.data)
          setUnreadCount(data.unread_count || 0)
        } catch { /* silent */ }
      })

      es.onerror = () => {
        // SSE failed, fallback to polling
        es.close()
        startPolling()
      }
    } catch {
      startPolling()
    }

    function startPolling() {
      if (pollRef.current) return
      fetchCount()
      pollRef.current = setInterval(fetchCount, 10000)
    }

    return () => {
      esRef.current?.close()
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [user])

  return { unreadCount, refresh: fetchCount }
}
