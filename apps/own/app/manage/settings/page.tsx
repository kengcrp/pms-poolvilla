'use client'

/**
 * ตั้งค่า (general settings hub) — list of self-contained setting cards.
 * Each card either opens an inline action (+ เพิ่ม...) or links to a sub-page.
 * Currently UI-only.
 */

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@pms/ui'

interface SettingRow {
  key: string
  icon: IconName
  title: string
  /** Subtitle shown under the title */
  description: string
  /** "+ เพิ่ม" inline action OR "→ จัดการ" link to a sub-page */
  action:
    | { kind: 'add'; label: string }
    | { kind: 'link'; label: string; href: string }
}

const SETTINGS: SettingRow[] = [
  {
    key: 'booking_logo',
    icon: 'invoice',
    title: 'ตั้งค่าโลโก้ใบจองที่พัก',
    description: 'ไม่มีข้อมูลโลโก้ที่พัก',
    action: { kind: 'add', label: 'เพิ่มโลโก้' },
  },
  {
    key: 'online_channels',
    icon: 'user',
    title: 'ช่องทางออนไลน์',
    description: 'ไม่มีข้อมูลข้อมูลช่องทางออนไลน์',
    action: { kind: 'add', label: 'เพิ่มข้อมูล' },
  },
  {
    key: 'sale_page_theme',
    icon: 'star',
    title: 'ธีม Sale Page',
    description: 'ปรับสี (dark/light) + logo + รูปแบบการแสดงผล',
    action: { kind: 'link', label: 'จัดการ', href: '/manage/settings/theme' },
  },
  {
    key: 'payout_channels',
    icon: 'bank',
    title: 'ช่องทางการรับเงิน',
    description: 'จัดการบัญชีธนาคารที่ใช้รับเงินจากลูกค้า',
    action: { kind: 'link', label: 'จัดการ', href: '/manage/settings/payout-channels' },
  },
]

export default function SettingsPage() {
  const [rows] = useState(SETTINGS)
  /** Which inline action modal is open. Maps to setting row key. */
  const [openModal, setOpenModal] = useState<null | 'booking_logo' | 'online_channels'>(null)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ตั้งค่า</h1>

      <div className="space-y-3">
        {rows.map((r) => (
          <SettingCard
            key={r.key}
            row={r}
            onAdd={() => setOpenModal(r.key as 'booking_logo' | 'online_channels')}
          />
        ))}
      </div>

      {openModal === 'booking_logo' && (
        <BookingLogoModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'online_channels' && (
        <OnlineChannelsModal onClose={() => setOpenModal(null)} />
      )}
    </div>
  )
}

function SettingCard({ row, onAdd }: { row: SettingRow; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {/* Icon — outlined square with rounded corners */}
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700">
          <Icon name={row.icon} className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900 sm:text-base">{row.title}</div>
          <div className="mt-0.5 text-xs text-gray-500">{row.description}</div>
        </div>
      </div>

      <SettingAction action={row.action} onAdd={onAdd} />
    </div>
  )
}

function SettingAction({ action, onAdd }: { action: SettingRow['action']; onAdd: () => void }) {
  const baseCls =
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-300 bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50'

  if (action.kind === 'link') {
    return (
      <Link href={action.href} className={baseCls}>
        {action.label}
        <Icon name="chevronRight" className="size-3.5" />
      </Link>
    )
  }
  return (
    <button type="button" onClick={onAdd} className={baseCls}>
      <Icon name="plus" className="size-3.5" />
      {action.label}
    </button>
  )
}

// ─── Modal: เพิ่มโลโก้ใบจองที่พัก ─────────────────────────────────────

function BookingLogoModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function pickFile() {
    inputRef.current?.click()
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const url = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result))
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
    setPreview(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">เพิ่มโลโก้ใบจองที่พัก</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mb-1 text-sm font-semibold text-gray-900">อัปโหลดรูปโลโก้</div>

        {/* Upload zone — dashed border, click to pick */}
        <button
          type="button"
          onClick={pickFile}
          className="mt-2 flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white py-12 text-sm text-gray-500 transition hover:border-brand-400 hover:bg-brand-50/20"
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="size-24 rounded-lg object-cover ring-1 ring-gray-200" />
              <span className="text-xs text-gray-500">คลิกเพื่อเปลี่ยนรูป</span>
            </>
          ) : (
            <>
              <Icon name="upload" className="size-8 text-brand-600" />
              <span className="font-medium">อัปโหลดรูป</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* Hint */}
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500">
          <Icon name="info" className="size-3" />
          ขนาดแนะนำ : 1,024 x 1,024 px (รองรับเฉพาะไฟล์ .jpg, .png เท่านั้น)
        </p>

        {/* Footer */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: ช่องทางออนไลน์ (เพิ่มข้อมูล) ─────────────────────────────

interface ContactRow {
  name: string
  phone: string
}

function OnlineChannelsModal({ onClose }: { onClose: () => void }) {
  const [facebookName, setFacebookName] = useState('')
  const [facebookLink, setFacebookLink] = useState('')
  const [lineName, setLineName] = useState('')
  const [lineLink, setLineLink] = useState('')
  const [contacts, setContacts] = useState<ContactRow[]>([{ name: '', phone: '' }])

  function addContact() {
    setContacts((arr) => [...arr, { name: '', phone: '' }])
  }
  function updateContact(idx: number, patch: Partial<ContactRow>) {
    setContacts((arr) => arr.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }
  function removeContact(idx: number) {
    setContacts((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">ช่องทางออนไลน์</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              ระบุช่องทางที่ลูกค้าใช้ติดต่อกับคุณได้
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[calc(92vh-9.5rem)] space-y-4 overflow-y-auto px-6 py-5">
          {/* Facebook card */}
          <ChannelCard
            iconName="facebook"
            iconBg="bg-[#1877F2]"
            title="Facebook"
          >
            <ChannelInput
              label="ชื่อเพจ"
              value={facebookName}
              onChange={setFacebookName}
              placeholder="ชื่อเพจ Facebook"
            />
            <ChannelInput
              label="ลิงก์"
              value={facebookLink}
              onChange={setFacebookLink}
              placeholder="https://facebook.com/..."
              prefix={<Icon name="link" className="size-3.5 text-gray-400" />}
            />
          </ChannelCard>

          {/* Line card */}
          <ChannelCard
            iconName="line"
            iconBg="bg-[#06C755]"
            title="Line"
          >
            <ChannelInput
              label="ID Line"
              value={lineName}
              onChange={setLineName}
              placeholder="@your-line-id"
            />
            <ChannelInput
              label="ลิงก์"
              value={lineLink}
              onChange={setLineLink}
              placeholder="https://lin.ee/..."
              prefix={<Icon name="link" className="size-3.5 text-gray-400" />}
            />
          </ChannelCard>

          {/* Phone contacts card */}
          <ChannelCard
            iconName="phone"
            iconBg="bg-brand-600"
            title="เบอร์โทรศัพท์ติดต่อ"
          >
            <div className="space-y-2.5">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <ChannelInput
                      label={i === 0 ? 'ชื่อผู้ติดต่อ' : ''}
                      value={c.name}
                      onChange={(v) => updateContact(i, { name: v })}
                      placeholder="ชื่อ"
                    />
                  </div>
                  <div className="flex-1">
                    <ChannelInput
                      label={i === 0 ? 'เบอร์โทรศัพท์' : ''}
                      value={c.phone}
                      onChange={(v) => updateContact(i, { phone: v })}
                      placeholder="08X-XXX-XXXX"
                      type="tel"
                    />
                  </div>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      aria-label="ลบรายชื่อ"
                      className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addContact}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-dashed border-emerald-400 bg-emerald-50/50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <Icon name="plus" className="size-3.5" />
                เพิ่มผู้ติดต่อ
              </button>
            </div>
          </ChannelCard>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

/** Sectioned card for one channel — icon + title header, slotted body for inputs. */
function ChannelCard({
  iconName,
  iconBg,
  title,
  children,
}: {
  iconName: IconName
  iconBg: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`flex size-8 items-center justify-center rounded-lg text-white ${iconBg}`}>
          <Icon name={iconName} className="size-4" />
        </div>
        <span className="text-sm font-bold text-gray-900">{title}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

/** Labelled input with optional left-side icon prefix. */
function ChannelInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'tel'
  prefix?: React.ReactNode
}) {
  return (
    <div>
      {label && <div className="mb-1 text-[11px] font-medium text-gray-500">{label}</div>}
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {prefix}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 ${
            prefix ? 'pl-9' : 'pl-3'
          }`}
        />
      </div>
    </div>
  )
}
