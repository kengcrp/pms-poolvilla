const items = [
  { label: 'จองแล้ว', class: 'bg-red-50 text-red-700 ring-red-200' },
  { label: 'รอชำระ', class: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { label: 'วันสำคัญ', class: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { label: 'ลดราคา', class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { label: 'ปิดซ่อม', class: 'bg-gray-100 text-gray-700 ring-gray-200' },
] as const

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${it.class}`}
        >
          <span className="size-1.5 rounded-full bg-current opacity-80" />
          {it.label}
        </span>
      ))}
    </div>
  )
}
