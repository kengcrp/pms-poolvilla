import { Icon, type IconName } from '@pms/ui'

interface Props {
  icon?: IconName
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ icon, title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon name={icon} className="size-4" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
