interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    // Always one row — title on the left, actions on the right (even on mobile)
    // so compact controls like the layout dropdown stay aligned with the title.
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-xs text-gray-600 sm:text-sm">{description}</p>}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
