import { Icon } from '@pms/ui'

interface Props {
  property: {
    code: string
    totalBedrooms: number
    totalBathrooms: number
    variants: { maxGuests: number; isDefault: boolean }[]
  }
  name: string
  cover?: string
  /** Optional trailing slot — e.g. weekly-rate button on pricing page. */
  actions?: React.ReactNode
  /** Optional slot rendered directly UNDER the cover image (left column). */
  belowImage?: React.ReactNode
  /** Optional slot rendered directly UNDER the property name (right column).
   *  Used by Layout 3 to anchor the ราคาขาย / ราคาส่ง toggle next to the name. */
  belowName?: React.ReactNode
}

/**
 * Property header used at the top of Layout 2/3 cards on both ปฏิทิน and ปรับราคา pages.
 * Shows landscape cover + name + optional slots (below image / below name).
 */
export function PropertyHeaderRow({ property, name, cover, actions, belowImage, belowName }: Props) {
  return (
    <div className="flex items-start gap-6 p-4">
      <div className="shrink-0">
        <div className="h-24 w-40 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-gray-300">
              <Icon name="home" className="size-8" />
            </div>
          )}
        </div>
        {belowImage && <div className="mt-2">{belowImage}</div>}
      </div>
      {/* Name + below-name slot — vertically CENTERED next to the image. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 self-stretch">
        <div className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
          {name}
        </div>
        {belowName && <div>{belowName}</div>}
      </div>
      {actions && <div className="ml-auto shrink-0 self-center">{actions}</div>}
    </div>
  )
}
