'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  images: { id: string; url: string }[]
  openIdx: number | null
  onClose: () => void
  onNav: (next: number) => void
}

export function Lightbox({ images, openIdx, onClose, onNav }: Props) {
  useEffect(() => {
    if (openIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNav((openIdx - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') onNav((openIdx + 1) % images.length)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [openIdx, onClose, onNav, images.length])

  if (openIdx === null) return null
  if (typeof window === 'undefined') return null
  const img = images[openIdx]
  if (!img) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNav((openIdx - 1 + images.length) % images.length)
        }}
        className="absolute left-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="รูปก่อน"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNav((openIdx + 1) % images.length)
        }}
        className="absolute right-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="รูปถัดไป"
      >
        ›
      </button>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
      >
        ✕ ปิด
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
        {openIdx + 1} / {images.length}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
      />
    </div>,
    document.body,
  )
}
