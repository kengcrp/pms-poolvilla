'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Input, Label, Textarea } from '@pms/ui'

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
    if (!p) return
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
    <div className="space-y-6">
      {/* Times */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">เวลาเช็คอิน-เช็คเอาท์</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label required>เวลาเช็คอิน</Label>
            <Input
              type="time"
              value={form.checkinStart}
              onChange={(e) => setForm({ ...form, checkinStart: e.target.value })}
            />
          </div>
          <div>
            <Label>สิ้นสุดเวลาเช็คอิน</Label>
            <Input
              type="time"
              value={form.checkinEnd}
              onChange={(e) => setForm({ ...form, checkinEnd: e.target.value })}
            />
          </div>
          <div>
            <Label required>เวลาเช็คเอาท์</Label>
            <Input
              type="time"
              value={form.checkout}
              onChange={(e) => setForm({ ...form, checkout: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Deposit */}
      <div>
        <Label required>เงินมัดจำ/ประกันความเสียหาย (฿)</Label>
        <Input
          type="number"
          min={0}
          step="100"
          value={form.deposit}
          onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
        />
      </div>

      {/* Policies */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">นโยบาย</h4>
        <div className="space-y-4">
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
            <Label>กฎบ้านเพิ่มเติม (ไม่บังคับ)</Label>
            <Textarea
              rows={3}
              value={form.houseRulesTh}
              onChange={(e) => setForm({ ...form, houseRulesTh: e.target.value })}
              placeholder="เช่น งดเสียงดังหลัง 22:00, ห้ามจุดประทัด"
            />
          </div>
        </div>
      </div>

      {/* Extra guest policy */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">นโยบายแขกเพิ่ม</h4>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <Label required>จำนวนสูงสุด (คน)</Label>
            <Input
              type="number"
              min={1}
              value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>ค่าผู้ใหญ่เพิ่ม (฿/คน)</Label>
            <Input
              type="number"
              min={0}
              step="50"
              value={form.extraAdultPrice}
              onChange={(e) => setForm({ ...form, extraAdultPrice: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>เด็กฟรี (อายุน้อยกว่า 7)</Label>
            <Input
              type="number"
              min={0}
              value={form.freeChildAgeUnder7}
              onChange={(e) => setForm({ ...form, freeChildAgeUnder7: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>ค่าเด็กเพิ่ม (฿/คน)</Label>
            <Input
              type="number"
              min={0}
              step="50"
              value={form.extraChildPrice}
              onChange={(e) => setForm({ ...form, extraChildPrice: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>ทารกฟรี (อายุน้อยกว่า 2)</Label>
            <Input
              type="number"
              min={0}
              value={form.freeInfantAgeUnder2}
              onChange={(e) => setForm({ ...form, freeInfantAgeUnder2: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Pet policy */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">นโยบายสัตว์เลี้ยง</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>จำนวนสัตว์ที่อนุญาต</Label>
            <Input
              type="number"
              min={0}
              value={form.maxPets}
              onChange={(e) => setForm({ ...form, maxPets: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>ค่าสัตว์เลี้ยงเพิ่ม (฿/ตัว)</Label>
            <Input
              type="number"
              min={0}
              step="50"
              value={form.extraPetPrice}
              onChange={(e) => setForm({ ...form, extraPetPrice: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
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
