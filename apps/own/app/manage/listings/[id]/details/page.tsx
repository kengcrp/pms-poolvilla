'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, Icon, Input, cn } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

type Lang = 'th' | 'en' | 'zh'

interface LocalizedItem {
  id: string
  text: Record<Lang, string>
}

const LANGS: { code: Lang; label: string; flag: string; bg: string }[] = [
  { code: 'th', label: 'Th', flag: '🇹🇭', bg: 'bg-blue-500/10' },
  { code: 'en', label: 'En', flag: '🇬🇧', bg: 'bg-indigo-500/10' },
  { code: 'zh', label: 'Ch', flag: '🇨🇳', bg: 'bg-red-500/10' },
]

const STORAGE_KEY = 'pms.newListing.details'

/** Card wrapper for related fields on the details page. */
function DetailsCard({
  title,
  desc,
  required,
  optional,
  children,
}: {
  title: string
  desc: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <div className="text-sm font-bold text-gray-900">
            {title}
            {required && <span className="ml-1 text-red-500">*</span>}
          </div>
          {optional && <span className="text-xs text-gray-400">(ไม่บังคับ)</span>}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">{desc}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/** Localized UI strings per active language — used for placeholder + add-button.
 *  Falls back to TH if a key isn't present for the current language. */
const L10N: Record<Lang, { placeholder: string; addLabel: string }> = {
  th: { placeholder: 'เพิ่มข้อมูล', addLabel: 'เพิ่มข้อมูล' },
  en: { placeholder: 'Add data', addLabel: 'Add data' },
  zh: { placeholder: '添加数据', addLabel: '添加数据' },
}

/** Multi-language repeatable input — one row per item, each with TH/EN/ZH translations
 *  edited via language tabs. (Label removed — wrapper card provides the title.) */
function MultiLangList({
  items,
  onChange,
}: {
  items: LocalizedItem[]
  onChange: (items: LocalizedItem[]) => void
}) {
  const [activeLang, setActiveLang] = useState<Lang>('th')
  const l10n = L10N[activeLang]

  const ensureOne = () => {
    if (items.length === 0) {
      const blank: LocalizedItem = { id: `${Date.now()}`, text: { th: '', en: '', zh: '' } }
      onChange([blank])
    }
  }
  // Make sure there's at least one row to type into
  if (items.length === 0) ensureOne()

  function updateItem(id: string, value: string) {
    onChange(items.map((it) => (it.id === id ? { ...it, text: { ...it.text, [activeLang]: value } } : it)))
  }
  function removeItem(id: string) {
    onChange(items.filter((it) => it.id !== id))
  }
  function addItem() {
    onChange([...items, { id: `${Date.now()}`, text: { th: '', en: '', zh: '' } }])
  }

  return (
    <div>
      {/* Language switcher pills */}
      <div className="mb-2 flex gap-1.5">
        {LANGS.map((l) => {
          const isActive = activeLang === l.code
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActiveLang(l.code)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-brand-500 bg-white text-gray-900 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-brand-300 hover:text-gray-700',
              )}
            >
              <span className={cn('flex size-5 items-center justify-center rounded-full text-xs', l.bg)}>
                {l.flag}
              </span>
              {l.label}
            </button>
          )
        })}
      </div>
      {/* Rows — one Input per item, value bound to currently-active language */}
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2">
            <Input
              value={it.text[activeLang]}
              onChange={(e) => updateItem(it.id, e.target.value)}
              placeholder={l10n.placeholder}
              className="flex-1"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="ลบรายการ"
                aria-label="ลบรายการ"
              >
                <Icon name="trash" className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <Icon name="plus" className="size-3" />
        {l10n.addLabel}
      </button>
    </div>
  )
}

/** Onboarding step 4 of 7 — additional property details (contact, landmarks, shops, info). */
export default function ListingDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [landmarks, setLandmarks] = useState<LocalizedItem[]>([])
  const [shops, setShops] = useState<LocalizedItem[]>([])
  const [extraDetails, setExtraDetails] = useState<LocalizedItem[]>([])

  function handleContinue() {
    // Persist nearby-places lists to sessionStorage. Contact info was moved to /area.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          landmarks: landmarks.filter((it) => it.text.th || it.text.en || it.text.zh),
          shops: shops.filter((it) => it.text.th || it.text.en || it.text.zh),
          extraDetails: extraDetails.filter((it) => it.text.th || it.text.en || it.text.zh),
        }),
      )
    }
    router.push(`/manage/listings/${id}/ical`)
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <Link
        href={`/manage/listings/${id}/area`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        กลับ
      </Link>

      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">
        สถานที่ใกล้เคียง
      </h1>

      <WizardStepper propertyId={id} current={8} />

      {/* Card: landmarks (multi-lang, optional) */}
      <DetailsCard
        title="แลนด์มาร์ค"
        desc="สถานที่สำคัญใกล้ที่พัก — ใส่ได้หลายภาษา"
        optional
      >
        <MultiLangList items={landmarks} onChange={setLandmarks} />
      </DetailsCard>

      {/* Card: shops (multi-lang, optional) */}
      <DetailsCard
        title="ช้อปปิ้งใกล้ที่พัก"
        desc="ร้านค้า ห้างสรรพสินค้า ตลาด — ใส่ได้หลายภาษา"
        optional
      >
        <MultiLangList items={shops} onChange={setShops} />
      </DetailsCard>

      {/* Card: extra details (multi-lang, optional) */}
      <DetailsCard
        title="ข้อมูลที่พัก"
        desc="ข้อมูลเสริมอื่น ๆ — เคล็ดลับสำหรับแขก, สิ่งที่แขกควรรู้"
        optional
      >
        <MultiLangList items={extraDetails} onChange={setExtraDetails} />
      </DetailsCard>

      {/* Sticky footer — wrapper matches ManageShell main's padding so inner
          max-w-5xl aligns with the page cards above. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <Link href={`/manage/listings/${id}/area`}>
              <Button variant="secondary" type="button">
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <Button type="button" onClick={handleContinue}>
              ถัดไป
              <Icon name="chevronRight" className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
