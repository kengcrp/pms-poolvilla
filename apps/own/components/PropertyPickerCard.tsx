'use client'

import { Icon, cn } from '@pms/ui'

interface PickerProperty {
  id: string
  code: string
  name: { th?: string } | unknown
  totalBedrooms: number
  variants: { maxGuests: number; isDefault: boolean }[]
  images: { url: string }[]
}

interface Props {
  properties: PickerProperty[]
  selectedId: string | null
  onSelect: (propertyId: string) => void
}

/**
 * Property picker — stack of horizontal cards (thumbnail + name) used as a sidebar to the
 * LEFT of the price table on Layout 2. Click a card to switch the active property.
 *
 * Design matches the mockup: each row is a tall-enough card with the cover thumbnail on
 * the left and the property name on the right. Selected card is highlighted with a ring.
 */
export function PropertyPickerCard({ properties, selectedId, onSelect }: Props) {
  return (
    <div
      role="listbox"
      aria-label="เลือกที่พัก"
      // Sticky + scrollable so long property lists (15+) don't stretch the page.
      // Max height = viewport minus the top app shell + page padding (~ 200px).
      className="sticky top-4 flex max-h-[calc(100vh-8rem)] w-40 shrink-0 flex-col gap-2 overflow-y-auto pr-1"
    >
      {properties.map((p) => {
        const name = (p.name as { th?: string })?.th ?? p.code
        const cover = p.images[0]?.url
        const defaultVariant = p.variants.find((v) => v.isDefault)
        const guests = defaultVariant?.maxGuests ?? 0
        const isSelected = p.id === selectedId

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            role="option"
            aria-selected={isSelected}
            title={`${name} · ${p.code} · ${guests} ท่าน, ${p.totalBedrooms} ห้องนอน`}
            className={cn(
              'group flex w-full shrink-0 flex-col gap-2 overflow-hidden rounded-xl border bg-white p-1.5 text-left transition-all',
              isSelected
                ? 'border-brand-500 bg-brand-50/40 shadow shadow-brand-600/10 ring-1 ring-brand-500/30'
                : 'border-gray-200 shadow-xs hover:border-brand-300 hover:bg-brand-50/20 hover:shadow-sm',
            )}
          >
            {/* Landscape thumbnail — explicit h-[108px] (4:3 of w-40 inner area ≈ 108px)
                so the image area stays visible even if aspect-ratio + flex parent collide.
                Empty state shows a centered home icon. */}
            <div className="h-[108px] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <Icon name="home" className="size-8" />
                </div>
              )}
            </div>

            {/* Name + check (when selected) — check icon sits AFTER the name to confirm
                the active row at a glance without obscuring the cover image. */}
            <div className="flex items-center gap-1.5 px-1 pb-1 pt-1">
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12.5px] font-semibold leading-tight',
                  isSelected ? 'text-brand-700' : 'text-gray-900',
                )}
              >
                {name}
              </span>
              {isSelected && (
                <Icon name="check" className="size-3.5 shrink-0 text-brand-600" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
