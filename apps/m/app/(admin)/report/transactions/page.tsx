import { prisma } from '@pms/db'
import { Badge } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

async function loadRecent() {
  return prisma.booking.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      property: { select: { name: true, code: true } },
      variant: { select: { name: true } },
    },
  })
}

const statusVariant: Record<string, 'brand' | 'success' | 'warning' | 'danger' | 'pending'> = {
  CONFIRMED: 'success',
  PENDING_PAYMENT: 'pending',
  CANCELLED: 'danger',
  COMPLETED: 'brand',
  INVOICE: 'warning',
}

export default async function Page() {
  const items = await loadRecent()

  return (
    <div>
      <PageHeader
        icon="history"
        title="ประวัติการทำรายการ"
        subtitle={`${items.length} รายการล่าสุด`}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((b) => {
            const name = (b.property.name as { th?: string })?.th ?? b.property.code
            const variantName = (b.variant?.name as { th?: string })?.th
            return (
              <li
                key={b.id}
                className="grid grid-cols-1 gap-1.5 px-5 py-3.5 sm:grid-cols-12 sm:items-center sm:gap-3"
              >
                <div className="sm:col-span-5">
                  <div className="font-medium text-gray-900">{name}</div>
                  <div className="text-[11px] text-gray-500">
                    #{b.id.slice(-8)} · {variantName ?? '—'}
                  </div>
                </div>
                <div className="text-xs text-gray-600 sm:col-span-3">
                  {new Date(b.checkin).toLocaleDateString('th-TH')} →{' '}
                  {new Date(b.checkout).toLocaleDateString('th-TH')}
                </div>
                <div className="text-sm font-semibold text-gray-900 sm:col-span-2 sm:text-right">
                  ฿{b.total.toNumber().toLocaleString('th-TH')}
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <Badge variant={statusVariant[b.status] ?? 'default'} dot>
                    {b.status}
                  </Badge>
                </div>
              </li>
            )
          })}
          {items.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">ยังไม่มีรายการ</li>
          )}
        </ul>
      </div>
    </div>
  )
}
