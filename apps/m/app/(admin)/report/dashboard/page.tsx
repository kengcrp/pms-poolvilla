import { prisma } from '@pms/db'
import { Icon, type IconName } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

async function loadStats() {
  const [
    propertyCount,
    activeProperties,
    pendingProperties,
    hotelCount,
    activeHotels,
    roomTypeCount,
    ownerCount,
    staffCount,
    villaBookingCount,
    hotelBookingCount,
    pendingVilla,
    pendingHotel,
    marketplaceBookings,
  ] = await Promise.all([
    prisma.property.count({ where: { deletedAt: null } }),
    prisma.property.count({ where: { deletedAt: null, isActive: true, reviewStatus: 'ACTIVE' } }),
    prisma.property.count({ where: { deletedAt: null, reviewStatus: 'PENDING' } }),
    prisma.hotel.count({ where: { deletedAt: null } }),
    prisma.hotel.count({ where: { deletedAt: null, isActive: true, reviewStatus: 'ACTIVE' } }),
    prisma.roomType.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'OWNER' } }),
    prisma.user.count({ where: { role: { in: ['STAFF', 'SUPER_ADMIN'] } } }),
    prisma.booking.count({ where: { deletedAt: null } }),
    prisma.hotelBooking.count({ where: { deletedAt: null } }),
    prisma.booking.count({ where: { deletedAt: null, status: 'PENDING_PAYMENT' } }),
    prisma.hotelBooking.count({ where: { deletedAt: null, status: 'PENDING' } }),
    prisma.booking.count({ where: { deletedAt: null, source: 'PUBLIC_SALE_PAGE' } }),
  ])
  const marketplaceHotel = await prisma.hotelBooking.count({
    where: { deletedAt: null, source: 'PUBLIC_SALE_PAGE' },
  })
  return {
    propertyCount,
    activeProperties,
    pendingProperties,
    hotelCount,
    activeHotels,
    roomTypeCount,
    ownerCount,
    staffCount,
    villaBookingCount,
    hotelBookingCount,
    totalBookings: villaBookingCount + hotelBookingCount,
    pendingTotal: pendingVilla + pendingHotel,
    marketplaceTotal: marketplaceBookings + marketplaceHotel,
  }
}

interface StatCardProps {
  icon: IconName
  label: string
  value: number | string
  hint?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info'
}

function StatCard({ icon, label, value, hint, tone = 'brand' }: StatCardProps) {
  const toneMap = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-sky-50 text-sky-700',
  } as const
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneMap[tone]}`}>
        <Icon name={icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{value}</div>
        {hint && <div className="mt-0.5 text-[11px] text-gray-400">{hint}</div>}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const s = await loadStats()

  return (
    <div>
      <PageHeader
        icon="dashboard"
        title="แดชบอร์ด"
        subtitle="ภาพรวมระบบ — ที่พัก / โรงแรม / เจ้าของ / การจอง"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon="home"
          label="ที่พัก (Pool Villa)"
          value={s.propertyCount}
          hint={`เปิดขาย ${s.activeProperties} · รออนุมัติ ${s.pendingProperties}`}
          tone="brand"
        />
        <StatCard
          icon="bed"
          label="โรงแรม"
          value={s.hotelCount}
          hint={`เปิดขาย ${s.activeHotels} · ห้อง ${s.roomTypeCount} ประเภท`}
          tone="info"
        />
        <StatCard
          icon="users"
          label="เจ้าของที่พัก"
          value={s.ownerCount}
          tone="success"
        />
        <StatCard
          icon="user"
          label="พนักงาน / Admin"
          value={s.staffCount}
          tone="brand"
        />
        <StatCard
          icon="bookings"
          label="การจองรวม"
          value={s.totalBookings}
          hint={`Villa ${s.villaBookingCount} · Hotel ${s.hotelBookingCount}`}
          tone="brand"
        />
        <StatCard
          icon="hourglass"
          label="รอดำเนินการ"
          value={s.pendingTotal}
          hint="รอชำระ / รอ confirm"
          tone="warning"
        />
        <StatCard
          icon="globe"
          label="จากหน้า Marketplace"
          value={s.marketplaceTotal}
          hint="ลูกค้าจองตรงจากหน้าสาธารณะ"
          tone="success"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Icon name="success" className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              ระบบพร้อมใช้งานเต็มรูปแบบ
            </h3>
            <ul className="mt-2 grid gap-1.5 text-sm text-gray-700 sm:grid-cols-2">
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                ตรวจสอบ / อนุมัติที่พัก (queue)
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                CRUD เจ้าของ + พนักงาน + reset password
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                Master data: โลเคชัน · ประเภทที่พัก/โรงแรม · สิ่งอำนวยฯ · บริการเสริม
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                ตั้งค่าระบบ: ค่าคอมมิชชัน · feature flags · ธีม
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                โรงแรม + ประเภทห้อง + inventory + booking
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                Public marketplace + Hotel sale page (Agoda-style)
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                Image upload (โรงแรม + ห้อง)
              </li>
              <li className="flex items-start gap-1.5">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                รายงานทำรายการ + Marketplace analytics
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
