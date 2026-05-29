'use client'

/**
 * Sale Page Theme settings.
 *
 * 3 sections:
 *  1. sale_page_color_theme — dark + light color pickers
 *  2. display_format — search/listing display style
 *  3. sale_page_logo_settings — round logo with edit button
 *
 * Currently UI-only state. Persistence requires SalePageTheme model (Phase 2).
 */

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@pms/ui'

const PRESET_COLORS = [
  '#ff00b3', '#ec4899', '#f43f5e', '#ef4444', '#f59e0b',
  '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9',
]

export default function ThemeSettingsPage() {
  const [darkColor, setDarkColor] = useState('#ff00b3')
  const [lightColor, setLightColor] = useState('#ffdbed')
  const [logoUrl, setLogoUrl] = useState(
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=200&q=80',
  )
  const [displayFormat, setDisplayFormat] = useState<'storytelling' | 'grid' | 'list'>(
    'storytelling',
  )
  const [editing, setEditing] = useState<null | 'colors' | 'logo'>(null)

  return (
    <div className="space-y-6">
      {/* Back link — returns to the parent ตั้งค่าทั่วไป hub. */}
      <Link
        href="/manage/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="chevronLeft" className="size-4" />
        กลับ
      </Link>

      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ธีม Sale Page</h1>

      {/* ─── Section 1: sale_page_color_theme ─────────────────────────── */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">sale_page_color_theme</h2>
          <button
            type="button"
            onClick={() => setEditing(editing === 'colors' ? null : 'colors')}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Icon name="edit" className="size-3" />
            {editing === 'colors' ? 'done' : 'edit'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="dark_color"
            value={darkColor}
            onChange={setDarkColor}
            editable={editing === 'colors'}
          />
          <ColorField
            label="light_color"
            value={lightColor}
            onChange={setLightColor}
            editable={editing === 'colors'}
          />
        </div>
      </section>

      {/* ─── Section 2: display_format ────────────────────────────────── */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-3 text-base font-bold text-gray-900">display_format</h2>
        <div className="space-y-2">
          <DisplayFormatRow
            value="storytelling"
            label="Storytelling Search"
            description="แสดงเรื่องราว/ภาพใหญ่ + search bar เด่น (default)"
            active={displayFormat === 'storytelling'}
            onSelect={() => setDisplayFormat('storytelling')}
          />
          <DisplayFormatRow
            value="grid"
            label="Grid Cards"
            description="แสดงเป็น grid 3 คอลัมน์ ภาพปก + ราคา"
            active={displayFormat === 'grid'}
            onSelect={() => setDisplayFormat('grid')}
          />
          <DisplayFormatRow
            value="list"
            label="List View"
            description="แสดงเป็นรายการแนวนอน — รูปเล็ก, ราคา, ปุ่มจอง"
            active={displayFormat === 'list'}
            onSelect={() => setDisplayFormat('list')}
          />
        </div>
      </section>

      {/* ─── Section 3: sale_page_logo_settings ───────────────────────── */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-4">
          <Icon name="copy" className="size-5 text-gray-400" />
          <h2 className="flex-1 text-base font-bold text-gray-900">
            sale_page_logo_settings
          </h2>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-20 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="logo" className="size-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">โลโก้ Sale Page</p>
              <p className="text-xs text-gray-500">แสดงในมุมซ้ายบนของ Sale Page</p>
            </div>
          </div>

          <LogoEditButton onPick={(url) => setLogoUrl(url)} />
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          บันทึก
        </button>
      </div>
    </div>
  )
}

// ─── Color field ──────────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
  editable,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
  editable: boolean
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-gray-700">{label}</div>
      <div className="flex items-stretch gap-2">
        {/* Color swatch — opens native color picker when editable */}
        <label
          className="relative flex h-10 min-w-[70px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white shadow-sm transition"
          style={{ backgroundColor: value }}
        >
          <Icon name="image" className="size-3" />
          Color
          {editable && (
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          )}
        </label>

        {/* Hex input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!editable}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700 read-only:bg-gray-100 read-only:text-gray-500 focus:border-brand-400 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Quick presets when editing */}
      {editable && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className="size-6 rounded-md ring-1 ring-gray-200 transition hover:scale-110"
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Display format row ───────────────────────────────────────────────

function DisplayFormatRow({
  value,
  label,
  description,
  active,
  onSelect,
}: {
  value: string
  label: string
  description: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        active
          ? 'flex w-full items-center gap-3 rounded-xl border-2 border-brand-500 bg-brand-50/40 px-4 py-3 text-left transition'
          : 'flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-gray-50'
      }
    >
      <span
        className={
          active
            ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white'
            : 'size-5 shrink-0 rounded-full border-2 border-gray-300'
        }
      >
        {active && <Icon name="check" className="size-2.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          {label}
          <Icon name="info" className="size-3 text-gray-400" />
        </div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </button>
  )
}

// ─── Logo edit button ─────────────────────────────────────────────────

function LogoEditButton({ onPick }: { onPick: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const url = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result))
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
    onPick(url)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
      >
        <Icon name="edit" className="size-3" />
        edit_logo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  )
}
