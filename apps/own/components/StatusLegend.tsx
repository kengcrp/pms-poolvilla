import { Icon } from '@pms/ui'

const items = [
  { label: 'จองแล้ว', class: 'bg-red-100 text-red-700' },
  { label: 'รอชำระ', class: 'bg-amber-100 text-amber-700' },
  { label: 'วันสำคัญ', class: 'bg-blue-100 text-blue-700' },
  { label: 'ปิดซ่อม', class: 'bg-gray-200 text-gray-700' },
] as const

interface Props {
  /** Show an extra "ไม่แบ่งห้อง" chip (lock icon, white pill) at the end of the legend.
   *  Used by the split-variant panel to explain the lock icon that appears on split-locked days. */
  showSplitLock?: boolean
}

export function StatusLegend({ showSplitLock = false }: Props = {}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${it.class}`}
        >
          <span className="size-2 rounded-full bg-current" />
          {it.label}
        </span>
      ))}
      {showSplitLock && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300">
          <Icon name="lock" className="size-3 text-gray-500" />
          ไม่แบ่งห้อง
        </span>
      )}
    </div>
  )
}
