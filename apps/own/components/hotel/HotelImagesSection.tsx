'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, cn } from '@pms/ui'

interface Props {
  hotelId: string
}

async function uploadHotelImage(file: File, hotelId: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('kind', 'hotel')
  fd.append('entityId', hotelId)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'อัปโหลดล้มเหลว')
  }
  const data = (await res.json()) as { url: string }
  return data.url
}

export function HotelImagesSection({ hotelId }: Props) {
  const utils = trpc.useUtils()
  const { data: images, isPending } = trpc.hotel.listImages.useQuery({ hotelId })

  const refetch = () => utils.hotel.listImages.invalidate({ hotelId })

  const addImage = trpc.hotel.addImage.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })
  const deleteImage = trpc.hotel.deleteImage.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })
  const setCover = trpc.hotel.setCover.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'cover' | 'gallery' | null>(null)

  const list = images ?? []
  const cover = list.find((i) => i.type === 'cover')
  const gallery = list.filter((i) => i.type === 'gallery')

  async function handleUpload(file: File, type: 'cover' | 'gallery') {
    setError(null)
    setBusy(type)
    try {
      const url = await uploadHotelImage(file, hotelId)
      await addImage.mutateAsync({ hotelId, url, type })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัปโหลดล้มเหลว')
    } finally {
      setBusy(null)
    }
  }

  if (isPending) {
    return <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">กำลังโหลด...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">รูปภาพโรงแรม</h3>
        <p className="mt-0.5 text-[11px] text-gray-500">
          อัพรูปปก 1 รูป (แสดงเป็นรูปหลักในหน้าจอง) + รูป gallery หลายรูป (แสดงในส่วน hero gallery)
        </p>
      </div>

      {/* Cover */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">รูปปก (Cover)</h4>
        {cover ? (
          <div className="group relative inline-block overflow-hidden rounded-xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.url} alt="cover" className="block aspect-[16/10] w-80 object-cover" />
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => {
                  if (confirm('ลบรูปปก?')) deleteImage.mutate({ id: cover.id })
                }}
                className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-white"
              >
                <Icon name="trash" className="size-3" /> ลบ
              </button>
            </div>
            <div className="absolute left-2 top-2 rounded-md bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-amber-900 shadow-sm">
              ★ ปก
            </div>
          </div>
        ) : (
          <UploadDropzone
            label="อัพรูปปก (1 รูป)"
            busy={busy === 'cover'}
            onFile={(f) => handleUpload(f, 'cover')}
          />
        )}
      </div>

      {/* Gallery */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          แกลเลอรี่
          {gallery.length > 0 && <Badge variant="brand" className="ml-2">{gallery.length}</Badge>}
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {gallery.map((img) => (
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
          <UploadTile busy={busy === 'gallery'} onFile={(f) => handleUpload(f, 'gallery')} />
        </div>
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
  label, busy, onFile,
}: { label: string; busy: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex aspect-[16/10] w-80 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white text-center transition-colors',
        over ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50',
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }} />
      {busy ? (
        <>
          <Icon name="spinner" spin className="size-6 text-brand-600" />
          <div className="text-xs text-gray-500">กำลังอัปโหลด...</div>
        </>
      ) : (
        <>
          <Icon name="cloudUpload" className="size-8 text-gray-400" />
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
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      className={cn(
        'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition-colors disabled:opacity-50',
        over ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50',
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }} />
      {busy ? (
        <Icon name="spinner" spin className="size-5 text-brand-600" />
      ) : (
        <>
          <Icon name="plus" className="size-5 text-gray-400" />
          <div className="text-[10px] text-gray-500">เพิ่มรูป</div>
        </>
      )}
    </button>
  )
}
