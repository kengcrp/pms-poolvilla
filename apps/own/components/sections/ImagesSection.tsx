'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Input, Label, cn } from '@pms/ui'

interface Props {
  propertyId: string
}

const TOUR_CATEGORIES = [
  { key: 'pool', label: 'สระว่ายน้ำ', icon: '💧' },
  { key: 'bedroom', label: 'ห้องนอน', icon: '🛏️' },
  { key: 'bathroom', label: 'ห้องน้ำ', icon: '🛁' },
  { key: 'living', label: 'ห้องนั่งเล่น', icon: '🛋️' },
  { key: 'kitchen', label: 'ห้องครัว', icon: '🍳' },
  { key: 'rooftop', label: 'ดาดฟ้า', icon: '🏞️' },
  { key: 'outdoor', label: 'ภายนอก', icon: '🌳' },
] as const

type Category = (typeof TOUR_CATEGORIES)[number]['key']

async function uploadFile(file: File, propertyId: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('propertyId', propertyId)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'อัปโหลดล้มเหลว')
  }
  const data = (await res.json()) as { url: string }
  return data.url
}

export function ImagesSection({ propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })

  const [tour360Url, setTour360Url] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // category key or 'cover'

  useEffect(() => {
    const t = property?.images.find((i) => i.type === 'tour_360')
    setTour360Url(t?.url ?? '')
  }, [property?.images])

  const addImage = trpc.propertyExtras.addImage.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })
  const deleteImage = trpc.propertyExtras.deleteImage.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })
  const setCover = trpc.propertyExtras.setCover.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })
  const set3D = trpc.propertyExtras.setTour360Url.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })

  const images = property?.images ?? []
  const cover = images.find((i) => i.type === 'cover')
  type Img = (typeof images)[number]
  const galleryByCat: Record<Category, Img[]> = {
    pool: [],
    bedroom: [],
    bathroom: [],
    living: [],
    kitchen: [],
    rooftop: [],
    outdoor: [],
  }
  for (const img of images) {
    if (img.type === 'tour' && img.category && img.category in galleryByCat) {
      galleryByCat[img.category as Category].push(img)
    }
  }

  async function handleUpload(file: File, type: 'cover' | 'tour', category?: Category) {
    setError(null)
    const key = type === 'cover' ? 'cover' : (category ?? 'tour')
    setBusy(key)
    try {
      const url = await uploadFile(file, propertyId)
      await addImage.mutateAsync({ propertyId, url, type, category: category ?? null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัปโหลดล้มเหลว')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cover */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">รูปปก (Cover)</h4>
        {cover ? (
          <div className="group relative inline-block overflow-hidden rounded-xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.url} alt="cover" className="block aspect-[16/10] w-80 object-cover" />
            <button
              type="button"
              onClick={() => deleteImage.mutate({ id: cover.id })}
              className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-red-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            >
              ลบ
            </button>
          </div>
        ) : (
          <UploadDropzone
            label="ลากรูปมาวาง หรือคลิกเพื่อเลือกรูปปก"
            busy={busy === 'cover'}
            onFile={(f) => handleUpload(f, 'cover')}
          />
        )}
      </div>

      {/* Photo Tours */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">ทัวร์รูปภาพ (แยกตามห้อง)</h4>
        <div className="space-y-4">
          {TOUR_CATEGORIES.map((cat) => {
            const imgs = galleryByCat[cat.key]
            return (
              <div key={cat.key} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-medium text-gray-900">{cat.label}</span>
                    {imgs.length > 0 && <Badge variant="brand">{imgs.length}</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                  {imgs.map((img) => (
                    <div key={img.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="block aspect-square w-full object-cover" />
                      <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setCover.mutate({ imageId: img.id })}
                          className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-50"
                          title="ตั้งเป็นรูปปก"
                        >
                          ★ ปก
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteImage.mutate({ id: img.id })}
                          className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-gray-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                  <UploadTile
                    busy={busy === cat.key}
                    onFile={(f) => handleUpload(f, 'tour', cat.key)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3D / 360 tour */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <Label htmlFor="tour360">ลิงก์รูป 3D / Tour 360°</Label>
        <div className="flex gap-2">
          <Input
            id="tour360"
            value={tour360Url}
            onChange={(e) => setTour360Url(e.target.value)}
            placeholder="https://my.matterport.com/show/?m=..."
          />
          <Button
            variant="secondary"
            onClick={() => set3D.mutate({ propertyId, url: tour360Url })}
            disabled={set3D.isPending}
          >
            บันทึก
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-500">รองรับ Matterport, Kuula, หรือลิงก์ embed อื่นๆ</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

function UploadDropzone({
  label,
  busy,
  onFile,
}: {
  label: string
  busy: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex aspect-[16/10] w-80 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white text-center transition-colors',
        over ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {busy ? (
        <>
          <svg className="size-6 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <div className="text-xs text-gray-500">กำลังอัปโหลด...</div>
        </>
      ) : (
        <>
          <div className="text-3xl">📤</div>
          <div className="text-sm font-medium text-gray-700">{label}</div>
          <div className="text-[10.5px] text-gray-400">JPG / PNG / WebP — สูงสุด 8 MB</div>
        </>
      )}
    </div>
  )
}

function UploadTile({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      className={cn(
        'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition-colors disabled:opacity-50',
        over ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {busy ? (
        <svg className="size-5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      ) : (
        <>
          <div className="text-2xl text-gray-400">+</div>
          <div className="text-[10px] text-gray-500">เพิ่มรูป</div>
        </>
      )}
    </button>
  )
}
