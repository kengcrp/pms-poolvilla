'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@pms/ui'
import { LANGS, useLang, useT } from '@/lib/i18n'

/** Circular flag avatar — uses SVG from flagcdn.com, cropped to circle via object-cover */
function FlagAvatar({ countryCode, label, size = 28 }: { countryCode: string; label: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-gray-200"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/${countryCode}.svg`}
        alt={label}
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    </span>
  )
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLang()
  const t = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[1]!

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t('shell.languageSelect')}
        aria-expanded={open}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <FlagAvatar countryCode={current.countryCode} label={current.label} size={22} />
        <Icon name="chevronDown" className={`size-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <ul className="space-y-1.5">
            {LANGS.map((l) => {
              const isActive = l.code === lang
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      setLang(l.code)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                        : 'border-white bg-white text-gray-900 hover:border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <FlagAvatar countryCode={l.countryCode} label={l.label} size={28} />
                    <span className="flex-1 text-left">{l.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
