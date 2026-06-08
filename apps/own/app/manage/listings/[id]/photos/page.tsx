'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Modal, ModalBody, cn, type IconName } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

interface PreviewPhoto {
  id: string
  url: string // data URL for preview
  name: string
  size: number
  /** Optional room/area category — null = general tour photo */
  category?: RoomCategory | null
  categoryLabel?: string
}

/** Room/area categories — maps to PropertyImage.category (extended labels in UI only). */
type RoomCategory =
  | 'living'
  | 'kitchen'
  | 'bedroom'
  | 'bathroom'
  | 'pool'
  | 'rooftop'
  | 'outdoor'

interface RoomOption {
  /** API-compatible category — falls back to a related one if no exact match. */
  category: RoomCategory
  label: string
  icon: IconName
}

/** Rooms shown in the picker modal. */
const ROOMS: RoomOption[] = [
  { category: 'living', label: 'ห้องนั่งเล่น', icon: 'couch' },
  { category: 'kitchen', label: 'ห้องครัว', icon: 'kitchen' },
  { category: 'bedroom', label: 'ห้องนอน', icon: 'bed' },
  { category: 'bathroom', label: 'ห้องน้ำ', icon: 'bath' },
  { category: 'pool', label: 'สระว่ายน้ำ', icon: 'swimmer' },
  { category: 'rooftop', label: 'ดาดฟ้า', icon: 'mountain' },
  { category: 'outdoor', label: 'ลานกลางแจ้ง', icon: 'tree' },
  { category: 'outdoor', label: 'สวน', icon: 'tree' },
  { category: 'outdoor', label: 'ระเบียง', icon: 'beach' },
  { category: 'outdoor', label: 'โรงรถ', icon: 'car' },
  { category: 'outdoor', label: 'พื้นที่ออกกำลังกาย', icon: 'dumbbell' },
  { category: 'outdoor', label: 'พื้นที่ทำงาน', icon: 'briefcase' },
  { category: 'outdoor', label: 'พื้นที่เด็กเล่น', icon: 'gamepad' },
  { category: 'outdoor', label: 'พื้นที่ซักผ้า', icon: 'shirt' },
  { category: 'outdoor', label: 'ห้องเรียน', icon: 'chalkboard' },
  { category: 'outdoor', label: 'ห้องเก็บของ', icon: 'school' },
  { category: 'outdoor', label: 'จุดถ่ายรูป', icon: 'image' },
  { category: 'outdoor', label: 'โรงนอน / กระท่อม', icon: 'campground' },
]

const MAX_PHOTOS = 5
const MAX_FILE_MB = 10

/**
 * Onboarding photos step — shown after the amenities step. Owner uploads tour photos
 * (up to MAX_PHOTOS). Layout matches the design mockup: each existing photo is a tile,
 * and an "add more" tile sits at the end of the grid until the cap is reached.
 */
export default function ListingPhotosPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [photos, setPhotos] = useState<PreviewPhoto[]>([])
  const [extraPhotos, setExtraPhotos] = useState<PreviewPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const extraFileInputRef = useRef<HTMLInputElement>(null)
  // Room picker modal — opened by "เพิ่มรูปภาพเพิ่มเติม"; selection drives the next upload
  const [roomPickerOpen, setRoomPickerOpen] = useState(false)
  const [roomSearch, setRoomSearch] = useState('')
  const [pendingRoom, setPendingRoom] = useState<RoomOption | null>(null)

  const addImage = trpc.propertyExtras.addImage.useMutation()
  // Hydrate from already-uploaded photos so navigating back / refreshing preserves what
  // was uploaded. Images live in the DB (uploaded via propertyExtras.addImage), so we
  // re-fetch the property's images and populate the local preview state on mount.
  const { data: property } = trpc.property.byId.useQuery({ id })
  // Track whether we've already hydrated — guards against re-hydrating after the user
  // uploads more photos in the same session and the query refetches.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (hydrated || !property?.images) return
    const tour = property.images
      .filter((img) => img.type === 'tour' && !img.category)
      .map((img) => ({
        id: img.id,
        url: img.url,
        name: img.url.split('/').pop() ?? 'photo',
        size: 0,
        category: null,
      }))
    const extras = property.images
      .filter((img) => img.type === 'tour' && img.category)
      .map((img) => ({
        id: img.id,
        url: img.url,
        name: img.url.split('/').pop() ?? 'photo',
        size: 0,
        category: img.category as RoomCategory,
        categoryLabel: ROOMS.find((r) => r.category === img.category)?.label ?? img.category ?? undefined,
      }))
    if (tour.length > 0) setPhotos(tour)
    if (extras.length > 0) setExtraPhotos(extras)
    setHydrated(true)
  }, [property, hydrated])

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result))
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
  }

  const acceptFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null)
      const arr = Array.from(fileList)
      const slotsLeft = MAX_PHOTOS - photos.length
      if (slotsLeft <= 0) {
        setError(`เพิ่มรูปได้สูงสุด ${MAX_PHOTOS} รูปเท่านั้น`)
        return
      }
      const taken = arr.slice(0, slotsLeft)
      const newPhotos: PreviewPhoto[] = []
      for (const f of taken) {
        if (!f.type.startsWith('image/')) {
          setError(`ไฟล์ "${f.name}" ไม่ใช่รูปภาพ — รับเฉพาะ PNG / JPG`)
          continue
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`ไฟล์ "${f.name}" ใหญ่เกิน ${MAX_FILE_MB}MB`)
          continue
        }
        const url = await readAsDataUrl(f)
        newPhotos.push({
          id: `${Date.now()}-${f.name}`,
          url,
          name: f.name,
          size: f.size,
        })
      }
      setPhotos((prev) => [...prev, ...newPhotos])
    },
    [photos.length],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) acceptFiles(e.dataTransfer.files)
  }

  function removePhoto(photoId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setError(null)
  }

  /** Read + accept extras (no cap, but each tagged with a room category) */
  const acceptExtraFiles = useCallback(
    async (fileList: FileList | File[], room: RoomOption) => {
      setError(null)
      const arr = Array.from(fileList)
      const newPhotos: PreviewPhoto[] = []
      for (const f of arr) {
        if (!f.type.startsWith('image/')) {
          setError(`ไฟล์ "${f.name}" ไม่ใช่รูปภาพ`)
          continue
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`ไฟล์ "${f.name}" ใหญ่เกิน ${MAX_FILE_MB}MB`)
          continue
        }
        const url = await readAsDataUrl(f)
        newPhotos.push({
          id: `${Date.now()}-${f.name}`,
          url,
          name: f.name,
          size: f.size,
          category: room.category,
          categoryLabel: room.label,
        })
      }
      setExtraPhotos((prev) => [...prev, ...newPhotos])
    },
    [],
  )

  function removeExtra(photoId: string) {
    setExtraPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  function handlePickRoom(room: RoomOption) {
    setPendingRoom(room)
    setRoomPickerOpen(false)
    // Open the extra file picker right after the modal closes
    setTimeout(() => extraFileInputRef.current?.click(), 0)
  }

  async function persistAndGoto(target: string) {
    const all = [...photos, ...extraPhotos]
    if (all.length === 0) {
      router.push(target)
      return
    }
    setUploading(true)
    setError(null)
    try {
      // Main tour photos first (first one becomes cover)
      for (let i = 0; i < photos.length; i++) {
        await addImage.mutateAsync({
          propertyId: id,
          url: photos[i]!.url,
          type: i === 0 ? 'cover' : 'gallery',
        })
      }
      // Extra category photos as gallery with category tag
      for (const p of extraPhotos) {
        await addImage.mutateAsync({
          propertyId: id,
          url: p.url,
          type: 'gallery',
          category: p.category ?? null,
        })
      }
      router.push(target)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัพโหลดรูปไม่สำเร็จ')
      setUploading(false)
    }
  }

  const canAddMore = photos.length < MAX_PHOTOS
  const filteredRooms = ROOMS.filter((r) => {
    const q = roomSearch.trim().toLowerCase()
    if (!q) return true
    return r.label.toLowerCase().includes(q)
  })

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <Link
        href={`/manage/listings/${id}/amenities`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        กลับ
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          ทัวร์รูปภาพที่พักของคุณ
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          รูปภาพรีวิวขั้นต่ำ {MAX_PHOTOS} รูป รองรับไฟล์ PNG, JPG{' '}
          <span className="text-red-500">*</span> — เพิ่มรูปแยกตามห้องได้ตามต้องการ
        </p>
      </div>

      <WizardStepper propertyId={id} current={7} />

      {/* Grid: existing photos + upload tile (if under cap) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.name} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(p.id)}
              className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-colors hover:bg-red-600"
              aria-label={`ลบ ${p.name}`}
              title="ลบ"
            >
              <Icon name="close" className="size-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-all',
              dragOver
                ? 'border-brand-500 bg-brand-50/60'
                : 'border-gray-300 bg-gray-50/40 hover:border-brand-400 hover:bg-brand-50/30',
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-gray-200">
              <Icon name="image" className="size-5" />
            </div>
            <div className="text-sm font-medium text-gray-700">
              อัปโหลดรูปภาพ ({photos.length + 1}/{MAX_PHOTOS})
            </div>
            <p className="text-[11px] text-gray-400">
              ลากแล้ววาง หรือคลิ๊กเพื่อเลือกไฟล์
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) acceptFiles(e.target.files)
            e.target.value = '' // reset so the same file can be re-picked
          }}
        />
      </div>

      {/* "เพิ่มรูปภาพเพิ่มเติม" — opens the room picker modal */}
      <button
        type="button"
        onClick={() => {
          setRoomSearch('')
          setRoomPickerOpen(true)
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-semibold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50/30 hover:text-brand-700 hover:shadow-sm"
      >
        <Icon name="plus" className="size-4" />
        เพิ่มรูปภาพเพิ่มเติม (แยกตามห้อง / พื้นที่)
      </button>

      {/* Hidden file input that activates after a room is picked */}
      <input
        ref={extraFileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length && pendingRoom) {
            acceptExtraFiles(e.target.files, pendingRoom)
          }
          setPendingRoom(null)
          e.target.value = ''
        }}
      />

      {/* Extra-photos grid grouped by room/area label. Each group ends with an
          "อัปโหลดรูปภาพ" tile so the owner can add more photos to the SAME category
          inline without re-opening the room picker. */}
      {extraPhotos.length > 0 && (
        <div className="mt-6 space-y-5">
          {Array.from(new Set(extraPhotos.map((p) => p.categoryLabel))).map((label) => {
            const inGroup = extraPhotos.filter((p) => p.categoryLabel === label)
            // Find the original room option so we can reuse it on the inline +upload tile
            const room = ROOMS.find((r) => r.label === label)
            return (
              <div key={label}>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">{label}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {inGroup.map((p) => (
                    <div
                      key={p.id}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.name} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExtra(p.id)}
                        className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-colors hover:bg-red-600"
                        aria-label={`ลบ ${p.name}`}
                        title="ลบ"
                      >
                        <Icon name="close" className="size-3" />
                      </button>
                    </div>
                  ))}

                  {/* Inline "+upload more" tile — reuses the same hidden file input
                      after stamping the room into pendingRoom */}
                  {room && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingRoom(room)
                        setTimeout(() => extraFileInputRef.current?.click(), 0)
                      }}
                      className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/40 text-center transition-all hover:border-brand-400 hover:bg-brand-50/30"
                    >
                      <div className="flex size-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-gray-200">
                        <Icon name="image" className="size-5" />
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        อัปโหลดรูปภาพ ({inGroup.length + 1})
                      </div>
                      <p className="text-[11px] text-gray-400">
                        ลากแล้ววาง หรือคลิ๊กเพื่อเลือกไฟล์
                      </p>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Footer actions — sticky; padding wrapper matches ManageShell so inner
          max-w-4xl aligns with the page cards above. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          {/* ย้อนกลับ + ดำเนินการต่อ — both buttons present per UX request.
              Photo count text moved to a small gray line between them. */}
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href={`/manage/listings/${id}/amenities`}>
              <Button variant="secondary" type="button" disabled={uploading}>
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <div className="hidden text-sm text-gray-500 sm:block">
              รูปหลัก {photos.length} / {MAX_PHOTOS}
              {extraPhotos.length > 0 && (
                <span className="ml-2 text-gray-400">· รูปเพิ่ม {extraPhotos.length}</span>
              )}
            </div>
            <Button
              type="button"
              onClick={() => persistAndGoto(`/manage/listings/${id}/area`)}
              disabled={uploading}
            >
              {uploading ? 'กำลังอัพโหลด...' : 'ดำเนินการต่อ'}
              <Icon name="chevronRight" className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Room/area picker modal — opens when "เพิ่มรูปภาพเพิ่มเติม" is clicked */}
      <Modal
        open={roomPickerOpen}
        onClose={() => setRoomPickerOpen(false)}
        title="เลือกห้องหรือพื้นที่"
        size="lg"
      >
        <ModalBody>
          {/* Search */}
          <div className="relative mb-4">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400"
            />
            <Input
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="ค้นหาห้อง / พื้นที่"
              className="pl-9"
              autoFocus
            />
          </div>

          {filteredRooms.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
              ไม่พบห้อง / พื้นที่ตามคำค้น
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {filteredRooms.map((r) => (
                <button
                  key={`${r.category}-${r.label}`}
                  type="button"
                  onClick={() => handlePickRoom(r)}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-2 text-center transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50/30 hover:shadow-sm"
                >
                  <Icon name={r.icon} className="size-7 text-gray-600" />
                  <span className="line-clamp-2 text-[11.5px] font-medium leading-tight text-gray-800">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  )
}
