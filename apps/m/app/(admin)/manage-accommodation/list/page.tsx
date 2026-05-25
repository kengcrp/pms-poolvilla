import { prisma } from '@pms/db'
import { Badge, Icon } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

/**
 * Load properties + their owners.
 * Owner is fetched in a separate query (not via `include`) because Prisma throws when a
 * required relation has an orphan row (Property.ownerId points to a deleted User). With
 * a separate query, we can fall back gracefully when an owner is missing.
 */
async function loadProperties() {
  const properties = await prisma.property.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      location: { include: { location: true, zone: true } },
      _count: { select: { variants: true, bookings: { where: { deletedAt: null } } } },
    },
  })
  const ownerIds = Array.from(new Set(properties.map((p) => p.ownerId)))
  const owners = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const ownerById = new Map(owners.map((o) => [o.id, o]))
  return properties.map((p) => ({
    ...p,
    // Owner may be null if the user row was deleted — the page renders "—" in that case
    owner: ownerById.get(p.ownerId) ?? null,
  }))
}

export default async function Page() {
  const properties = await loadProperties()

  return (
    <div>
      <PageHeader
        icon="home"
        title="รายการที่พัก"
        subtitle={`ที่พักทั้งหมดในระบบ — ${properties.length} หลังล่าสุด`}
      />

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          ยังไม่มีที่พักในระบบ — ให้เจ้าของเข้าระบบ <code>own.</code> เพื่อเพิ่มที่พัก
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="hidden grid-cols-12 gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 md:grid">
            <div className="col-span-4">ที่พัก</div>
            <div className="col-span-3">เจ้าของ</div>
            <div className="col-span-2">โลเคชัน</div>
            <div className="col-span-1 text-center">Variant</div>
            <div className="col-span-1 text-center">จอง</div>
            <div className="col-span-1 text-right">สถานะ</div>
          </div>

          <ul className="divide-y divide-gray-100">
            {properties.map((p) => {
              const name = (p.name as { th?: string })?.th ?? p.code
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 transition-colors hover:bg-gray-50 md:grid-cols-12 md:items-center md:gap-3"
                >
                  <div className="md:col-span-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <Icon name="home" className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{name}</div>
                        <div className="text-[11px] text-gray-500">
                          {p.code} · {p.totalBedrooms} นอน · {p.totalBathrooms} น้ำ
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 md:col-span-3">
                    {p.owner ? (
                      <>
                        <div className="truncate">{p.owner.name ?? '—'}</div>
                        <div className="truncate text-[11px] text-gray-400">{p.owner.email}</div>
                      </>
                    ) : (
                      <div className="truncate text-[11px] italic text-amber-600" title={`ownerId: ${p.ownerId}`}>
                        — เจ้าของถูกลบ —
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 md:col-span-2">
                    {p.location?.location.name ?? '—'}
                    {p.location?.zone && (
                      <div className="text-[11px] text-gray-400">{p.location.zone.name}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 md:col-span-1 md:text-center">
                    {p._count.variants}
                  </div>
                  <div className="text-sm text-gray-700 md:col-span-1 md:text-center">
                    {p._count.bookings}
                  </div>
                  <div className="md:col-span-1 md:text-right">
                    {p.isActive ? (
                      <Badge variant="brand" dot>
                        เปิดขาย
                      </Badge>
                    ) : (
                      <Badge variant="default" dot>
                        ปิด
                      </Badge>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
