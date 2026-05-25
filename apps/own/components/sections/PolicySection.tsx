'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Input, Label, Select, Textarea } from '@pms/ui'

/** Hourly time slots 00:00 — 23:00 for the check-in/out dropdowns. */
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

interface Props {
  propertyId: string
}

const defaultForm = {
  checkinStart: '14:00',
  checkinEnd: '18:00',
  checkout: '11:00',
  deposit: 0,
  cancellationPolicyTh: '',
  postponePolicyTh: '',
  houseRulesTh: '',
  maxGuests: 10,
  extraAdultPrice: 0,
  freeChildAgeUnder7: 0,
  extraChildPrice: 0,
  freeInfantAgeUnder2: 0,
  maxPets: 0,
  extraPetPrice: 0,
}

export function PolicySection({ propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const p = property?.policy
    if (p) {
      const cancel = (p.cancellationPolicy as { th?: string } | null)?.th ?? ''
      const postpone = (p.postponePolicy as { th?: string } | null)?.th ?? ''
      const house = (p.houseRules as { th?: string } | null)?.th ?? ''
      setForm({
        checkinStart: p.checkinStart,
        checkinEnd: p.checkinEnd ?? '',
        checkout: p.checkout,
        deposit: Number(p.deposit),
        cancellationPolicyTh: cancel,
        postponePolicyTh: postpone,
        houseRulesTh: house,
        maxGuests: p.maxGuests,
        extraAdultPrice: Number(p.extraAdultPrice),
        freeChildAgeUnder7: p.freeChildAgeUnder7,
        extraChildPrice: Number(p.extraChildPrice),
        freeInfantAgeUnder2: p.freeInfantAgeUnder2,
        maxPets: p.maxPets,
        extraPetPrice: Number(p.extraPetPrice),
      })
      return
    }
    // No saved policy yet — try to pre-fill from the scraped-listing data captured
    // on the residential/listings wizard step (pasted URL). This lets check-in/out
    // times flow from the scrape into the form so the owner only needs to confirm.
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem('pms.newListing.scraped')
      if (!raw) return
      const s = JSON.parse(raw) as { checkinTime?: string | null; checkoutTime?: string | null }
      if (s.checkinTime || s.checkoutTime) {
        setForm((prev) => ({
          ...prev,
          checkinStart: s.checkinTime ?? prev.checkinStart,
          checkout: s.checkoutTime ?? prev.checkout,
        }))
      }
    } catch {
      /* malformed — ignore */
    }
  }, [property?.policy])

  const upsert = trpc.propertyExtras.upsertPolicy.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      setSavedAt(new Date())
      setSaving(false)
    },
    onError: (e) => {
      setError(e.message)
      setSaving(false)
    },
  })

  function handleSave() {
    setError(null)
    setSaving(true)
    upsert.mutate({
      propertyId,
      checkinStart: form.checkinStart,
      checkinEnd: form.checkinEnd || null,
      checkout: form.checkout,
      deposit: form.deposit,
      cancellationPolicyTh: form.cancellationPolicyTh,
      postponePolicyTh: form.postponePolicyTh,
      houseRulesTh: form.houseRulesTh,
      maxGuests: form.maxGuests,
      extraAdultPrice: form.extraAdultPrice,
      freeChildAgeUnder7: form.freeChildAgeUnder7,
      extraChildPrice: form.extraChildPrice,
      freeInfantAgeUnder2: form.freeInfantAgeUnder2,
      maxPets: form.maxPets,
      extraPetPrice: form.extraPetPrice,
    })
  }

  return (
    <div className="space-y-3">
      {/* Card 1: check-in/out times — dropdown style with sub-groups */}
      <PolicyCard title="เวลาเช็คอินและเช็คเอาท์" desc="กำหนดช่วงเวลาที่แขกเข้าพัก-ออกจากที่พัก">
        {/* Sub-group: ช่วงเวลาเช็คอิน */}
        <div>
          <div className="mb-2 text-sm font-bold text-gray-900">ช่วงเวลาเช็คอิน</div>
          <div className="space-y-3">
            <div>
              <Label required>เวลาเริ่มต้น</Label>
              <Select
                value={form.checkinStart}
                onChange={(e) => setForm({ ...form, checkinStart: e.target.value })}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>เวลาสิ้นสุด</Label>
              <Select
                value={form.checkinEnd || ''}
                onChange={(e) => setForm({ ...form, checkinEnd: e.target.value })}
              >
                <option value="">— ไม่ระบุ —</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Sub-group: เวลาเช็คเอาท์ */}
        <div>
          <div className="mb-2 text-sm font-bold text-gray-900">เวลาเช็คเอาท์</div>
          <div>
            <Label required>เลือกเวลา</Label>
            <Select
              value={form.checkout}
              onChange={(e) => setForm({ ...form, checkout: e.target.value })}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </PolicyCard>

      {/* Card 2: deposit */}
      <PolicyCard title="เงินมัดจำ / ประกันความเสียหาย" desc="จำนวนเงินที่แขกต้องวางมัดจำตอนเช็คอิน">
        <div>
          <Label required>จำนวนเงิน (฿)</Label>
          <Input
            type="number"
            min={0}
            step="100"
            value={form.deposit}
            onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
          />
        </div>
      </PolicyCard>

      {/* Card 3: policies */}
      <PolicyCard title="นโยบาย" desc="กฎการยกเลิก เลื่อนวันเข้าพัก และกฎบ้านเพิ่มเติม">
        <div>
          <Label required>นโยบายการยกเลิก</Label>
          <Textarea
            rows={4}
            value={form.cancellationPolicyTh}
            onChange={(e) => setForm({ ...form, cancellationPolicyTh: e.target.value })}
            placeholder="เช่น ยกเลิกล่วงหน้า 7 วัน คืน 100%, น้อยกว่า 3 วัน ไม่คืนเงิน"
          />
        </div>
        <div>
          <Label required>นโยบายการเลื่อนวันเข้าพัก</Label>
          <Textarea
            rows={3}
            value={form.postponePolicyTh}
            onChange={(e) => setForm({ ...form, postponePolicyTh: e.target.value })}
            placeholder="เช่น เลื่อนได้ภายใน 30 วัน"
          />
        </div>
        <div>
          <Label>กฎบ้านเพิ่มเติม</Label>
          <Textarea
            rows={3}
            value={form.houseRulesTh}
            onChange={(e) => setForm({ ...form, houseRulesTh: e.target.value })}
            placeholder="เช่น งดเสียงดังหลัง 22:00, ห้ามจุดประทัด"
          />
          <p className="mt-1 text-[11px] text-gray-500">ไม่บังคับ</p>
        </div>
      </PolicyCard>

      {/* Extra-guest + pet policy cards removed — they live on the dedicated
          "เสริมคนเข้าพัก" wizard step (/policies) and the amenities pet popup.
          We still send the underlying fields in the upsert payload (kept in form
          state) so the API schema stays satisfied without forcing the owner to
          duplicate input here. */}

      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500">
          {savedAt && `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกนโยบาย'}
        </Button>
      </div>
    </div>
  )
}

/** Card wrapper for grouped fields inside PolicySection. */
function PolicyCard({
  title,
  desc,
  optional,
  children,
}: {
  title: string
  desc: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <div className="text-sm font-bold text-gray-900">{title}</div>
          {optional && <span className="text-xs text-gray-400">(ไม่บังคับ)</span>}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">{desc}</div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  )
}
