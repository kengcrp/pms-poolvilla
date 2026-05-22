import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { auth } from '@/auth'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const VALID_KINDS = new Set(['property', 'hotel', 'roomType'])

/**
 * POST /api/upload
 * Body (FormData):
 *   - file: Blob (jpg/png/webp/gif, max 8MB)
 *   - kind: 'property' | 'hotel' | 'roomType' (default 'property' for back-compat)
 *   - propertyId: string (when kind=property — kept for back-compat)
 *   - entityId: string (when kind=hotel|roomType)
 *
 * Saves to: public/uploads/{folder}/{entityId}/{timestamp}-{random}.{ext}
 *   - folder = 'property' (or backward compat dir if propertyId-only)
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const propertyId = formData.get('propertyId')
  const kindRaw = formData.get('kind')
  const entityIdRaw = formData.get('entityId')

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `ไฟล์ไม่รองรับ (${file.type})` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `ไฟล์ใหญ่เกิน ${MAX_BYTES / 1024 / 1024} MB` }, { status: 400 })
  }

  // Determine kind + entity id
  let kind: 'property' | 'hotel' | 'roomType'
  let entityId: string

  if (typeof kindRaw === 'string' && VALID_KINDS.has(kindRaw)) {
    kind = kindRaw as 'property' | 'hotel' | 'roomType'
    if (typeof entityIdRaw !== 'string' || !entityIdRaw) {
      return NextResponse.json({ error: 'Missing entityId' }, { status: 400 })
    }
    entityId = entityIdRaw
  } else if (typeof propertyId === 'string' && propertyId) {
    // Back-compat path: propertyId only
    kind = 'property'
    entityId = propertyId
  } else {
    return NextResponse.json({ error: 'Missing kind/entityId' }, { status: 400 })
  }

  const ext = file.type.split('/')[1] ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

  // Storage layout:
  //   property → /uploads/{propertyId}/...  (back-compat — no subfolder)
  //   hotel    → /uploads/hotel/{hotelId}/...
  //   roomType → /uploads/roomtype/{roomTypeId}/...
  const subdir = kind === 'property' ? entityId : `${kind === 'hotel' ? 'hotel' : 'roomtype'}/${entityId}`
  const dir = path.join(process.cwd(), 'public', 'uploads', subdir)
  await mkdir(dir, { recursive: true })
  const filepath = path.join(dir, filename)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buf)

  return NextResponse.json({
    url: `/uploads/${subdir}/${filename}`,
    size: file.size,
    type: file.type,
    kind,
    entityId,
  })
}
