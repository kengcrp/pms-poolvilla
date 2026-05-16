import { NextResponse } from 'next/server'
import { BookingService } from '@pms/api'

/**
 * Trigger: POST /api/cron/auto-cancel
 * Auth: header `x-cron-secret` must match env CRON_SECRET, OR caller is logged-in user.
 * Production: Vercel Cron / system cron / Upstash QStash → POST every 5–10 min.
 * Dev: hit it manually from the dashboard "ตรวจ auto-cancel" button.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get('x-cron-secret')

  // If CRON_SECRET is set, require it. Otherwise allow (dev convenience).
  if (secret && header !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await BookingService.runAutoCancel()
  return NextResponse.json({
    ok: true,
    cancelled: result.cancelled,
    ids: result.ids,
    at: new Date().toISOString(),
  })
}

// Allow GET for easy curl/browser testing in dev
export const GET = POST
