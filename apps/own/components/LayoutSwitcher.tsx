'use client'

import { useEffect, useRef, useState } from 'react'
import { cn, Icon } from '@pms/ui'

export type Layout = 1 | 2 | 3

interface Props {
  value: Layout
  onChange: (v: Layout) => void
}

const OPTIONS: { val: Layout; label: string }[] = [
  { val: 1, label: 'รูปแบบ 1' },
  { val: 2, label: 'รูปแบบ 2' },
  { val: 3, label: 'รูปแบบ 3' },
]

/**
 * Dropdown layout switcher used on both ปฏิทิน and ปรับราคา pages.
 * Choice is persisted per-page via localStorage (caller controls the key).
 *
 * Compact pill that shows the current selection + a chevron; tapping opens
 * a small dropdown to switch. Works the same on mobile + desktop.
 */
export function LayoutSwitcher({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = OPTIONS.find((o) => o.val === value) ?? OPTIONS[0]!

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors',
          open ? 'border-brand-400 ring-2 ring-brand-100' : 'hover:border-gray-300',
        )}
      >
        <span className="text-brand-700">{current.label}</span>
        <Icon
          name={open ? 'chevronUp' : 'chevronDown'}
          className="size-3 text-gray-400"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5">
          {OPTIONS.map((opt) => {
            const active = opt.val === value
            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  onChange(opt.val)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                {opt.label}
                {active && <Icon name="check" className="size-3.5 text-brand-600" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
