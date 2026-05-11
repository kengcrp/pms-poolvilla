'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../cn'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: ModalSize
}

const sizePx: Record<ModalSize, number> = {
  sm: 448,
  md: 512,
  lg: 672,
  xl: 768,
  '2xl': 1024,
}

export function Modal({ open, onClose, children, title, description, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  if (typeof window === 'undefined') return null

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '1rem',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: `${sizePx[size]}px`, width: '100%', marginTop: 'auto', marginBottom: 'auto' }}
        className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5"
      >
        {(title || description) && (
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title && <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>}
                {description && <p className="mt-0.5 truncate text-sm text-gray-500">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="ปิด"
              >
                <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-6 py-3.5 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
