'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label } from '@pms/ui'

const PRESET_COLORS = [
  '#4f46e5', // indigo (default admin)
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#0f766e', // teal
]

export function ThemeForm() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.settings.get.useQuery()
  const [brandName, setBrandName] = useState('')
  const [color, setColor] = useState('#4f46e5')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (data) {
      setBrandName(data.brandName)
      setColor(data.brandColorHex)
      setLogoUrl(data.logoUrl ?? '')
    }
  }, [data])

  const save = trpc.admin.settings.updateTheme.useMutation({
    onSuccess: () => {
      utils.admin.settings.get.invalidate()
      alert('บันทึกธีมเรียบร้อย ✓')
    },
    onError: (e) => alert(e.message),
  })

  if (isPending) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        กำลังโหลด...
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate({
          brandName,
          brandColorHex: color,
          logoUrl: logoUrl.trim() || null,
        })
      }}
      className="grid max-w-5xl gap-6 lg:grid-cols-2"
    >
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div>
          <Label required htmlFor="brand-name">ชื่อแบรนด์</Label>
          <Input
            id="brand-name"
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
        </div>

        <div>
          <Label required htmlFor="brand-color">สีหลัก (Brand color)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="brand-color"
              required
              pattern="^#[0-9a-fA-F]{6}$"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="font-mono"
            />
            <div
              className="size-10 shrink-0 rounded-lg ring-1 ring-inset ring-gray-200"
              style={{ background: color }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-7 rounded-lg ring-1 ring-inset ring-gray-200 transition-transform hover:scale-110 ${
                  color.toLowerCase() === c ? 'ring-2 ring-gray-900' : ''
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="logo-url">URL โลโก้</Label>
          <Input
            id="logo-url"
            type="url"
            placeholder="https://..."
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            ใส่ URL ของโลโก้ (อัพโหลดผ่าน CDN/Cloudinary แล้วใส่ลิงก์)
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Icon name="spinner" spin className="size-4" />}
            บันทึก
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
          พรีวิว
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-xl text-white shadow"
              style={{ background: color }}
            >
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt="" className="size-10 object-contain" />
              ) : (
                <Icon name="shield" className="size-5" />
              )}
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-gray-900">
                {brandName || 'Brand Name'}
              </div>
              <div className="text-xs text-gray-500">Admin Console</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow"
              style={{ background: color }}
            >
              ปุ่มหลัก
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: color, color }}
            >
              ปุ่มรอง
            </button>
          </div>
          <div
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: `${color}15`, color }}
          >
            ข้อความ accent โทนสีเดียวกัน
          </div>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          💡 ปัจจุบันธีมยังไม่ apply ทั้งระบบ (ต้อง wire กับ Tailwind theme ใน Phase ถัดไป)
        </p>
      </div>
    </form>
  )
}
