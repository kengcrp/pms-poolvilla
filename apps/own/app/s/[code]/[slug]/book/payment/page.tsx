'use client'

/**
 * Booking checkout step 2 — contact info + payment method selection.
 * Reached from /s/[code]/[slug]/book when the user clicks "ถัดไป".
 *
 * URL: /s/[code]/[slug]/book/payment?in=...&out=...&total=...&mode=...
 *      &adult=...&child=...&infant=...&pet=...
 *
 * UI-only for now — wiring the actual booking creation comes next.
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Icon } from '@pms/ui'

type PayMethod = 'card' | 'transfer' | 'mobile'

export default function PaymentPage({
  params,
}: {
  params: Promise<{ code: string; slug: string }>
}) {
  const { code, slug } = use(params)
  const searchParams = useSearchParams()
  const total = Number(searchParams.get('total') ?? 0)

  // Carry through the previous step's selection so the back link preserves it.
  const prevQs = searchParams.toString()

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod>('card')
  const [taxInvoiceOpen, setTaxInvoiceOpen] = useState(false)
  const [taxName, setTaxName] = useState('')
  const [taxId, setTaxId] = useState('')

  const canContinue = !!customerName.trim() && !!phone.trim() && acceptedTerms

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with back link */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center px-4">
          <Link
            href={`/s/${code}/${slug}/book?${prevQs}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            <Icon name="chevronLeft" className="size-4" />
            กลับ
          </Link>
          <div className="ml-auto text-sm font-semibold text-gray-900">
            ข้อมูลผู้จอง
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
        {/* ── Customer info ────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Icon name="user" className="size-4" />
            </div>
            <div className="text-sm font-bold text-gray-900">ข้อมูลผู้จอง</div>
          </div>

          <div className="space-y-3">
            <FieldWrap label="ชื่อลูกค้า">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </FieldWrap>

            <FieldWrap label="เบอร์โทรศัพท์">
              <div className="flex gap-2">
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <span aria-label="ไทย">🇹🇭</span>
                  <span className="text-gray-600">+66</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                />
              </div>
            </FieldWrap>

            <FieldWrap label="อีเมล">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </FieldWrap>

            <label className="flex cursor-pointer items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-gray-700">
                ฉันยอมรับ{' '}
                <a className="font-medium text-brand-600 hover:underline">
                  นโยบายที่พัก, กฎความปลอดภัย
                </a>
              </span>
            </label>
          </div>
        </div>

        {/* ── Payment method ─ Layout: label LEFT + logos BELOW, radio RIGHT,
              with hairline dividers between options. ──────────────────── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-1 text-sm font-bold text-gray-900">วิธีชำระเงิน</div>
          <div className="mb-2 text-[11px] font-medium text-rose-500">
            ความปลอดภัยและความเป็นส่วนตัวของคุณได้รับความคุ้มครอง
          </div>

          <div className="divide-y divide-gray-100">
            <PayRow
              active={payMethod === 'card'}
              onClick={() => setPayMethod('card')}
              label="ผ่อนชำระ / บัตรเครดิต บัตรเดบิต"
            >
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CardChip label="VISA" />
                <CardChip label="AliPay" />
                <CardChip label="MasterCard" />
                <CardChip label="RuayPay" />
              </div>
            </PayRow>

            <PayRow
              active={payMethod === 'transfer'}
              onClick={() => setPayMethod('transfer')}
              label="โอนเงิน"
            >
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <BankDot color="bg-yellow-400" />
                <BankDot color="bg-blue-700" />
                <BankDot color="bg-green-600" />
                <BankDot color="bg-orange-500" />
                <BankDot color="bg-purple-600" />
              </div>
            </PayRow>

            <PayRow
              active={payMethod === 'mobile'}
              onClick={() => setPayMethod('mobile')}
              label="โมบายแบงค์กิ้ง"
              collapsible
            />
          </div>
        </div>

        {/* ── Tax invoice (collapsible) ────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <button
            type="button"
            onClick={() => setTaxInvoiceOpen((v) => !v)}
            className="flex w-full items-center justify-between p-4"
          >
            <span className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon name="invoice" className="size-4" />
              </div>
              <span className="text-sm font-bold text-gray-900">ใบกำกับภาษี / รับ</span>
            </span>
            <Icon
              name={taxInvoiceOpen ? 'chevronUp' : 'chevronDown'}
              className="size-4 text-gray-400"
            />
          </button>
          {taxInvoiceOpen && (
            <div className="space-y-3 border-t border-gray-100 p-4 pt-3">
              <FieldWrap label="ชื่อ-ที่อยู่ผู้รับใบกำกับ">
                <input
                  type="text"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="กรอกข้อมูล"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                />
              </FieldWrap>
              <FieldWrap label="เลขประจำตัวผู้เสียภาษี">
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="X-XXXX-XXXXX-XX-X"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                />
              </FieldWrap>
            </div>
          )}
        </div>

        {/* ── Total + CTA — minimal label + price (black), blue pill button ─ */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
            <span className="text-base font-bold text-gray-900">ราคารวมทั้งสิ้น</span>
            <span className="text-lg font-extrabold text-gray-900">
              ฿ {total.toLocaleString('en-US')}
            </span>
          </div>

          <button
            type="button"
            disabled={!canContinue}
            className={
              canContinue
                ? 'mt-4 flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700'
                : 'mt-4 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-brand-200 text-base font-bold text-white'
            }
          >
            ถัดไป
          </button>
          {!acceptedTerms && (
            <div className="mt-2 text-center text-[11px] text-gray-500">
              ต้องยอมรับนโยบายที่พักก่อนชำระเงิน
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

/** Payment option row — label/logos on the LEFT, radio on the RIGHT.
 *  Matches the Airbnb-style layout in the design mock. */
function PayRow({
  active,
  onClick,
  label,
  collapsible,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  /** Show a right-side chevron instead of children (collapsible sub-options). */
  collapsible?: boolean
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 py-4 text-left first:pt-2 last:pb-2 hover:bg-gray-50/40"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        {children}
      </div>
      {collapsible ? (
        <Icon name="chevronDown" className="size-4 shrink-0 text-gray-400" />
      ) : (
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
            active ? 'border-brand-600' : 'border-gray-300'
          }`}
        >
          {active && <span className="size-2 rounded-full bg-brand-600" />}
        </span>
      )}
    </button>
  )
}

/** Card brand chip — white card with a soft border, accent-colored label.
 *  More realistic than the solid color blocks; matches the design mock. */
function CardChip({ label }: { label: string }) {
  // Map known brands to an accent color; fall back to neutral for others.
  const accent =
    label === 'VISA'
      ? 'text-blue-700'
      : label === 'AliPay'
        ? 'text-sky-500'
        : label === 'MasterCard'
          ? 'text-red-600'
          : 'text-amber-600'
  return (
    <span
      className={`inline-flex h-7 min-w-12 items-center justify-center rounded border border-gray-200 bg-white px-2 text-[10px] font-extrabold tracking-wide shadow-sm ${accent}`}
    >
      {label}
    </span>
  )
}

/** Small colored circle representing a bank — no label, just a dot.
 *  Stand-in for the actual gradient bank logos in the design. */
function BankDot({ color }: { color: string }) {
  return (
    <span
      className={`inline-block size-6 rounded-full ring-2 ring-white shadow-sm ${color}`}
    />
  )
}
