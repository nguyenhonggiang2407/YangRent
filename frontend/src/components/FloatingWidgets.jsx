import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, Bot, Cpu, ScanLine, Sparkles, Users, X } from 'lucide-react'

// Nút nổi góc dưới phải: Chat AI + Back to top
export default function FloatingWidgets() {
  const navigate = useNavigate()
  const [showTop, setShowTop] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const actions = [
    { to: '/ai-recommend', icon: Sparkles, label: 'AI đề xuất phòng', desc: 'Gợi ý phòng phù hợp với bạn' },
    { to: '/roommates', icon: Users, label: 'AI Match ở ghép', desc: 'Tìm người ở ghép tương thích' },
    { to: '/ai-recommend', icon: ScanLine, label: 'OCR điện nước', desc: 'Đọc chỉ số công tơ từ ảnh' },
    { to: '/ai-recommend', icon: Cpu, label: 'Dự báo chi phí', desc: 'Ước tính tiền tháng sau' },
  ]

  return (
    <>
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Lên đầu trang"
        className={`fixed bottom-24 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-600 shadow-lift transition-all duration-200 hover:bg-ink-50 hover:text-ink-900 sm:right-6 ${
          showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <ArrowUp size={18} />
      </button>

      {/* Chat AI */}
      <div className="fixed bottom-4 right-4 z-40 sm:right-6">
        {aiOpen && (
          <div className="absolute bottom-16 right-0 w-72 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
            <div className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white">
                  <Bot size={17} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Trợ lý AI</p>
                  <p className="text-[11px] text-brand-100">YangRent Smart Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                aria-label="Đóng trợ lý AI"
                className="rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs text-ink-500">Chào bạn! Bạn cần trợ giúp gì về việc tìm chỗ ở?</p>
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => { setAiOpen(false); navigate(a.to) }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <a.icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-800">{a.label}</p>
                    <p className="truncate text-xs text-ink-400">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setAiOpen(!aiOpen)}
          aria-label="Mở trợ lý AI"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift transition hover:scale-105 hover:shadow-xl"
        >
          {aiOpen ? <X size={22} /> : <Bot size={24} className="transition group-hover:rotate-12" />}
          {!aiOpen && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
          )}
        </button>
      </div>
    </>
  )
}
