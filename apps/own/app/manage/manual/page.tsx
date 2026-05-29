'use client'

/**
 * คู่มือการใช้งาน — user manual / help center.
 * Grid of topic cards grouped by category (Sale page, General package, etc.).
 * Currently UI-only with mock entries.
 */

import { useState } from 'react'

interface ManualEntry {
  key: string
  category: 'sale_page' | 'general_package' | 'getting_started'
  label: string
}

const MOCK_ENTRIES: ManualEntry[] = [
  // Sale page section (6 entries)
  { key: 'sale-1', category: 'sale_page', label: 'Sale page' },
  { key: 'sale-2', category: 'sale_page', label: 'Sale page' },
  { key: 'sale-3', category: 'sale_page', label: 'Sale page' },
  { key: 'sale-4', category: 'sale_page', label: 'Sale page' },
  { key: 'sale-5', category: 'sale_page', label: 'Sale page' },
  { key: 'sale-6', category: 'sale_page', label: 'Sale page' },
  // General package section (6 entries)
  { key: 'gen-1', category: 'general_package', label: 'General package' },
  { key: 'gen-2', category: 'general_package', label: 'General package' },
  { key: 'gen-3', category: 'general_package', label: 'General package' },
  { key: 'gen-4', category: 'general_package', label: 'General package' },
  { key: 'gen-5', category: 'general_package', label: 'General package' },
  { key: 'gen-6', category: 'general_package', label: 'General package' },
  // Getting started section (3 entries)
  { key: 'gs-1', category: 'getting_started', label: 'Getting started' },
  { key: 'gs-2', category: 'getting_started', label: 'Getting started' },
  { key: 'gs-3', category: 'getting_started', label: 'Getting started' },
]

export default function ManualPage() {
  const [entries] = useState<ManualEntry[]>(MOCK_ENTRIES)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">คู่มือการใช้งาน</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <ManualCard key={entry.key} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function ManualCard({ entry }: { entry: ManualEntry }) {
  return (
    <button
      type="button"
      className="rounded-2xl bg-white p-5 text-left text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md hover:ring-brand-200"
    >
      {entry.label}
    </button>
  )
}
