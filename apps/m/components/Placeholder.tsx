import { Icon, type IconName } from '@pms/ui'

interface Props {
  icon?: IconName
  title?: string
  message?: string
  phase?: string
}

export function Placeholder({
  icon = 'toolbox',
  title = 'อยู่ระหว่างพัฒนา',
  message = 'หน้านี้จะพร้อมใช้งานในเฟสถัดไป',
  phase,
}: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="size-6" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">{message}</p>
      {phase && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-200">
          <Icon name="clock" className="size-3" />
          {phase}
        </span>
      )}
    </div>
  )
}
