import { useState } from 'react'
import { FALLBACK_IMG } from './SmartImage'

export default function HousingPhoto({ photo, className = '', imageClassName = '', sizes = '100vw', priority = false }) {
  const [failed, setFailed] = useState(false)
  const largest = photo.variants.at(-1)

  return (
    <picture className={`block overflow-hidden bg-ink-100 ${className}`}>
      <img
        data-housing-photo={photo.id}
        src={failed ? FALLBACK_IMG : largest.src}
        srcSet={failed ? undefined : photo.variants.map((image) => `${image.src} ${image.width}w`).join(', ')}
        sizes={failed ? undefined : sizes}
        width={largest.width}
        height={largest.height}
        alt={failed ? 'Chưa tải được ảnh minh họa chỗ ở' : photo.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${imageClassName}`}
      />
    </picture>
  )
}
