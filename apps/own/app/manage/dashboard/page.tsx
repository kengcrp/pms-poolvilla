export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
      <p className="mt-1 text-sm text-gray-600">ภาพรวมที่พักและการจองของคุณ</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'จำนวนที่พัก', value: '0', sub: 'หลัง' },
          { label: 'การจองทั้งหมด', value: '0', sub: 'ครั้ง' },
          { label: 'รอชำระ', value: '0', sub: 'รายการ' },
          { label: 'ยอดรวมเดือนนี้', value: '฿0', sub: '' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs text-gray-500">{kpi.label}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="mt-0.5 text-xs text-gray-400">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">เริ่มต้นใช้งาน</h2>
        <p className="mt-1 text-sm text-gray-600">
          Phase 0 ✅ เสร็จแล้ว — Auth + DB schema + tRPC scaffold พร้อม
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
          <li>Phase 1 ถัดไป: หน้า ลิสติ้งที่พัก + form 8 sections</li>
          <li>Phase 2: ปฏิทิน + ปรับราคา weekly modal</li>
          <li>Phase 3: Booking flow 4 tabs</li>
        </ul>
      </div>
    </div>
  )
}
