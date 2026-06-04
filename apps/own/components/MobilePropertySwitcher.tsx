'use client'

/**
 * Mobile-only property selector pill.
 *
 * Shows a card-style trigger at the top of the page (thumbnail + name +
 * capacity + chevron). Tapping opens a dropdown listing every property so
 * the user can switch the focused listing without scrolling through cards.
 *
 * Hidden on desktop (≥ lg) — the multi-column grid handles that case.
 */

import { useEffect, useRef, useState } from 'react'
import { cn, Icon } from '@pms/ui'

export interface SwitcherProperty {
  id: string
  name: string
  code: string
  cover?: string | null
  guests: number
  bedrooms: number
}

interface Props {
  properties: SwitcherProperty[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function MobilePropertySwitcher({ properties, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = properties.find((p) => p.id === selectedId) ?? properties[0]
  if (!selected) return null

  return (
    <div ref={rootRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl bg-white p-3 ring-1 transition-colors',
          open ? 'ring-2 ring-brand-500' : 'ring-gray-200 hover:ring-gray-300',
        )}
      >
        <Thumbnail cover={selected.cover} alt={selected.name} />
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-bold text-gray-900">{selected.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-gray-500">
            {selected.guests} ท่าน, {selected.bedrooms} ห้องนอน
          </div>
        </div>
        <Icon
          name={open ? 'chevronUp' : 'chevronDown'}
          className="size-4 shrink-0 text-gray-400"
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-[50vh] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.15)] ring-1 ring-gray-200">
          {properties.map((p) => {
            const active = p.id === selected.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors',
                  active ? 'bg-brand-50' : 'hover:bg-gray-50',
                )}
              >
                <Thumbnail cover={p.cover} alt={p.name} small />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900">{p.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-gray-500">
                    {p.guests} ท่าน · {p.bedrooms} ห้องนอน
                  </div>
                </div>
                {active && (
                  <Icon name="check" className="size-4 shrink-0 text-brand-600" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Thumbnail({
  cover,
  alt,
  small,
}: {
  cover: string | null | undefined
  alt: string
  small?: boolean
}) {
  const size = small ? 'size-10' : 'size-12'
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-xl bg-gray-100', size)}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-gray-300">
          <Icon name="home" className="size-4" />
        </div>
      )}
    </div>
  )
}
