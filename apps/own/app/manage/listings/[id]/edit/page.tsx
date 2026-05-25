'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, cn, type IconName } from '@pms/ui'
import { LocationSection } from '@/components/sections/LocationSection'
import { AmenitySection } from '@/components/sections/AmenitySection'
import { IcalSyncSection } from '@/components/sections/IcalSyncSection'
import { PolicySection } from '@/components/sections/PolicySection'
import { ImagesSection } from '@/components/sections/ImagesSection'

const reviewStatusLabel: Record<
  string,
  { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }
> = {
  PENDING: { label: 'รอการตรวจสอบ', variant: 'pending' },
  ACTIVE: { label: 'เปิดใช้งาน', variant: 'success' },
  INACTIVE: { label: 'ปิดใช้งาน', variant: 'default' },
  REJECTED: { label: 'ปฏิเสธ', variant: 'danger' },
}

/** Friendly Thai labels for image categories (matches the photos wizard step). */
const CATEGORY_LABELS: Record<string, string> = {
  living: 'ห้องนั่งเล่น',
  kitchen: 'ห้องครัว',
  bedroom: 'ห้องนอน',
  bathroom: 'ห้องน้ำ',
  pool: 'สระว่ายน้ำ',
  rooftop: 'ดาดฟ้า',
  outdoor: 'ลานกลางแจ้ง',
}

/** Maps amenity codes → Icon names so the sidebar can render proper icons next to
 *  each item (instead of generic bullets). Codes not listed here fall back to null. */
const AMENITY_ICONS: Record<string, IconName> = {
  wifi: 'wifi',
  tv: 'tv',
  kitchen: 'kitchen',
  washer: 'shirt',
  dryer: 'wind',
  parking: 'parking',
  ac: 'ac',
  workspace: 'briefcase',
  shower: 'shower',
  karaoke: 'microphone',
  smart_tv: 'tv',
  pool: 'swimmer',
  hot_tub: 'hotTub',
  yard: 'tree',
  bbq: 'fire',
  outdoor_dining: 'glassWater',
  fire_pit: 'fire',
  pool_table: 'pingPong',
  table_tennis: 'pingPong',
  snooker: 'pingPong',
  foosball: 'ball',
  arcade: 'gamepad',
  fireplace: 'fire',
  piano: 'music',
  gym: 'dumbbell',
  sauna: 'spa',
  lake_access: 'water',
  beach_access: 'beach',
  waterfall_access: 'water',
  river_access: 'water',
  pet_friendly: 'pet',
  smoke_alarm: 'alert',
  co_alarm: 'alert',
  fire_ext: 'fireExt',
  first_aid: 'shelter',
  security_camera: 'eye',
  lock: 'lock',
}

type TabKey = 'listing' | 'guest-info'

/** Which editor pane shows on the right side. 'photos' is the default landing view. */
type EditorKey =
  | 'photos'
  | 'name'
  | 'type'
  | 'description'
  | 'guests'
  | 'amenities'
  | 'area'
  | 'ical'
  | 'rules'
  | 'safety'
  | 'cancellation'
  | 'house-rules'
  | 'custom-links'

/**
 * Edit-listing — 2-column master-detail. Left sidebar lists every property
 * attribute as a card; clicking one swaps the right pane to its editor.
 * Default right view is the photo gallery preview ("ทัวร์รูปบ้าน").
 */
export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<TabKey>('listing')
  const [selected, setSelected] = useState<EditorKey>('photos')
  /** When true on the photos editor: hide the left sidebar so the gallery
   *  expands to full width — the owner can focus on adding/deleting photos
   *  without the side panel narrowing the photo bar. */
  const [photoFocus, setPhotoFocus] = useState(false)
  /** Category drill-down inside the photo focus mode. null = full gallery view;
   *  a category code (e.g. "bathroom") = right pane filters to that category. */
  const [photoCategory, setPhotoCategory] = useState<string | null>(null)
  // Leaving the photos tab automatically exits focus mode.
  useEffect(() => {
    if (selected !== 'photos' && photoFocus) {
      setPhotoFocus(false)
      setPhotoCategory(null)
    }
  }, [selected, photoFocus])

  const { data: property, isPending, error } = trpc.property.byId.useQuery({ id })
  const toggleActive = trpc.property.toggleActive.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id }),
  })
  const remove = trpc.property.delete.useMutation({
    onSuccess: () => {
      router.push('/manage/listings')
      router.refresh()
    },
  })

  if (isPending) {
    return <div className="text-sm text-gray-500">กำลังโหลด...</div>
  }
  if (error || !property) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
        ไม่พบที่พัก
      </div>
    )
  }

  const status = reviewStatusLabel[property.reviewStatus] ?? reviewStatusLabel.PENDING!
  const nameTh = (property.name as { th?: string })?.th ?? '—'
  const totalBeds = property.variants.reduce((s, v) => s + v.bedrooms, 0) || property.totalBedrooms
  const maxGuests = property.variants[0]?.maxGuests ?? 0
  const description = property.contactInfo ?? ''

  return (
    <div className="pb-12">
      <Link
        href="/manage/listings"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        กลับไปลิสติ้งที่พัก
      </Link>

      <div
        className={cn(
          'grid grid-cols-1 gap-6 lg:items-start',
          // Photo focus mode shrinks the left rail to a narrow filmstrip
          // showing thumbnails of every photo — the gallery preview takes the
          // remaining width on the right.
          photoFocus ? 'lg:grid-cols-[120px_1fr]' : 'lg:grid-cols-[360px_1fr]',
        )}
      >
        {/* ─── LEFT SIDEBAR — edit cards. Scrolls independently on desktop:
            sticky to top + own scroll container so long card lists don't push
            the right pane down. On mobile/tablet, falls back to normal flow.
            When photoFocus is on we render a thumbnail filmstrip instead of
            the editor cards. */}
        <aside
          className={cn(
            'space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2',
          )}
        >
          {photoFocus ? (
            <PhotoFilmstrip
              images={property.images}
              selectedCategory={photoCategory}
              onSelectCategory={setPhotoCategory}
              onExit={() => {
                setPhotoFocus(false)
                setPhotoCategory(null)
              }}
            />
          ) : null}
          <div className={cn(photoFocus && 'hidden')}>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-gray-900">เครื่องมือแก้ไขลิสติ้ง</h1>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>

          {tab === 'listing' ? (
            <>
              <PhotoTourCard
                active={selected === 'photos'}
                onClick={() => setSelected('photos')}
                summary={`${property.totalBedrooms} ห้องนอน · ${totalBeds} เตียง · ${property.totalBathrooms} ห้องน้ำ`}
                coverUrl={
                  property.images.find((img) => img.type === 'cover')?.url ??
                  property.images[0]?.url ??
                  null
                }
                photoCount={property.images.length}
              />

              <SelectableCard
                active={selected === 'name'}
                onClick={() => setSelected('name')}
                label="ชื่อ"
                value={nameTh}
              />

              <SelectableCard
                active={selected === 'type'}
                onClick={() => setSelected('type')}
                label="รูปแบบสถานที่พัก"
                value={property.type}
                sub="ที่พักทั้งหลัง"
              />

              <SelectableListCard
                active={selected === 'amenities'}
                onClick={() => setSelected('amenities')}
                label="สิ่งอำนวยความสะดวก"
                items={property.amenities.map((a) => ({
                  code: a.amenity.code,
                  label: a.amenity.nameTh,
                  icon: AMENITY_ICONS[a.amenity.code] ?? null,
                }))}
              />

              <SelectableCard
                active={selected === 'ical'}
                onClick={() => setSelected('ical')}
                label="ปฏิทิน OTA (iCal)"
                value={
                  property.icals.filter((i) => !!i.icalUrl).length > 0
                    ? `${property.icals.filter((i) => !!i.icalUrl).length} ช่องเปิดอยู่`
                    : 'ยังไม่ได้เชื่อม'
                }
              />

              <SelectableCard
                active={selected === 'rules'}
                onClick={() => setSelected('rules')}
                label="การตั้งค่าการจอง"
                value="เกสต์ต้องอ่านและตกลงตามที่คุณอนุญาต"
                multiline
              />

              <SelectableCard
                active={selected === 'house-rules'}
                onClick={() => setSelected('house-rules')}
                label="กฎของที่พัก"
                value={
                  property.policy
                    ? `เช็คอินหลัง ${property.policy.checkinStart} · เช็คเอาท์ก่อน ${property.policy.checkout}`
                    : 'ยังไม่ได้กรอก'
                }
                multiline
              />

              <SelectableCard
                active={selected === 'safety'}
                onClick={() => setSelected('safety')}
                label="ความปลอดภัยของผู้เข้าพัก"
                value={`${property.amenities.filter((a) => ['smoke_alarm', 'co_alarm', 'fire_ext', 'first_aid', 'security_camera', 'lock'].includes(a.amenity.code)).length} รายการ`}
              />

              <SelectableCard
                active={selected === 'cancellation'}
                onClick={() => setSelected('cancellation')}
                label="นโยบายยกเลิกการจอง"
                value={
                  (property.policy?.cancellationPolicy as { th?: string } | null)?.th ||
                  'ยังไม่ได้กรอก'
                }
                multiline
              />

              <SelectableCard
                active={selected === 'custom-links'}
                onClick={() => setSelected('custom-links')}
                label="ลิงก์ที่กำหนดเอง"
                value="เพิ่มรายละเอียด"
              />

              <SelectableCard
                active={selected === 'description'}
                onClick={() => setSelected('description')}
                label="คำบรรยาย"
                value={description || 'ยังไม่ได้กรอก'}
                multiline
              />

              <SelectableCard
                active={selected === 'area'}
                onClick={() => setSelected('area')}
                label="สถานที่"
                value={
                  property.location ? property.location.address.slice(0, 60) : 'ยังไม่ได้กรอก'
                }
                multiline
              />

              <div className="pt-4">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm(`ลบ "${nameTh}" ออกจากระบบ?`)) remove.mutate({ id })
                  }}
                  disabled={remove.isPending}
                  className="w-full"
                >
                  <Icon name="trash" className="size-3.5" />
                  ลบที่พักนี้
                </Button>
              </div>
            </>
          ) : (
            <GuestInfoTab
              propertyId={id}
              policy={property.policy}
              cancellationText={
                (property.policy?.cancellationPolicy as { th?: string } | null)?.th ?? ''
              }
            />
          )}
          </div>
        </aside>

        {/* ─── RIGHT MAIN — selected editor ─────────────────────────── */}
        <main>
          <EditorPane
            propertyId={id}
            selected={selected}
            property={property}
            nameTh={nameTh}
            description={description}
            maxGuests={maxGuests}
            photoFocus={photoFocus}
            onPhotoFocusChange={setPhotoFocus}
            photoCategory={photoCategory}
            onPhotoCategoryChange={setPhotoCategory}
          />
        </main>
      </div>
    </div>
  )
}

// ─── Sidebar primitives ───────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
      )}
    >
      {children}
    </button>
  )
}

function ActionCard({
  title,
  description,
  onClick,
  disabled,
}: {
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all',
        !disabled && 'hover:border-brand-300 hover:shadow-md',
        disabled && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          {title}
          <Icon name="chevronRight" className="size-3.5 text-gray-400" />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p>
      </div>
    </button>
  )
}

/** Card that opens its editor in the right pane (button, not link). */
function SelectableCard({
  active,
  onClick,
  label,
  value,
  sub,
  multiline,
}: {
  active: boolean
  onClick: () => void
  label: string
  value: string
  sub?: string
  multiline?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all',
        active
          ? 'border-brand-500 ring-2 ring-brand-100'
          : 'border-gray-200 hover:border-brand-300 hover:shadow-md',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div>
        <div
          className={cn(
            'mt-1 text-sm text-gray-900',
            !multiline && 'truncate font-medium',
            multiline && 'line-clamp-3 leading-relaxed',
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
      </div>
      <Icon
        name="chevronRight"
        className={cn(
          'size-4 shrink-0 self-center',
          active ? 'text-brand-600' : 'text-gray-300 group-hover:text-brand-600',
        )}
      />
    </button>
  )
}

/** Card that navigates to an external page (uses Link). For things like the
 *  pricing / calendar pages that have their own full-page UX. */
function SelectableLinkCard({
  href,
  label,
  value,
  sub,
}: {
  href: string
  label: string
  value: string
  sub?: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div>
        <div className="mt-1 truncate text-sm font-medium text-gray-900">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
      </div>
      <Icon name="external" className="size-3.5 shrink-0 self-center text-gray-400" />
    </Link>
  )
}

/** Hero card for the photo-tour section. Shows a cover image with a "N รูป"
 *  badge so the owner can see at a glance how many photos exist. Click → opens
 *  the gallery preview on the right pane. */
function PhotoTourCard({
  active,
  onClick,
  summary,
  coverUrl,
  photoCount,
}: {
  active: boolean
  onClick: () => void
  summary: string
  coverUrl: string | null
  photoCount: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group block w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all',
        active
          ? 'border-brand-500 ring-2 ring-brand-100'
          : 'border-gray-200 hover:border-brand-300 hover:shadow-md',
      )}
    >
      <div className="space-y-1.5 px-4 pt-4">
        <div className="text-sm font-bold text-gray-900">รูปพรีวิว</div>
        <div className="text-xs text-gray-500">{summary}</div>
      </div>
      {/* Cover image with photo-count badge — empty state is a dashed placeholder */}
      <div className="mt-3 px-4 pb-4">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={coverUrl} alt="รูปพรีวิว" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-gray-300">
              <Icon name="image" className="size-10" />
            </div>
          )}
          {/* Photo count badge — small pill, top center, white background with text */}
          {photoCount > 0 && (
            <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-900 shadow-sm backdrop-blur">
              {photoCount} รูป
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

/** Card with a small list of items (icon + label per row) as its value.
 *  Used for amenity-style sections where a count alone isn't informative. */
function SelectableListCard({
  active,
  onClick,
  label,
  items,
  emptyText = 'ยังไม่ได้เลือก',
  maxVisible = 3,
}: {
  active: boolean
  onClick: () => void
  label: string
  items: { code: string; label: string; icon: IconName | null }[]
  emptyText?: string
  maxVisible?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all',
        active
          ? 'border-brand-500 ring-2 ring-brand-100'
          : 'border-gray-200 hover:border-brand-300 hover:shadow-md',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </div>
          <Icon
            name="chevronRight"
            className={cn(
              'size-3.5 shrink-0',
              active ? 'text-brand-600' : 'text-gray-300 group-hover:text-brand-600',
            )}
          />
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-gray-400">{emptyText}</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-gray-800">
            {items.slice(0, maxVisible).map((item) => (
              <li key={item.code} className="flex items-center gap-2">
                {item.icon ? (
                  <Icon name={item.icon} className="size-3.5 shrink-0 text-gray-500" />
                ) : (
                  <span
                    className="mt-0.5 size-1.5 shrink-0 rounded-full bg-gray-400"
                    aria-hidden
                  />
                )}
                <span className="truncate">{item.label}</span>
              </li>
            ))}
            {items.length > maxVisible && (
              <li className="pt-0.5 text-xs text-gray-500">
                และอีก {items.length - maxVisible} รายการ
              </li>
            )}
          </ul>
        )}
      </div>
    </button>
  )
}

/** Tab 2: guest-info cards — high-level summary of things the guest needs to
 *  know on arrival. Each card opens the relevant wizard step on the right pane
 *  (where applicable) or shows a placeholder for sections still being built. */
function GuestInfoTab({
  propertyId,
  policy,
  cancellationText,
}: {
  propertyId: string
  policy: { checkinStart: string; checkout: string } | null
  cancellationText: string
}) {
  const cancelSummary = cancellationText.split(/\r?\n/).map((l) => l.trim()).find(Boolean)
  return (
    <>
      {/* Card: check-in / check-out summary */}
      <Link
        href={`/manage/listings/${propertyId}/rules`}
        className="group flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900">เช็คอิน / เช็คเอาท์</div>
          {policy ? (
            <div className="mt-1 text-xs text-gray-600">
              เวลา <span className="font-medium text-gray-800">{policy.checkinStart}</span>
              {' — '}
              <span className="font-medium text-gray-800">{policy.checkout}</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-400">ยังไม่ได้กรอก</div>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-brand-700">เลื่อนเวลา</span>
      </Link>

      {/* Card: cancellation policy preview */}
      <Link
        href={`/manage/listings/${propertyId}/rules`}
        className="group block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
      >
        <div className="text-sm font-bold text-gray-900">นโยบาย</div>
        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">
          {cancelSummary || 'ยังไม่ได้กรอก — แตะเพื่อเพิ่มนโยบายการยกเลิก'}
        </div>
      </Link>

      {/* Placeholder cards — schema fields don't exist yet, so they link to /edit
          for future expansion. Each shows "ยังไม่ได้กรอก" until backed by data. */}
      <GuestPlaceholderCard title="ใบเสร็จ" />
      <GuestPlaceholderCard title="ระบบบ้านส่วนตัว" />
      <GuestPlaceholderCard title="ผู้ดูแล" />

      {/* Card: equipment list (placeholder list) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-bold text-gray-900">อุปกรณ์</div>
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <Icon name="check" className="size-3 text-gray-400" />
            ตัวกรองน้ำ
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="size-3 text-gray-400" />
            เครื่องกรองน้ำ
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="size-3 text-gray-400" />
            ไฟฉาย LED
          </li>
        </ul>
      </div>

      <GuestPlaceholderCard title="ความปลอดภัยและสุขภาพ" />
      <GuestPlaceholderCard
        title="ผู้ดูแล"
        emptyText="ยังไม่ได้กรอก — กรุณาเพิ่มเติมเกี่ยวกับตัวเอง"
      />
      <GuestPlaceholderCard title="ใบทะเบียนพิเศษ" />
    </>
  )
}

function GuestPlaceholderCard({
  title,
  emptyText = 'ยังไม่ได้กรอก',
}: {
  title: string
  emptyText?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-bold text-gray-900">{title}</div>
      <div className="mt-1 text-xs text-gray-400">{emptyText}</div>
    </div>
  )
}

// ─── Right-pane editor router ─────────────────────────────────────────

interface EditorPaneProps {
  propertyId: string
  selected: EditorKey
  // Loose typings since this surface multiplexes many editors; each editor knows
  // exactly which fields it needs.
  property: {
    name: unknown
    contactInfo: string | null
    images: ImageRow[]
    icals: { icalUrl: string }[]
    policy: unknown
    amenities: { amenity: { code: string; nameTh: string } }[]
  }
  nameTh: string
  description: string
  maxGuests: number
  photoFocus: boolean
  onPhotoFocusChange: (next: boolean) => void
  photoCategory: string | null
  onPhotoCategoryChange: (next: string | null) => void
}

function EditorPane({
  propertyId,
  selected,
  property,
  nameTh,
  description,
  maxGuests,
  photoFocus,
  onPhotoFocusChange,
  photoCategory,
  onPhotoCategoryChange,
}: EditorPaneProps) {
  return (
    <div className="min-h-[480px] rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {selected === 'photos' && (
        <PhotoGalleryPreview
          propertyId={propertyId}
          images={property.images}
          nameTh={nameTh}
          photoFocus={photoFocus}
          onPhotoFocusChange={onPhotoFocusChange}
          selectedCategory={photoCategory}
          onSelectCategory={onPhotoCategoryChange}
        />
      )}
      {selected === 'name' && <NameEditor propertyId={propertyId} currentName={nameTh} />}
      {selected === 'type' && <TypeEditor propertyId={propertyId} />}
      {selected === 'description' && (
        <DescriptionEditor propertyId={propertyId} initial={description} />
      )}
      {selected === 'guests' && (
        <GuestCountEditor propertyId={propertyId} initial={maxGuests} />
      )}
      {selected === 'amenities' && (
        <EditorWrapper title="สิ่งอำนวยความสะดวก">
          <AmenitySection propertyId={propertyId} />
        </EditorWrapper>
      )}
      {selected === 'area' && (
        <EditorWrapper title="สถานที่">
          <LocationSection propertyId={propertyId} />
        </EditorWrapper>
      )}
      {selected === 'ical' && (
        <EditorWrapper title="ปฏิทิน OTA (iCal)">
          <IcalSyncSection propertyId={propertyId} />
        </EditorWrapper>
      )}
      {(selected === 'rules' || selected === 'house-rules' || selected === 'cancellation') && (
        <EditorWrapper title="กฎ และนโยบายที่พัก">
          <PolicySection propertyId={propertyId} />
        </EditorWrapper>
      )}
      {selected === 'safety' && (
        <EditorWrapper
          title="ความปลอดภัยของผู้เข้าพัก"
          subtitle="เลือก amenity ที่เกี่ยวข้องกับความปลอดภัย (เครื่องตรวจจับควัน, ถังดับเพลิง ฯลฯ)"
        >
          <AmenitySection propertyId={propertyId} />
        </EditorWrapper>
      )}
      {selected === 'custom-links' && (
        <EditorWrapper title="ลิงก์ที่กำหนดเอง">
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <Icon name="link" className="mx-auto mb-2 size-8 text-gray-300" />
            <div className="text-sm font-medium text-gray-700">ลิงก์ที่กำหนดเอง</div>
            <p className="mt-1 text-xs text-gray-500">
              ฟีเจอร์นี้กำลังพัฒนา — สำหรับใส่ลิงก์ video / virtual tour / partner site
            </p>
          </div>
        </EditorWrapper>
      )}
    </div>
  )
}

function EditorWrapper({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// ─── Inline editors ───────────────────────────────────────────────────

function NameEditor({ propertyId, currentName }: { propertyId: string; currentName: string }) {
  const utils = trpc.useUtils()
  const update = trpc.property.update.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })
  const [nameTh, setNameTh] = useState(currentName === '—' ? '' : currentName)
  const [nameEn, setNameEn] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  useEffect(() => {
    setNameTh(currentName === '—' ? '' : currentName)
  }, [currentName])

  async function save() {
    await update.mutateAsync({
      id: propertyId,
      name: { th: nameTh.trim(), ...(nameEn.trim() && { en: nameEn.trim() }) },
    })
    setSavedAt(new Date())
  }
  return (
    <EditorWrapper title="ชื่อ">
      <div className="max-w-md space-y-4">
        <div>
          <Label required htmlFor="edit-nameTh">
            ชื่อ (ภาษาไทย)
          </Label>
          <Input
            id="edit-nameTh"
            value={nameTh}
            onChange={(e) => setNameTh(e.target.value)}
            placeholder="เช่น พูลวิลล่า สบายใจ"
          />
        </div>
        <div>
          <Label htmlFor="edit-nameEn">ชื่อ (English)</Label>
          <Input
            id="edit-nameEn"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Sunset Pool Villa"
          />
          <p className="mt-1 text-xs text-gray-500">
            ตัวเลือก — แสดงเป็นชื่อสำรองสำหรับลูกค้าต่างชาติ
          </p>
        </div>
        <SaveButton onSave={save} disabled={!nameTh.trim() || update.isPending} savedAt={savedAt} />
      </div>
    </EditorWrapper>
  )
}

function DescriptionEditor({
  propertyId,
  initial,
}: {
  propertyId: string
  initial: string
}) {
  const utils = trpc.useUtils()
  const update = trpc.property.update.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })
  const [text, setText] = useState(initial)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  useEffect(() => setText(initial), [initial])

  async function save() {
    await update.mutateAsync({ id: propertyId, contactInfo: text })
    setSavedAt(new Date())
  }
  return (
    <EditorWrapper title="คำบรรยาย">
      <div className="max-w-2xl space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="บอกเล่าเรื่องราวที่พักของคุณ — สิ่งที่ทำให้พิเศษ, บรรยากาศ, ที่มาของชื่อ..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <SaveButton onSave={save} disabled={update.isPending} savedAt={savedAt} />
      </div>
    </EditorWrapper>
  )
}

function GuestCountEditor({
  propertyId,
  initial,
}: {
  propertyId: string
  initial: number
}) {
  // Note: maxGuests lives on PropertyVariant — would need variant.update.
  // For now we just expose it read-only and link to the policies wizard.
  return (
    <EditorWrapper title="จำนวนเกสต์">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-gray-600">
          จำนวนเกสต์สูงสุดถูกตั้งไว้ที่ <strong>{initial} คน</strong>
        </p>
        <Link
          href={`/manage/listings/${propertyId}/policies`}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          ไปแก้ไขในหน้านโยบายเสริมคนเข้าพัก
          <Icon name="chevronRight" className="size-3.5" />
        </Link>
      </div>
    </EditorWrapper>
  )
}

/** Property-type editor — picks from PropertyTypeMaster (POOL_VILLA / LOFT / BNB / …)
 *  plus auxiliary UI fields (rental mode, listing mode, building/floor counts, size).
 *  Only `type` + `areaSqwa` are persisted today; the rest are kept in local state until
 *  schema fields are added. */
function TypeEditor({ propertyId }: { propertyId: string }) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const { data: types } = trpc.property.types.useQuery()
  const update = trpc.property.update.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })

  // Backed by schema: type + areaSqwa
  const [type, setType] = useState('')
  const [areaSqwa, setAreaSqwa] = useState('')
  // UI-only (no schema field yet — kept local for the layout in the mockup)
  const [subtype, setSubtype] = useState('บ้านเดี่ยว')
  const [rentalMode, setRentalMode] = useState('WHOLE')
  const [listingMode, setListingMode] = useState('WHOLE')
  const [sizeUnit, setSizeUnit] = useState('SQWA')
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!property) return
    setType(property.type)
    setAreaSqwa(property.areaSqwa?.toString() ?? '')
  }, [property])

  async function save() {
    await update.mutateAsync({
      id: propertyId,
      type,
      areaSqwa: areaSqwa ? Number(areaSqwa) : null,
    })
    setSavedAt(new Date())
  }

  return (
    <EditorWrapper title="รูปแบบสถานที่พัก">
      <div className="max-w-xl space-y-4">
        <div>
          <Label required>สถานที่ตรงกับคุณสมบัติของที่พักคุณ</Label>
          <select
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="บ้านเดี่ยว">บ้านเดี่ยว</option>
            <option value="ทาวน์โฮม">ทาวน์โฮม</option>
            <option value="คอนโด">คอนโด</option>
            <option value="วิลล่า">วิลล่า</option>
            <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
          </select>
        </div>

        <div>
          <Label required>รูปแบบการเช่า</Label>
          <select
            value={rentalMode}
            onChange={(e) => setRentalMode(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="WHOLE">ผู้เช่ามาทั้งกลุ่ม</option>
            <option value="ROOM">เช่าเป็นห้อง</option>
          </select>
          <p className="mt-1 text-[11px] text-gray-500">
            ผู้เช่ามาทั้งกลุ่มเดียวกันเช่าที่พักทั้งหมด
          </p>
        </div>

        <div>
          <Label required>รูปแบบที่พัก</Label>
          <select
            value={listingMode}
            onChange={(e) => setListingMode(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="WHOLE">ที่พักทั้งหลัง</option>
            <option value="SHARED">มีพื้นที่แชร์กับผู้อื่น</option>
          </select>
          <p className="mt-1 text-[11px] text-gray-500">
            ที่พักทั้งหลังที่ไม่มีใครเข้าพักรวมในเวลาที่ลูกค้าจอง
          </p>
        </div>

        {/* Size + unit */}
        <div>
          <Label>ขนาดที่ตั้ง</Label>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              type="number"
              min={0}
              value={areaSqwa}
              onChange={(e) => setAreaSqwa(e.target.value)}
              placeholder="0"
            />
            <select
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="SQWA">ตร.วา</option>
              <option value="SQM">ตร.ม.</option>
            </select>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">ขนาดที่ตั้งของทรัพย์สิน</p>
        </div>

        {/* Underlying property type — kept here so the form still updates the DB field */}
        {types && types.length > 0 && (
          <div>
            <Label required>ประเภทที่พัก (PropertyType)</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.nameTh} ({t.code})
                </option>
              ))}
            </select>
          </div>
        )}

        <SaveButton onSave={save} disabled={!type || update.isPending} savedAt={savedAt} />
      </div>
    </EditorWrapper>
  )
}

function SaveButton({
  onSave,
  disabled,
  savedAt,
}: {
  onSave: () => Promise<void>
  disabled?: boolean
  savedAt: Date | null
}) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex items-center justify-between pt-2">
      <div className="text-xs text-gray-500">
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Icon name="success" className="size-3.5" />
            บันทึกแล้ว {savedAt.toLocaleTimeString('th-TH')}
          </span>
        )}
      </div>
      <Button
        type="button"
        onClick={async () => {
          setSaving(true)
          try {
            await onSave()
          } finally {
            setSaving(false)
          }
        }}
        disabled={disabled || saving}
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </Button>
    </div>
  )
}

// ─── Right-pane default — photo gallery preview ──────────────────────

interface ImageRow {
  id: string
  url: string
  type: string
  category: string | null
  sortOrder: number
}

/** Sentinel key used to represent the "preview" group — i.e. photos uploaded
 *  during the new-listing wizard step, which have `category = null`. Treated
 *  as its own category so it can be selected/filtered in the filmstrip. */
const PREVIEW_KEY = '__preview__'

/** Get the display category key for a photo: real category if it has one,
 *  otherwise the PREVIEW_KEY pseudo-category. */
function photoCategoryKey(img: { category: string | null }): string {
  return img.category ?? PREVIEW_KEY
}

/** Human label for a category key, including the preview pseudo-category. */
function categoryLabelOf(key: string): string {
  if (key === PREVIEW_KEY) return 'รูปพรีวิว'
  return CATEGORY_LABELS[key] ?? key
}

/** Narrow vertical thumbnail rail shown on the left when the owner is in photo
 *  focus mode. Replaces the editor cards so all photos stay visible while the
 *  main gallery uses the rest of the width. */
function PhotoFilmstrip({
  images,
  selectedCategory,
  onSelectCategory,
  onExit,
}: {
  images: ImageRow[]
  selectedCategory: string | null
  onSelectCategory: (next: string | null) => void
  onExit: () => void
}) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder)
  // Group photos by category — one tile per group in the filmstrip.
  const groupsMap = new Map<string, ImageRow[]>()
  for (const img of sorted) {
    const key = photoCategoryKey(img)
    const list = groupsMap.get(key) ?? []
    list.push(img)
    groupsMap.set(key, list)
  }
  // Filmstrip shows ONE tile per group (preview included). The
  // currently-selected category gets an active highlight but stays visible so
  // the owner can always see the preview photo even when drilled in.
  const allGroups = Array.from(groupsMap.entries()).map(([key, items]) => ({
    key,
    items,
    label: categoryLabelOf(key),
    cover: items[0]!,
  }))
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onExit}
        className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-brand-400 hover:text-brand-700"
        title="แสดงเครื่องมือแก้ไขลิสติ้ง"
      >
        <Icon name="chevronLeft" className="size-3" />
        ย้อนกลับ
      </button>
      {allGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-[10px] text-gray-400">
          ยังไม่มีรูปภาพ
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allGroups.map((g) => {
            const active = selectedCategory === g.key
            return (
              <button
                type="button"
                key={g.key}
                onClick={() => onSelectCategory(g.key)}
                className={cn(
                  'group relative overflow-hidden rounded-md bg-gray-100 text-left ring-1 transition-all',
                  active
                    ? 'ring-2 ring-brand-500 shadow-md'
                    : 'ring-gray-200 hover:ring-brand-400 hover:shadow-md',
                )}
                title={`ดู ${g.label}`}
              >
                <div className="aspect-square w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.cover.url}
                    alt={g.label}
                    className="size-full object-cover"
                  />
                </div>
                {g.items.length > 1 && (
                  <div className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                    {g.items.length}
                  </div>
                )}
                <div className="truncate px-1.5 py-1 text-[9px] font-medium text-gray-600">
                  {g.label}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PhotoGalleryPreview({
  propertyId,
  images,
  nameTh,
  photoFocus,
  onPhotoFocusChange,
  selectedCategory,
  onSelectCategory,
}: {
  propertyId: string
  images: ImageRow[]
  nameTh: string
  photoFocus: boolean
  onPhotoFocusChange: (next: boolean) => void
  selectedCategory: string | null
  onSelectCategory: (next: string | null) => void
}) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder)
  const [pickerOpen, setPickerOpen] = useState(false)
  /** Pending upload tiles — categories the owner picked but hasn't uploaded a
   *  photo for yet. Each ID is unique (timestamp) so multiple pending tiles of
   *  the same category can coexist. */
  const [pending, setPending] = useState<{ id: string; category: string }[]>([])
  function addPending(category: string) {
    setPending((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, category }])
    setPickerOpen(false)
  }
  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id))
  }
  /** Add a pending tile for the currently-selected category without opening
   *  the category picker — used by the "+" button in the category view. */
  function addPendingForSelected() {
    if (!selectedCategory) return
    addPending(selectedCategory)
  }
  // Opening the picker just opens the modal — picking a category from it adds
  // a pending tile in the gallery without hiding the sidebar. The sidebar only
  // collapses when the owner explicitly drills into a category tile.
  function openPicker() {
    setPickerOpen(true)
  }
  function enterFocus() {
    if (!photoFocus) onPhotoFocusChange(true)
  }

  // ─── Category drill-down view ──────────────────────────────────────
  // When a category is picked from the filmstrip, show ONLY photos of that
  // category here. If none exist yet, show the dashed empty-state with the
  // illustration so the owner can drop a first photo in.
  if (photoFocus && selectedCategory) {
    const isPreview = selectedCategory === PREVIEW_KEY
    const categoryImages = sorted.filter((x) =>
      isPreview ? x.category == null : x.category === selectedCategory,
    )
    const categoryPending = pending.filter((p) => p.category === selectedCategory)
    const label = categoryLabelOf(selectedCategory)
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">{label}</h2>
          <div className="flex items-center gap-2">
            {categoryImages.length > 0 && (
              <button
                type="button"
                onClick={openPicker}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Icon name="edit" className="size-3" />
                จัดการรูป
              </button>
            )}
            <button
              type="button"
              onClick={addPendingForSelected}
              className="inline-flex size-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-brand-400 hover:text-brand-700"
              title={`เพิ่มรูป ${label}`}
              aria-label="เพิ่มรูป"
            >
              <Icon name="plus" className="size-3.5" />
            </button>
          </div>
        </div>

        {categoryImages.length === 0 && categoryPending.length === 0 ? (
          // Empty state — dashed card with illustration + เพิ่มรูป button
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto mb-4 text-6xl">
              {isPreview ? '🖼️' : PHOTO_CATEGORY_META[selectedCategory]?.emoji ?? '🏠'}
            </div>
            <button
              type="button"
              onClick={addPendingForSelected}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              เพิ่มรูป
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {categoryImages.map((img, idx) => {
              const numberedLabel =
                categoryImages.length > 1 ? `${label} ${idx + 1}` : label
              return (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                >
                  <div className="aspect-square w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={numberedLabel}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="truncate px-2 py-1.5 text-[11px] font-medium text-gray-700">
                    {numberedLabel}
                  </div>
                </div>
              )
            })}
            {categoryPending.map((p, idx) => {
              const n = categoryImages.length + idx + 1
              return (
                <PendingUploadTile
                  key={p.id}
                  propertyId={propertyId}
                  category={p.category}
                  indexNumber={n}
                  onUploaded={() => removePending(p.id)}
                  onRemove={() => removePending(p.id)}
                />
              )
            })}
          </div>
        )}

        {pickerOpen && (
          <PhotoCategoryPickerModal
            propertyId={propertyId}
            nameTh={nameTh}
            onClose={() => setPickerOpen(false)}
            onConfirm={addPending}
          />
        )}
      </div>
    )
  }

  // Empty state — no existing photos AND no pending tiles
  if (sorted.length === 0 && pending.length === 0) {
    return (
      <>
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <Icon name="image" className="mx-auto mb-3 size-12 text-gray-300" />
          <div className="text-sm font-semibold text-gray-700">ยังไม่มีรูปภาพ</div>
          <p className="mt-1 text-xs text-gray-500">เพิ่มรูปเพื่อให้ลูกค้าเห็นที่พักของคุณ</p>
          <button
            type="button"
            onClick={openPicker}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Icon name="plus" className="size-3" />
            เพิ่มรูปภาพ
          </button>
        </div>
        {pickerOpen && (
          <PhotoCategoryPickerModal
            propertyId={propertyId}
            nameTh={nameTh}
            onClose={() => setPickerOpen(false)}
            onConfirm={addPending}
          />
        )}
      </>
    )
  }
  // Group photos by category — preview pseudo-category included. Each group
  // becomes ONE tile in the main preview gallery: cover image + label + count
  // badge. Clicking a tile drills into that group's full list on the right.
  const groupsMap = new Map<string, ImageRow[]>()
  for (const img of sorted) {
    const key = photoCategoryKey(img)
    const list = groupsMap.get(key) ?? []
    list.push(img)
    groupsMap.set(key, list)
  }
  const groups = Array.from(groupsMap.entries()).map(([key, items]) => ({
    key,
    items,
    label: categoryLabelOf(key),
    cover: items[0]!,
  }))
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">รูปพรีวิว</h2>
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          <Icon name="edit" className="size-3" />
          จัดการรูปภาพ
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-500">{nameTh} · ตัวอย่างที่ลูกค้าจะเห็น</p>
      <div
        className={cn(
          'grid gap-2',
          // Wider gallery uses more columns when sidebar is hidden so photos
          // get larger tiles instead of stretching ones we already had.
          photoFocus
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        )}
      >
        {groups.map((g) => {
          return (
            <button
              type="button"
              key={g.key}
              onClick={() => {
                enterFocus()
                // Click drills into the group (preview OR real room category).
                onSelectCategory(g.key)
              }}
              className="group relative overflow-hidden rounded-lg bg-gray-100 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400"
              title={`ดู ${g.label} ทั้งหมด`}
            >
              <div className="aspect-square w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.cover.url}
                  alt={g.label}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              {/* Count badge — only when the group has 2+ photos. */}
              {g.items.length > 1 && (
                <div className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur">
                  {g.items.length} รูป
                </div>
              )}
              <div className="truncate px-2 py-1.5 text-[11px] font-medium text-gray-700">
                {g.label}
              </div>
            </button>
          )
        })}

        {/* Pending upload tiles — empty cards owner just added via the category
            picker. Click to open file picker; on upload they convert into real
            photos via addImage mutation. */}
        {pending.map((p) => {
          const existingOfCategory = sorted.filter((x) => x.category === p.category).length
          const pendingBefore = pending
            .slice(0, pending.findIndex((x) => x.id === p.id) + 1)
            .filter((x) => x.category === p.category).length
          const n = existingOfCategory + pendingBefore
          return (
            <PendingUploadTile
              key={p.id}
              propertyId={propertyId}
              category={p.category}
              indexNumber={n}
              onUploaded={() => removePending(p.id)}
              onRemove={() => removePending(p.id)}
            />
          )
        })}
      </div>
      {pickerOpen && (
        <PhotoCategoryPickerModal
          propertyId={propertyId}
          nameTh={nameTh}
          onClose={() => setPickerOpen(false)}
          onConfirm={addPending}
        />
      )}
    </div>
  )
}

/** Empty placeholder tile — owner picks file, we upload via addImage mutation. */
function PendingUploadTile({
  propertyId,
  category,
  indexNumber,
  onUploaded,
  onRemove,
}: {
  propertyId: string
  category: string
  indexNumber: number
  onUploaded: () => void
  onRemove: () => void
}) {
  const utils = trpc.useUtils()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const addImage = trpc.propertyExtras.addImage.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      onUploaded()
    },
    onError: () => setUploading(false),
  })

  const isPreview = category === PREVIEW_KEY
  const categoryLabel = isPreview ? 'รูปพรีวิว' : CATEGORY_LABELS[category] ?? category
  const categoryMeta = isPreview
    ? { emoji: '🖼️', bg: 'bg-gray-100' }
    : PHOTO_CATEGORY_META[category] ?? { emoji: '🏠', bg: 'bg-gray-50' }

  async function pickFile() {
    inputRef.current?.click()
  }
  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result))
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
    // Preview pseudo-category maps to category=null in the DB (wizard photos
    // are stored uncategorised). Real room categories pass through as-is.
    addImage.mutate({
      propertyId,
      url: dataUrl,
      type: 'tour',
      category: isPreview
        ? null
        : (category as 'pool' | 'bedroom' | 'bathroom' | 'living' | 'kitchen' | 'rooftop' | 'outdoor'),
    })
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white">
      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        className="flex aspect-square w-full flex-col items-center justify-center gap-2 transition-colors hover:bg-brand-50/30 disabled:cursor-wait disabled:opacity-60"
      >
        {uploading ? (
          <>
            <span className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span className="text-[11px] font-medium text-gray-600">กำลังอัพโหลด...</span>
          </>
        ) : (
          <>
            <div className={cn('flex size-14 items-center justify-center rounded-full text-2xl', categoryMeta.bg)}>
              {categoryMeta.emoji}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700">
              <Icon name="plus" className="size-3" />
              เพิ่มรูป
            </span>
          </>
        )}
      </button>
      {/* X close button to cancel the pending tile */}
      {!uploading && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-white/90 text-gray-400 opacity-0 shadow-sm transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title="ยกเลิก"
          aria-label="ยกเลิก"
        >
          <Icon name="close" className="size-3" />
        </button>
      )}
      <div className="truncate px-2 py-1.5 text-[11px] font-medium text-gray-700">
        {categoryLabel} {indexNumber}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

/** Visual metadata for each photo category — used by both the picker modal AND
 *  the pending-upload tile so they share the same look. */
const PHOTO_CATEGORY_META: Record<string, { emoji: string; bg: string }> = {
  pool: { emoji: '🏊', bg: 'bg-sky-50' },
  bedroom: { emoji: '🛏', bg: 'bg-amber-50' },
  bathroom: { emoji: '🛁', bg: 'bg-cyan-50' },
  living: { emoji: '🛋', bg: 'bg-orange-50' },
  kitchen: { emoji: '🍳', bg: 'bg-red-50' },
  rooftop: { emoji: '🏙', bg: 'bg-amber-50' },
  outdoor: { emoji: '🏡', bg: 'bg-orange-50' },
}

/** Photo category picker — modal that opens from "จัดการรูปภาพ" / "เพิ่มรูปภาพ".
 *  Owner picks a room category → on confirm, parent adds an empty pending tile
 *  to the gallery (PendingUploadTile) for in-place file upload. */
function PhotoCategoryPickerModal({
  // propertyId kept for future use (e.g., direct upload), but currently unused
  // since the upload happens via PendingUploadTile after this modal closes.
  propertyId: _propertyId,
  nameTh,
  onClose,
  onConfirm,
}: {
  propertyId: string
  nameTh: string
  onClose: () => void
  onConfirm: (category: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  /** Category list — labels paired with the shared visual metadata so the modal
   *  tile and the post-confirm pending tile look consistent. */
  const CATEGORIES = [
    { code: 'pool', label: 'สระว่ายน้ำ' },
    { code: 'bedroom', label: 'ห้องนอน' },
    { code: 'bathroom', label: 'ห้องน้ำ' },
    { code: 'living', label: 'ห้องนั่งเล่น' },
    { code: 'kitchen', label: 'ห้องครัว' },
    { code: 'rooftop', label: 'ดาดฟ้า' },
    { code: 'outdoor', label: 'ภายนอก' },
  ]

  function confirm() {
    if (!selected) return
    onConfirm(selected)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="photo-picker-title" className="text-lg font-bold text-gray-900">
              เพิ่มทัวร์รูปภาพ
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{nameTh}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        {/* Category tiles grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const active = selected === c.code
              const meta = PHOTO_CATEGORY_META[c.code] ?? { emoji: '🏠', bg: 'bg-gray-50' }
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelected(c.code)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border-2 bg-white p-4 transition-all',
                    active
                      ? 'border-brand-500 bg-brand-50/40 shadow-md ring-2 ring-brand-100'
                      : 'border-gray-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm',
                  )}
                  aria-pressed={active}
                >
                  <div
                    className={cn(
                      'flex size-16 items-center justify-center rounded-full text-3xl',
                      meta.bg,
                    )}
                  >
                    {meta.emoji}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      active ? 'text-brand-700' : 'text-gray-800',
                    )}
                  >
                    {c.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            ปิด
          </Button>
          <Button type="button" onClick={confirm} disabled={!selected}>
            ยืนยัน
          </Button>
        </div>
      </div>
    </div>
  )
}

// Used inside EditorPane to ensure ImagesSection is rendered too if needed in future
// (kept here for reference / future expansion)
void ImagesSection
