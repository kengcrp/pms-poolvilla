/** Date helpers — work in UTC to avoid timezone drift. */

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const

export const THAI_DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const

/** Format month label in CE (per user decision). */
export function formatMonthLabel(year: number, month0: number): string {
  return `${THAI_MONTHS[month0]} ${year}`
}

export function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function ymdLocal(d: Date): string {
  // for date inputs (local)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function startOfMonthUTC(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1))
}

export function endOfMonthUTC(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0 + 1, 0))
}

export type CalendarCell = {
  date: Date
  inMonth: boolean
  dayNum: number
}

/** Build the 6×7 grid for a month (with surrounding days). */
export function buildMonthGrid(year: number, month0: number): CalendarCell[] {
  const first = startOfMonthUTC(year, month0)
  const firstDow = first.getUTCDay()
  const start = new Date(first)
  start.setUTCDate(start.getUTCDate() - firstDow)

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    cells.push({
      date: d,
      inMonth: d.getUTCMonth() === month0,
      dayNum: d.getUTCDate(),
    })
  }
  return cells
}

export function formatBaht(n: number): string {
  if (n === 0) return '—'
  if (n >= 1000) return `฿${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `฿${n}`
}

export function formatBahtFull(n: number): string {
  return `฿${n.toLocaleString('en-US')}`
}
