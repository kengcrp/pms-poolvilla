import type { LineItem } from '../schemas/accounting'

export const DOC_PREFIX: Record<string, string> = {
  QUOTE: 'QT',
  INVOICE: 'INV',
  TAX_INVOICE: 'TINV',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
}

export const DOC_LABEL_TH: Record<string, string> = {
  QUOTE: 'ใบเสนอราคา',
  INVOICE: 'ใบแจ้งหนี้',
  TAX_INVOICE: 'ใบกำกับภาษี',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
}

export const STATUS_LABEL_TH: Record<string, string> = {
  DRAFT: 'ร่าง',
  ISSUED: 'ออกแล้ว',
  PAID: 'ชำระแล้ว',
  CANCELLED: 'ยกเลิก',
}

/** YYYY-NNN sequential per (owner, type) */
export function buildDocNo(type: string, year: number, seq: number) {
  const prefix = DOC_PREFIX[type] ?? 'DOC'
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}

export function lineItemTotal(item: LineItem): number {
  return Number((item.qty * item.price).toFixed(2))
}

export function computeTotals(items: LineItem[], withVat: boolean) {
  const subtotal = items.reduce((s, i) => s + lineItemTotal(i), 0)
  const vat = withVat ? Number((subtotal * 0.07).toFixed(2)) : 0
  const total = Number((subtotal + vat).toFixed(2))
  return { subtotal, vat, total }
}
