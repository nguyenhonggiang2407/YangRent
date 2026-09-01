import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react'

// ---------- Spinner ----------
export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-brand-600 ${className}`} />
}

// ---------- Skeleton (loading state) ----------
export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-ink-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

export function RoomCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}

// ---------- Empty state ----------
export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100">
        <Icon size={26} className="text-ink-400" />
      </div>
      <h3 className="font-display text-lg font-bold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ---------- Badge ----------
export function Badge({ children, className = 'bg-ink-100 text-ink-600' }) {
  return <span className={`badge ${className}`}>{children}</span>
}

// ---------- Avatar ----------
export function Avatar({ src, name, size = 40, className = '' }) {
  const [err, setErr] = useState(false)
  const initials = (name || '?').split(' ').slice(-2).map((s) => s[0]).join('').toUpperCase()
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src && !err ? (
        <img src={src} alt={name || 'avatar'} onError={() => setErr(true)} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement
    // Focus first focusable element in modal
    setTimeout(() => {
      const el = modalRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      el?.focus()
    }, 100)
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open || !mounted) return null
  return ReactDOM.createPortal(
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} animate-fadeUp rounded-2xl bg-white p-6 shadow-lift`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

// ---------- Pagination ----------
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5 pt-6">
      <button
        className="btn-secondary !px-2.5 !py-2"
        disabled={page <= 1}
        onClick={() => onChange(1)}
        title="Trang đầu"
      >
        <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2" />
      </button>
      <button
        className="btn-secondary !px-3 !py-2"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
        .map((p, idx, arr) => (
          <span key={p} className="flex items-center gap-1">
            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
            <button
              onClick={() => onChange(p)}
              className={`h-9 min-w-9 rounded-xl px-3 text-sm font-semibold transition ${
                p === page ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 hover:bg-ink-100'
              }`}
            >
              {p}
            </button>
          </span>
        ))}
      <button
        className="btn-secondary !px-3 !py-2"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
      <button
        className="btn-secondary !px-2.5 !py-2"
        disabled={page >= totalPages}
        onClick={() => onChange(totalPages)}
        title="Trang cuối"
      >
        <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
      </button>
    </div>
  )
}

// ---------- Stat card ----------
export function StatCard({ icon: Icon, label, value, sub, color = 'bg-brand-50 text-brand-600', onClick }) {
  const inner = (
    <>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className="mt-0.5 truncate font-display text-xl font-bold text-ink-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
      </div>
    </>
  )
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="card flex items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {inner}
      </button>
    )
  }
  return <div className="card flex items-start gap-4 p-5">{inner}</div>
}

// ---------- Tabs ----------
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active === t.key ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---------- Toast (đơn giản, global qua context) ----------
let toastFn = null
export function toast(msg, type = 'success') {
  if (toastFn) toastFn(msg, type)
}

export function ToastHost() {
  const [items, setItems] = useState([])
  useEffect(() => {
    toastFn = (msg, type) => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, msg, type }])
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3500)
    }
    return () => { toastFn = null }
  }, [])
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {items.map((i) => (
        <div
          key={i.id}
          className={`pointer-events-auto animate-fadeUp rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lift ${
            i.type === 'error' ? 'bg-red-500' : 'bg-ink-900'
          }`}
        >
          {i.msg}
        </div>
      ))}
    </div>
  )
}

// ---------- Error banner ----------
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-sm font-medium text-red-700">{message || 'Có lỗi xảy ra'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary !py-1.5 !px-3 !text-xs">
          Thử lại
        </button>
      )}
    </div>
  )
}
