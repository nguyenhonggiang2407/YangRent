import { useState } from 'react'

export const FALLBACK_IMG = '/images/yangrent-placeholder.svg'

export default function SmartImage({ src, alt = '', className = '', fallback = FALLBACK_IMG, eager = false }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const actualSrc = failed ? fallback : (src || fallback)

  return (
    <div className={`relative overflow-hidden bg-ink-100 ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-ink-100 via-white to-ink-100" />}
      <img
        src={actualSrc}
        alt={alt || 'Hình ảnh chỗ ở trên YangRent'}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failed) {
            setFailed(true)
            setLoaded(false)
          } else {
            setLoaded(true)
          }
        }}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
