// Fetch authenticates SSE with a header, keeping credentials out of URLs.
export async function readNotificationStream({ url, token, signal, onNotification, fetchImpl = fetch }) {
  const response = await fetchImpl(url, {
    headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
    cache: 'no-store', signal,
  })
  if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    throw new Error('Notification stream unavailable')
  }
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let pending = ''
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      if (pending.length > 65536) throw new Error('Notification event too large')
      const events = pending.split(/\r?\n\r?\n/)
      pending = events.pop()
      for (const event of events) {
        let kind = 'message'
        const lines = []
        for (const line of event.split(/\r?\n/)) {
          if (line.startsWith('event:')) kind = line.slice(6).trim()
          if (line.startsWith('data:')) lines.push(line.slice(5).replace(/^ /, ''))
        }
        if (kind !== 'notification' || !lines.length || signal.aborted) continue
        try {
          const data = JSON.parse(lines.join('\n'))
          if (Number.isInteger(data?.unread_count) && data.unread_count >= 0) onNotification(data)
        } catch { /* Ignore malformed events; later valid notifications still work. */ }
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
