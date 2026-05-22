'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label, Modal, ModalBody, ModalFooter } from '@pms/ui'

interface LocForm {
  id?: string
  name: string
  province: string
}
interface ZoneForm {
  id?: string
  locationId: string
  name: string
}

export function LocationManager() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.location.list.useQuery()
  const refetch = () => utils.admin.location.list.invalidate()

  const [locOpen, setLocOpen] = useState(false)
  const [locForm, setLocForm] = useState<LocForm>({ name: '', province: '' })
  const [zoneOpen, setZoneOpen] = useState(false)
  const [zoneForm, setZoneForm] = useState<ZoneForm>({ locationId: '', name: '' })

  const createLoc = trpc.admin.location.create.useMutation({
    onSuccess: () => { refetch(); setLocOpen(false) },
    onError: (e) => alert(e.message),
  })
  const updateLoc = trpc.admin.location.update.useMutation({
    onSuccess: () => { refetch(); setLocOpen(false) },
    onError: (e) => alert(e.message),
  })
  const deleteLoc = trpc.admin.location.delete.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })
  const createZone = trpc.admin.location.createZone.useMutation({
    onSuccess: () => { refetch(); setZoneOpen(false) },
    onError: (e) => alert(e.message),
  })
  const updateZone = trpc.admin.location.updateZone.useMutation({
    onSuccess: () => { refetch(); setZoneOpen(false) },
    onError: (e) => alert(e.message),
  })
  const deleteZone = trpc.admin.location.deleteZone.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })

  const locations = data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{locations.length} โลเคชัน</div>
        <Button
          type="button"
          onClick={() => {
            setLocForm({ name: '', province: '' })
            setLocOpen(true)
          }}
        >
          <Icon name="plus" className="size-3.5" />
          เพิ่มโลเคชัน
        </Button>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      <div className="space-y-3">
        {locations.map((loc) => (
          <div key={loc.id} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon name="pin" className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{loc.name}</div>
                  <div className="text-xs text-gray-500">
                    {loc.province} · {loc._count.properties} ที่พัก · {loc.zones.length} โซน
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setZoneForm({ locationId: loc.id, name: '' })
                    setZoneOpen(true)
                  }}
                >
                  <Icon name="plus" className="size-3" />
                  โซน
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="แก้ไข"
                  onClick={() => {
                    setLocForm({ id: loc.id, name: loc.name, province: loc.province })
                    setLocOpen(true)
                  }}
                >
                  <Icon name="edit" className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  title="ลบ"
                  onClick={() => {
                    if (confirm(`ลบโลเคชัน "${loc.name}" ?`)) deleteLoc.mutate({ id: loc.id })
                  }}
                >
                  <Icon name="trash" className="size-3.5" />
                </Button>
              </div>
            </div>

            {loc.zones.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {loc.zones.map((z) => (
                  <span
                    key={z.id}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-sm text-gray-700 ring-1 ring-inset ring-gray-200"
                  >
                    {z.name}
                    <button
                      type="button"
                      title="แก้ไข"
                      className="text-gray-400 hover:text-brand-600"
                      onClick={() => {
                        setZoneForm({ id: z.id, locationId: loc.id, name: z.name })
                        setZoneOpen(true)
                      }}
                    >
                      <Icon name="edit" className="size-3" />
                    </button>
                    <button
                      type="button"
                      title="ลบ"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => {
                        if (confirm(`ลบโซน "${z.name}" ?`)) deleteZone.mutate({ id: z.id })
                      }}
                    >
                      <Icon name="close" className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={locOpen}
        onClose={() => setLocOpen(false)}
        title={locForm.id ? 'แก้ไขโลเคชัน' : 'เพิ่มโลเคชัน'}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (locForm.id) {
              updateLoc.mutate({ id: locForm.id, name: locForm.name, province: locForm.province })
            } else {
              createLoc.mutate({ name: locForm.name, province: locForm.province })
            }
          }}
        >
          <ModalBody className="space-y-4">
            <div>
              <Label required htmlFor="loc-name">ชื่อโลเคชัน</Label>
              <Input
                id="loc-name"
                required
                value={locForm.name}
                onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="loc-province">จังหวัด</Label>
              <Input
                id="loc-province"
                required
                value={locForm.province}
                onChange={(e) => setLocForm({ ...locForm, province: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setLocOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createLoc.isPending || updateLoc.isPending}>
              {locForm.id ? 'บันทึก' : 'สร้าง'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        open={zoneOpen}
        onClose={() => setZoneOpen(false)}
        title={zoneForm.id ? 'แก้ไขโซน' : 'เพิ่มโซน'}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (zoneForm.id) {
              updateZone.mutate({ id: zoneForm.id, name: zoneForm.name })
            } else {
              createZone.mutate({ locationId: zoneForm.locationId, name: zoneForm.name })
            }
          }}
        >
          <ModalBody>
            <Label required htmlFor="zone-name">ชื่อโซน</Label>
            <Input
              id="zone-name"
              required
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setZoneOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createZone.isPending || updateZone.isPending}>
              {zoneForm.id ? 'บันทึก' : 'สร้าง'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
