'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Icon, Input, Label } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

/** sessionStorage key shared with /new/form so the name typed here hydrates
 *  into the basic-info form on the next step. */
const FORM_DRAFT_KEY = 'pms.newListing.formDraft'

/**
 * Step 2 — property name. Owner types TH (required) + optional EN name, then
 * proceeds to step 3 (/new/form) for bedrooms / bathrooms / etc. The chosen
 * property type from step 1 is carried via the ?type= query param.
 */
export default function NewListingNamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetType = searchParams.get('type') ?? ''

  const [nameTh, setNameTh] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate from existing draft (refresh / back-nav keeps the name)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(FORM_DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw) as { form?: { nameTh?: string; nameEn?: string } }
        if (d.form?.nameTh) setNameTh(d.form.nameTh)
        if (d.form?.nameEn) setNameEn(d.form.nameEn)
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  // Auto-save name into the shared draft on every change
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(FORM_DRAFT_KEY)
      const existing = raw ? JSON.parse(raw) : {}
      const nextForm = { ...(existing.form ?? {}), nameTh, nameEn }
      sessionStorage.setItem(
        FORM_DRAFT_KEY,
        JSON.stringify({ ...existing, form: nextForm }),
      )
    } catch {
      /* ignore */
    }
  }, [nameTh, nameEn, hydrated])

  function handleContinue() {
    if (!nameTh.trim()) {
      setError('กรุณาใส่ชื่อที่พัก (ภาษาไทย)')
      return
    }
    setError(null)
    const params = new URLSearchParams()
    if (presetType) params.set('type', presetType)
    const qs = params.toString()
    router.push(`/manage/listings/new/form${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        href="/manage/listings/new"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        กลับไปเลือกประเภท
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          ที่พักคุณชื่ออะไร
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          ตั้งชื่อที่พักของท่าน — สามารถปรับเปลี่ยนได้ภายหลัง
        </p>
      </div>

      <WizardStepper current={2} />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required htmlFor="newName-th">
              ชื่อที่พัก (ภาษาไทย)
            </Label>
            <Input
              id="newName-th"
              value={nameTh}
              onChange={(e) => setNameTh(e.target.value)}
              placeholder="เช่น พูลวิลล่า สบายใจ"
              autoFocus
              autoComplete="off"
              name="pms-listing-name-th"
            />
            {error && (
              <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
            )}
          </div>
          <div>
            <Label htmlFor="newName-en">ชื่อที่พัก (ภาษาอังกฤษ)</Label>
            <Input
              id="newName-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Sunset Pool Villa"
              autoComplete="off"
              name="pms-listing-name-en"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              ตัวเลือก — แสดงให้แขกต่างชาติ
            </p>
          </div>
        </div>
      </div>

      {/* Sticky footer — padding wrapper matches ManageShell main so inner max-w-3xl
          aligns with the page cards above. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href="/manage/listings/new">
              <Button variant="secondary" type="button">
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <Button type="button" onClick={handleContinue}>
              ดำเนินการต่อ
              <Icon name="chevronRight" className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

