import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { readNotificationStream } from '../lib/notificationStream'

/** Authenticated SSE, with polling when streaming is unavailable. */
export function useNotificationStream(user) {
  const [unreadCount, setUnreadCount] = useState(0)
  const refreshRef = useRef(async () => {})

  useEffect(() => {
    setUnreadCount(0)
    if (!user) return
    const controller = new AbortController()
    let active = true, polling = null
    const fetchCount = async () => {
      if (!active) return
      try {
        const res = await api.get('/notifications', { signal: controller.signal })
        if (active) setUnreadCount(res.data.unread_count || 0)
      } catch { /* A failed badge request does not interrupt the page. */ }
    }
    refreshRef.current = fetchCount
    const startPolling = () => {
      if (active && !polling) polling = setInterval(fetchCount, 10000)
    }
    fetchCount()
    const token = localStorage.getItem('yangrent_token') || localStorage.getItem('troflow_token')
    if (token) {
      readNotificationStream({
        url: `${api.defaults.baseURL.replace(/\/$/, '')}/notifications/stream`,
        token,
        signal: controller.signal,
        onNotification: data => { if (active) setUnreadCount(data.unread_count) },
      }).then(startPolling, startPolling)
    } else {
      startPolling()
    }
    return () => {
      active = false
      controller.abort()
      clearInterval(polling)
      refreshRef.current = async () => {}
    }
  }, [user])

  return { unreadCount, refresh: () => refreshRef.current() }
}
