'use client'

/**
 * ช่องทางการรับเงิน — list of payout bank accounts.
 * Table layout with per-row "จัดการ" button + top-right "ตั้งค่า" action.
 * Currently UI-only with mock data.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@pms/ui'

interface MockPayout {
  rowNo: number
  bank: string
  accountName: string
  accountNumber: string
  /** Number of properties using this account */
  usedByProperties: number
}

const MOCK_PAYOUTS: MockPayout[] = [
  { rowNo: 1, bank: 'ธนาคาร ธ.ก.ส.', accountName: 'pregrammertest', accountNumber: '1234567890', usedByProperties: 0 },
  { rowNo: 2, bank: 'ธนาคาร ธ.ก.ส.', accountName: 'pregrammertest', accountNumber: '1234567890', usedByProperties: 0 },
  { rowNo: 3, bank: 'ธนาคาร ธ.ก.ส.', accountName: 'pregrammertest', accountNumber: '1234567890', usedByProperties: 0 },
  { rowNo: 4, bank: 'ธนาคาร ธ.ก.ส.', accountName: 'pregrammertest', accountNumber: '1234567890', usedByProperties: 5 },
]

export default function PayoutChannelsPage() {
  const [payouts] = useState<MockPayout[]>(MOCK_PAYOUTS)

  return (
    <div className="space-y-5">
      {/* Back link — returns to the parent ตั้งค่าทั่วไป hub. */}
      <Link
        href="/manage/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="chevronLeft" className="size-4" />
        กลับ
      </Link>

      {/* Header — title left, "ตั้งค่า" pill top-right */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ช่องทางการรับเงิน</h1>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          <Icon name="gear" className="size-3.5" />
          ตั้งค่า
        </button>
      </div>

      <div className="text-sm text-gray-700">
        ข้อมูลทั้งหมด <span className="font-bold text-gray-900">{payouts.length}</span> รายการ
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/60 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-6 py-4 text-left font-medium">ลำดับ</th>
                <th className="px-6 py-4 text-left font-medium">ธนาคาร</th>
                <th className="px-6 py-4 text-left font-medium">ชื่อบัญชี</th>
                <th className="px-6 py-4 text-left font-medium">เลขบัญชี</th>
                <th className="px-6 py-4 text-left font-medium">ใช้กับที่พัก (หลัง)</th>
                <th className="px-6 py-4 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    ยังไม่มีบัญชีรับเงิน — กดปุ่ม "ตั้งค่า" เพื่อเพิ่มบัญชีแรก
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.rowNo} className="text-gray-700 hover:bg-gray-50/60">
                    <td className="px-6 py-5 font-medium text-gray-900">{p.rowNo}</td>
                    <td className="px-6 py-5">{p.bank}</td>
                    <td className="px-6 py-5">{p.accountName}</td>
                    <td className="px-6 py-5 font-mono tabular-nums">{p.accountNumber}</td>
                    <td className="px-6 py-5 tabular-nums">{p.usedByProperties}</td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                      >
                        จัดการ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
