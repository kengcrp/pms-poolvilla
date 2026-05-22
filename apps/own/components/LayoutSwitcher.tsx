'use client'

import { cn } from '@pms/ui'

export type Layout = 1 | 2 | 3

interface Props {
  value: Layout
  onChange: (v: Layout) => void
}

/**
 * 3-way layout switcher used on both ปฏิทิน and ปรับราคา pages.
 * Choice is persisted per-page via localStorage (caller controls the key).
 */
export function LayoutSwitcher({ value, onChange }: Props) {
  const buttons: { val: Layout; label: string }[] = [
    { val: 1, label: 'รูปแบบ 1' },
    { val: 2, label: 'รูปแบบ 2' },
    { val: 3, label: 'รูปแบบ 3' },
  ]
  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
      {buttons.map((b) => (
        <button
          key={b.val}
          type="button"
          onClick={() => onChange(b.val)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
            value === b.val
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
