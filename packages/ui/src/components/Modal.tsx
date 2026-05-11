'use client'

import * as React from 'react'
import { cn } from '../cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, children, title, description, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="ปิด"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm transition-opacity"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-2xl',
          sizeClass[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
                {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="size-8 shrink-0 rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-3', className)}>
      {children}
    </div>
  )
}
