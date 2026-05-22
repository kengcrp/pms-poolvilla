'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Icon, cn } from '@pms/ui'

async function uploadRoomTypeImage(file: File, roomTypeId: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('kind', 'roomType')
  fd.append('entityId', roomTypeId)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'อัปโหลดล้มเหลว')
  }
  const data = (await res.json()) as { url: string }
  return data.url
}

interface Props {
  roomTypeId: string
}

export function RoomTypeImagesManager({ roomTypeId }: Props) {
  const utils = trpc.useUtils()
  const { data: images } = trpc.roomType.listImages.useQuery({ roomTypeId })
  const refetch = () => {
    utils.roomType.listImages.invalidate({ roomTypeId })
    utils.roomType.list.invalidate() // refresh count in list
  }
  const addImage = trpc.roomType.addImage.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })
  const deleteImage = trpc.roomType.deleteImage.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setError(null)
    setBusy(true)
    try {
      const url = await uploadRoomTypeImage(file, roomTypeId)
      await addImage.mutateAsync({ roomTypeId, url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัปโหลดล้มเหลว')
    } finally {
      setBusy(false)
    }
  }

  const list = images ?? []

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((img) => (
          <div key={img.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="block aspect-square w-full object-cover" />
            <button
              type="button"
              onClick={() => deleteImage.mutate({ id: img.id })}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-white/95 text-red-600 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
              title="ลบ"
            >
              <Icon name="trash" className="size-3" />
            </button>
          </div>
        ))}
        <UploadTile busy={busy} onFile={handleUpload} />
      </div>
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      {busy ? (
        <Icon name="spinner" spin className="size-4 text-brand-600" />
      ) : (
        <>
          <Icon name="plus" className="size-5 text-gray-400" />
          <div className="text-[10px] text-gray-500">เพิ่มรูป</div>
        </>
      )}
    </button>
  )
}
