'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, Icon, Input, cn } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

/**
 * Onboarding policies step — extra-guest pricing (per-person fees, free-children
 * counts). Card-based layout groups related fields visually so the long form
 * scans more naturally.
 *
 * All fields optional — owner can skip ahead. Data persists to sessionStorage.
 */

const GUEST_POLICY_STORAGE_KEY = 'pms.newListing.guestPolicy'

interface GuestPolicy {
  maxGuests: number
  extraAdultPrice: string
  freeKidsUnder7: number
  extraKidPrice: string
  freeInfantsUnder2: number
}

function blankGuestPolicy(): GuestPolicy {
  return {
    maxGuests: 0,
    extraAdultPrice: '',
    freeKidsUnder7: 0,
    extraKidPrice: '',
    freeInfantsUnder2: 0,
  }
}

export default function ListingPoliciesPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [guest, setGuest] = useState<GuestPolicy>(blankGuestPolicy())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const gRaw = sessionStorage.getItem(GUEST_POLICY_STORAGE_KEY)
    if (gRaw) {
      try {
        setGuest({ ...blankGuestPolicy(), ...(JSON.parse(gRaw) as GuestPolicy) })
      } catch {
        /* ignore */
      }
    }
  }, [])

  function updateGuest(patch: Partial<GuestPolicy>) {
    setGuest((prev) => ({ ...prev, ...patch }))
  }

  function persistAndGoto(target: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(GUEST_POLICY_STORAGE_KEY, JSON.stringify(guest))
    }
    router.push(target)
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        href={`/manage/listings/${id}/details`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        ย้อนกลับ
      </Link>

      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">
        กรอกนโยบายเสริมคนเข้าพัก
      </h1>

      <WizardStepper propertyId={id} current={5} />

      {/* ─── Card: capacity ─────────────────────────────────────── */}
      <Card title="ความจุที่พัก" icon="users" desc="จำนวนผู้เข้าพักสูงสุดที่ที่พักนี้รองรับได้">
        <FieldRow label="รองรับสูงสุด" sub="จำนวนแขก">
          <CounterControl
            value={guest.maxGuests}
            onChange={(v) => updateGuest({ maxGuests: v })}
            max={50}
          />
        </FieldRow>
      </Card>

      {/* ─── Card: adult extras ────────────────────────────────── */}
      <Card title="ผู้ใหญ่ (อายุ 7 ปีขึ้นไป)" icon="user" desc="ราคาเสริมต่อท่าน เมื่อเกินจำนวนพื้นฐาน">
        <FieldInput
          label="ราคาเสริมผู้ใหญ่"
          value={guest.extraAdultPrice}
          onChange={(v) => updateGuest({ extraAdultPrice: v })}
          placeholder="เช่น 500"
          suffix="บาท / ท่าน"
        />
      </Card>

      {/* ─── Card: kid extras ──────────────────────────────────── */}
      <Card title="เด็ก (อายุต่ำกว่า 7 ปี)" icon="users" desc="กำหนดจำนวนเด็กที่พักฟรี และราคาเสริมเด็กที่เกิน">
        <FieldRow label="พักฟรี" sub="เด็กอายุต่ำกว่า 7 ปี">
          <CounterControl
            value={guest.freeKidsUnder7}
            onChange={(v) => updateGuest({ freeKidsUnder7: v })}
            max={20}
            unit="ท่าน"
          />
        </FieldRow>
        <FieldInput
          label="ราคาเสริมเด็กที่เกินจำนวนพักฟรี"
          value={guest.extraKidPrice}
          onChange={(v) => updateGuest({ extraKidPrice: v })}
          placeholder="เช่น 200"
          suffix="บาท / ท่าน"
        />
      </Card>

      {/* ─── Card: infant ──────────────────────────────────────── */}
      <Card title="เด็กทารก (อายุต่ำกว่า 2 ปี)" icon="users" desc="จำนวนเด็กทารกที่พักฟรี ไม่นับรวมในความจุที่พัก">
        <FieldRow label="พักฟรี" sub="เด็กทารกอายุต่ำกว่า 2 ปี">
          <CounterControl
            value={guest.freeInfantsUnder2}
            onChange={(v) => updateGuest({ freeInfantsUnder2: v })}
            max={20}
            unit="ท่าน"
          />
        </FieldRow>
      </Card>

      {/* Sticky footer — wrapper matches ManageShell main's padding so the inner
          max-w-3xl aligns horizontally with the page cards above. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href={`/manage/listings/${id}/details`}>
              <Button variant="secondary" type="button">
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => persistAndGoto(`/manage/listings/${id}/amenities`)}
              >
                ข้าม
              </Button>
              <Button
                type="button"
                onClick={() => persistAndGoto(`/manage/listings/${id}/amenities`)}
              >
                ดำเนินการต่อ
                <Icon name="chevronRight" className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Layout primitives ───────────────────────────────────────────────

function Card({
  title,
  icon,
  desc,
  children,
}: {
  title: string
  icon: 'users' | 'user'
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon name={icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900">{title}</div>
          <div className="mt-0.5 text-xs text-gray-500">{desc}</div>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  )
}

function FieldRow({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  suffix?: string
}) {
  const sanitize = (raw: string) => raw.replace(/[^\d]/g, '')
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-800">{label}</label>
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(sanitize(e.target.value))}
          placeholder={placeholder}
          className={cn(suffix && 'pr-24')}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function CounterControl({
  value,
  onChange,
  max,
  unit,
}: {
  value: number
  onChange: (v: number) => void
  max: number
  unit?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        disabled={value <= 0}
        aria-label="ลด"
      >
        <Icon name="minus" className="size-3" />
      </button>
      <div className="flex min-w-[3.25rem] items-center justify-center rounded-md border border-gray-300 px-2 py-1.5 text-base font-semibold text-gray-900">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-9 items-center justify-center rounded-md border border-brand-400 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
        aria-label="เพิ่ม"
      >
        <Icon name="plus" className="size-3" />
      </button>
      {unit && <span className="ml-1 text-xs text-gray-500">{unit}</span>}
    </div>
  )
}
