'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@pms/ui'

interface SectionProps {
  num: number
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
  disabled?: boolean
}

export function Section({ num, title, description, defaultOpen = false, children, disabled }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
        disabled && 'opacity-60',
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              open ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            {num}
          </span>
          <div>
            <div className="font-semibold text-gray-900">{title}</div>
            {description && <div className="text-xs text-gray-500">{description}</div>}
          </div>
        </div>
        <svg
          className={cn('size-5 text-gray-400 transition-transform', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-100 px-6 py-5">{children}</div>}
    </div>
  )
}
