'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { clearWizardDrafts } from '@/lib/wizard-drafts'

/**
 * Mounted by every wizard page that wants to warn the owner before they
 * accidentally navigate away mid-flow.
 *
 * Two guards layered together:
 *
 *  1. **Browser-level** — a `beforeunload` listener triggers the native
 *     "Leave site?" prompt when the user closes the tab, hits refresh, or
 *     types a different URL. The browser shows its own dialog (no custom UI
 *     allowed by spec).
 *
 *  2. **In-app** — a document-wide click listener intercepts any anchor that
 *     would route the user OUT of the current wizard step (sidebar menu
 *     items, breadcrumbs, header logo, etc.). Click is preventDefault'd, a
 *     Thai popup asks "ทำต่อ / ออก", and only on "ออก" does navigation
 *     actually proceed via `router.push`.
 *
 * The guard is automatically armed while the component is mounted — the
 * parent doesn't need to manage any state. Wizard pages just render
 * `<WizardExitGuard />` once near the top of their tree.
 */
interface Props {
  /** Property id of the in-progress wizard (set once step 3 creates the row).
   *  On "ออกโดยไม่บันทึก" this property is soft-deleted so the abandoned draft
   *  never appears in the listings. */
  propertyId?: string
}

export function WizardExitGuard({ propertyId }: Props = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const utils = trpc.useUtils()
  const deleteProperty = trpc.property.delete.useMutation()
  // When set, a pending navigation is held while the modal is open.
  const [pending, setPending] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  // ── Guard 1: browser-level (refresh / close / typed URL) ──────────
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Some browsers ignore custom messages and just show their own prompt —
      // we just need to set returnValue to anything truthy.
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // ── Guard 2: in-app navigation (any <a> click that leaves this page) ──
  useEffect(() => {
    function onClickCapture(e: MouseEvent) {
      // Ignore non-primary clicks + modifier keys (open-in-new-tab etc.).
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      // Skip external links + anchors with target=_blank + downloads.
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      // Skip wizard-internal navigation (the step circles in WizardStepper
      // mark themselves with data-wizard-nav so the guard doesn't nag the
      // owner for jumping between wizard steps).
      if (anchor.dataset.wizardNav === 'true') return
      const href = anchor.getAttribute('href')
      if (!href) return
      if (href.startsWith('http')) return
      if (href.startsWith('#')) return
      // Same-page link → no warning needed.
      const dest = href.split('?')[0]
      if (dest === pathname) return
      // Hold the navigation + show modal.
      e.preventDefault()
      setPending(href)
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [pathname])

  function continueEditing() {
    setPending(null)
  }
  async function exitNow() {
    if (discarding) return
    const href = pending
    setDiscarding(true)
    try {
      // Wipe every wizard sessionStorage draft so re-entering starts clean.
      clearWizardDrafts()
      // Soft-delete the in-flight property (no-op when abandoning before the
      // step-3 create, where there's no propertyId yet). list() filters
      // deletedAt:null so it disappears immediately.
      if (propertyId) {
        try {
          await deleteProperty.mutateAsync({ id: propertyId })
          utils.property.list.invalidate()
        } catch {
          /* network / server error — still navigate away so the owner isn't
             trapped on the popup. */
        }
      }
    } finally {
      setDiscarding(false)
      setPending(null)
      if (href) router.push(href)
    }
  }

  if (!pending) return null
  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-exit-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-6" aria-hidden>
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 id="wizard-exit-title" className="text-lg font-bold text-gray-900">
            ยังกรอกข้อมูลไม่เสร็จ
          </h2>
          <p className="mt-1.5 text-sm text-gray-600">
            คุณกำลังเพิ่มที่พักอยู่ — ถ้าออกตอนนี้ ข้อมูลที่ยังไม่ได้บันทึกอาจหายไป
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 px-6 pb-6 pt-5">
          <button
            type="button"
            onClick={continueEditing}
            disabled={discarding}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            แก้ไขต่อ
          </button>
          <button
            type="button"
            onClick={exitNow}
            disabled={discarding}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {discarding ? 'กำลังออก...' : 'ออกโดยไม่บันทึก'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
