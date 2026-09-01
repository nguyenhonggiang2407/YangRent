import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowDown, MessageCircle, Send } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, Spinner, toast } from '../components/ui'
import { timeAgo } from '../utils/format'

export default function Chat() {
  const { user } = useAuth()
  const location = useLocation()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const prevMsgCountRef = useRef(0)
  const [hasNewMessages, setHasNewMessages] = useState(false)

  useEffect(() => {
    api.get('/chat/conversations')
      .then((res) => {
        setConversations(res.data)
        const target = location.state?.conversationId
        if (target) {
          const found = res.data.find((c) => c.id === target)
          if (found) openConv(found)
        } else if (res.data.length > 0) {
          openConv(res.data[0])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const openConv = async (conv) => {
    try {
      const res = await api.get(`/chat/conversations/${conv.id}`)
      setActive(res.data)
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // Chỉ scroll到底 khi có tin nhắn MỚI, KHÔNG scroll khi chuyển conversation
  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }, [])

  useEffect(() => {
    const msgCount = active?.messages?.length || 0
    if (msgCount > prevMsgCountRef.current && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setHasNewMessages(false)
    } else if (msgCount > prevMsgCountRef.current) {
      setHasNewMessages(true)
    }
    prevMsgCountRef.current = msgCount
  }, [active?.messages?.length, isNearBottom])

  // Scroll到底 khi chuyển conversation (instant, không smooth)
  useEffect(() => {
    if (active) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
        setHasNewMessages(false)
        prevMsgCountRef.current = active?.messages?.length || 0
      }, 50)
    }
  }, [active?.id])

  const send = async (e) => {
    e.preventDefault()
    if (!message.trim() || !active || sending) return
    const content = message.trim()
    setMessage('')
    setSending(true)
    try {
      const res = await api.post(`/chat/conversations/${active.id}/messages`, { content })
      setActive((prev) => ({ ...prev, messages: [...prev.messages, res.data], last_message: content }))
    } catch (err) {
      toast(err.message, 'error')
      setMessage(content)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="container-x py-16 text-center"><Spinner size={28} /></div>

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 font-display text-3xl font-extrabold text-ink-900">Tin nhắn</h1>

      <div className="card grid h-[65vh] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="border-r border-ink-100 md:block">
          <div className="max-h-[65vh] overflow-y-auto">
            {conversations.length === 0 && (
              <p className="p-6 text-center text-sm text-ink-400">Chưa có cuộc trò chuyện nào</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConv(c)}
                className={`flex w-full items-center gap-3 border-b border-ink-50 p-4 text-left transition hover:bg-ink-50 ${
                  active?.id === c.id ? 'bg-brand-50/60' : ''
                }`}
              >
                <Avatar src={c.other_user?.avatar_url} name={c.other_user?.full_name} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-bold text-ink-900">{c.other_user?.full_name}</p>
                    {c.last_message_at && <span className="shrink-0 text-[10px] text-ink-400">{timeAgo(c.last_message_at)}</span>}
                  </div>
                  <p className="truncate text-xs text-ink-500">{c.last_message || 'Bắt đầu trò chuyện'}</p>
                  {c.room_title && <p className="mt-0.5 truncate text-[10px] text-brand-600">🏠 {c.room_title}</p>}
                </div>
                {c.unread_count > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-col">
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-ink-100 p-4">
                <Avatar src={active.other_user?.avatar_url} name={active.other_user?.full_name} size={38} />
                <div>
                  <p className="text-sm font-bold text-ink-900">{active.other_user?.full_name}</p>
                  {active.room_title && <p className="text-xs text-ink-400">🏠 {active.room_title}</p>}
                </div>
              </div>

              <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-5">
                {active.messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-ink-400">Hãy gửi tin nhắn đầu tiên</p>
                )}
                {active.messages.map((m) => {
                  const mine = m.sender_id === user?.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
                          mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-ink-100 text-ink-800'
                        }`}
                      >
                        <p>{m.content}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-ink-400'}`}>{timeAgo(m.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* New messages indicator */}
              {hasNewMessages && (
                <button
                  onClick={() => {
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
                    setHasNewMessages(false)
                  }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lift transition hover:bg-brand-700"
                >
                  <ArrowDown size={14} className="mr-1 inline" /> Tin nhắn mới
                </button>
              )}

              <form onSubmit={send} className="flex gap-2 border-t border-ink-100 p-4">
                <textarea
                  className="input min-h-10 max-h-28 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
                  placeholder="Nhập tin nhắn... (Enter gửi, Shift+Enter xuống dòng)"
                  rows={1}
                />
                <button type="submit" className="btn-primary !px-4" disabled={!message.trim() || sending}>
                  {sending ? <Spinner size={17} className="text-white" /> : <Send size={17} />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={MessageCircle}
                title="Chọn một cuộc trò chuyện"
                description="Nhắn tin với chủ nhà hoặc người ở ghép từ trang phòng / bài đăng."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
