import { Card } from '@pms/ui'

const kpis = [
  { label: 'จำนวนที่พัก', value: '—', sub: 'หลัง', icon: '🏠', tone: 'brand' },
  { label: 'การจองทั้งหมด', value: '—', sub: 'ครั้ง', icon: '📅', tone: 'success' },
  { label: 'รอชำระ', value: '—', sub: 'รายการ', icon: '⏳', tone: 'warning' },
  { label: 'ยอดรวมเดือนนี้', value: '฿—', sub: '', icon: '💰', tone: 'info' },
] as const

const toneClass: Record<(typeof kpis)[number]['tone'], string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-gray-600">ภาพรวมที่พักและการจองของคุณ</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">{kpi.label}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{kpi.value}</div>
                {kpi.sub && <div className="mt-0.5 text-xs text-gray-400">{kpi.sub}</div>}
              </div>
              <div
                className={`flex size-10 items-center justify-center rounded-xl text-xl ${toneClass[kpi.tone]}`}
              >
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">การจองรายเดือน</h2>
              <p className="text-xs text-gray-500">ภาพรวม 6 เดือนล่าสุด</p>
            </div>
          </div>
          <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
            📊 chart placeholder — Phase 5
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold text-gray-900">เริ่มต้นใช้งาน</h2>
          <p className="text-xs text-gray-500">Phase 0–3 พร้อมแล้ว</p>
          <ul className="mt-4 space-y-2.5 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span>Auth + DB schema</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span>Property CRUD + Variant</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span>Calendar + Pricing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span>Booking 4-tab modal</span>
            </li>
            <li className="flex items-start gap-2 opacity-60">
              <span className="mt-0.5 size-2 rounded-full bg-gray-300" />
              <span>Phase 4: iCal sync, postpone, coupons</span>
            </li>
            <li className="flex items-start gap-2 opacity-60">
              <span className="mt-0.5 size-2 rounded-full bg-gray-300" />
              <span>Phase 5: Public sale page</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
