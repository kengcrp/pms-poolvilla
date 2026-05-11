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
        'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all',
        open && 'shadow-md',
        disabled && 'opacity-60',
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors disabled:cursor-not-allowed',
          open ? 'bg-gray-50/50' : 'hover:bg-gray-50',
        )}
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors',
              open ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'bg-gray-100 text-gray-600',
            )}
          >
            {num}
          </span>
          <div>
            <div className="font-semibold text-gray-900">{title}</div>
            {description && <div className="mt-0.5 text-xs text-gray-500">{description}</div>}
          </div>
        </div>
        <svg
          className={cn('size-5 shrink-0 text-gray-400 transition-transform duration-200', open && 'rotate-180')}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-100 px-6 py-5">{children}</div>}
    </div>
  )
}
