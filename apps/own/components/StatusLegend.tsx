const items = [
  { label: 'จองแล้ว', class: 'bg-red-100 text-red-700' },
  { label: 'รอชำระ', class: 'bg-amber-100 text-amber-700' },
  { label: 'วันสำคัญ', class: 'bg-blue-100 text-blue-700' },
  { label: 'ปิดซ่อม', class: 'bg-gray-200 text-gray-700' },
] as const

export function StatusLegend() {
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
    </div>
  )
}
