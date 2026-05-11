'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-5xl',
}

/**
 * Always-mounted modal — visibility controlled by `open`.
 * Uses createPortal to escape any parent transform/overflow constraints.
 */
export function Modal({ open, onClose, children, title, description, size = 'md' }: ModalProps) {
  const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    setPortalNode(document.body)
  }, [])

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

  if (!portalNode) return null

  const node = (
    <div
      data-modal
      className={cn(
        'fixed inset-0 z-[100] transition-opacity duration-150',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        aria-hidden
      />
      {/* Scroll container */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 transition-transform duration-150',
              open ? 'scale-100' : 'scale-95',
              sizeClass[size],
            )}
            onClick={(e) => e.stopPropagation()}
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
      </div>
    </div>
  )

  return createPortal(node, portalNode)
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
