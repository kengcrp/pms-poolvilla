import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { auth } from '@/auth'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const propertyId = formData.get('propertyId')

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  if (typeof propertyId !== 'string' || !propertyId) {
    return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `ไฟล์ไม่รองรับ (${file.type})` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `ไฟล์ใหญ่เกิน ${MAX_BYTES / 1024 / 1024} MB` }, { status: 400 })
  }

  const ext = file.type.split('/')[1] ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads', propertyId)
  await mkdir(dir, { recursive: true })
  const filepath = path.join(dir, filename)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buf)

  return NextResponse.json({
    url: `/uploads/${propertyId}/${filename}`,
    size: file.size,
    type: file.type,
  })
}
