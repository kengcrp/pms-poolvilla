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
}

/**
 * Property header used at the top of Layout 2/3 cards on both ปฏิทิน and ปรับราคา pages.
 * Shows landscape cover + name + code/bedroom/bathroom info pills.
 */
export function PropertyHeaderRow({ property, name, cover, actions }: Props) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-gray-300">
            <Icon name="home" className="size-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl font-bold tracking-tight text-gray-900">{name}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
            {property.code}
          </code>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-0.5 ring-1 ring-inset ring-gray-200">
            <Icon name="bed" className="size-3.5 text-gray-500" />
            <span className="font-medium tabular-nums">{property.totalBedrooms}</span>
            <span className="text-xs text-gray-500">ห้องนอน</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-0.5 ring-1 ring-inset ring-gray-200">
            <Icon name="bath" className="size-3.5 text-gray-500" />
            <span className="font-medium tabular-nums">{property.totalBathrooms}</span>
            <span className="text-xs text-gray-500">ห้องน้ำ</span>
          </span>
        </div>
      </div>
      {actions && <div className="ml-auto shrink-0">{actions}</div>}
    </div>
  )
}
