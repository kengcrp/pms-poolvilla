'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, cn } from '@pms/ui'

type Site = 'airbnb' | 'booking' | 'agoda' | 'tripadvisor' | 'vrbo' | 'other' | 'none'

interface SiteOption {
  key: Site
  label: string
  /** True for "ที่พักของฉันยังไม่ได้เปิดบนเว็บไซต์ใด ๆ" — mutually exclusive with all others. */
  exclusive?: boolean
}

const sites: SiteOption[] = [
  { key: 'airbnb', label: 'Airbnb' },
  { key: 'booking', label: 'Booking.com' },
  { key: 'agoda', label: 'Agoda' },
  { key: 'tripadvisor', label: 'TripAdvisor' },
  { key: 'vrbo', label: 'Vrbo' },
  { key: 'other', label: 'เว็บไซต์อื่น ๆ' },
  { key: 'none', label: 'ที่พักของฉันยังไม่ได้เปิดบนเว็บไซต์ใด ๆ', exclusive: true },
]

/** Shape of scraped property data — kept loose so the form can read whichever fields exist. */
export interface ScrapedListing {
  name: string | null
  description: string | null
  images: string[]
  bedrooms: number | null
  bathrooms: number | null
  maxGuests: number | null
  /** "HH:MM" 24h — null when not detected on the source */
  checkinTime: string | null
  checkoutTime: string | null
  source: string
  sourceUrl: string
}

/** SessionStorage key — the final form picks it up to pre-fill bedroom / bathroom / etc. */
const STORAGE_KEY = 'pms.newListing.scraped'

/**
 * Step 4 of the residential wizard — pick external sites + optionally paste a listing URL
 * to auto-fill property data (name, bedrooms, bathrooms, images) on the next step.
 */
export default function ResidentialListingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const booking = searchParams.get('booking') ?? 'whole_unit'
  const subtype = searchParams.get('subtype') ?? ''
  const type = searchParams.get('type') ?? 'POOL_VILLA'

  const [selected, setSelected] = useState<Set<Site>>(new Set())
  // URL inputs per site
  const [urlByPicker, setUrlByPicker] = useState<Partial<Record<Site, string>>>({})
  // Scraped data preview per site
  const [scrapedBySite, setScrapedBySite] = useState<Partial<Record<Site, ScrapedListing>>>({})
  // Which site is currently being scraped (loading spinner)
  const [scrapingSite, setScrapingSite] = useState<Site | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)

  const scrape = trpc.propertyExtras.scrapeListingUrl.useMutation({
    onSuccess: (data, vars) => {
      // We tagged the mutation context via the closure in handleScrape; the site key is on `vars` URL
      const site = scrapingSite!
      setScrapedBySite((prev) => ({ ...prev, [site]: { ...data, sourceUrl: vars.url } }))
      setScrapingSite(null)
      setScrapeError(null)
    },
    onError: (e) => {
      setScrapingSite(null)
      setScrapeError(e.message)
    },
  })

  function toggle(s: SiteOption) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (s.exclusive) {
        return next.has(s.key) ? new Set() : new Set([s.key])
      }
      next.delete('none')
      if (next.has(s.key)) next.delete(s.key)
      else next.add(s.key)
      return next
    })
  }

  function handleScrape(site: Site) {
    const url = (urlByPicker[site] ?? '').trim()
    if (!url) return
    setScrapeError(null)
    setScrapingSite(site)
    scrape.mutate({ url })
  }

  function handleContinue() {
    // Persist any scraped data so the form can read it next step (URL params get long).
    // Prefer the first successfully-scraped site if multiple were tried.
    const firstScraped = Object.values(scrapedBySite).find((s) => s)
    if (firstScraped && typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(firstScraped))
    } else if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }

    const params = new URLSearchParams({ type, booking, subtype })
    if (selected.size > 0) {
      params.set('sites', Array.from(selected).join(','))
    }
    router.push(`/manage/listings/new/name?${params.toString()}`)
  }

  // /residential booking-type picker was removed — back goes straight to /new.
  const backHref = `/manage/listings/new`
  void booking // silence unused-var warning; kept on URL for downstream pages
  const canContinue = selected.size > 0

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        ย้อนกลับ
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          ที่พักของท่านเปิดให้จองบนเว็บไซต์ใดอีกบ้าง?
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          หากที่พักของท่านลงทะเบียนอยู่บนเว็บไซต์การเดินทางอื่น ๆ ท่านสามารถจดทะเบียนได้รวดเร็วยิ่งขึ้น —
          วางลิงก์ที่พักแล้วระบบจะ<span className="font-semibold text-brand-700">ดึงข้อมูลให้อัตโนมัติ</span>
          (ชื่อ ห้องนอน ห้องน้ำ จำนวนแขก รูปภาพ)
        </p>
      </div>

      <div className="space-y-2">
        {sites.map((s) => {
          const checked = selected.has(s.key)
          const showUrl = checked && !s.exclusive
          const scraped = scrapedBySite[s.key]
          const isScraping = scrapingSite === s.key
          return (
            <div key={s.key}>
              <button
                type="button"
                onClick={() => toggle(s)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium transition-all',
                  checked
                    ? 'border-brand-500 bg-brand-50/40 shadow-sm ring-1 ring-brand-500/30'
                    : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/20',
                )}
                aria-pressed={checked}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                    checked
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-gray-300 bg-white',
                  )}
                  aria-hidden
                >
                  {checked && <Icon name="check" className="size-3" />}
                </span>
                <span className={cn('flex-1 truncate', checked && 'text-brand-700')}>
                  {s.label}
                </span>
              </button>

              {/* URL input + "ดึงข้อมูล" button + preview */}
              {showUrl && (
                <div className="mt-2 space-y-2 pl-8">
                  <div className="flex gap-2">
                    <Input
                      value={urlByPicker[s.key] ?? ''}
                      onChange={(e) =>
                        setUrlByPicker((prev) => ({ ...prev, [s.key]: e.target.value }))
                      }
                      placeholder={`วางลิงก์ที่พักจาก ${s.label}`}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleScrape(s.key)}
                      disabled={!urlByPicker[s.key]?.trim() || isScraping}
                    >
                      {isScraping ? (
                        <>
                          <Icon name="spinner" spin className="size-3.5" />
                          กำลังดึง
                        </>
                      ) : (
                        <>
                          <Icon name="download" className="size-3.5" />
                          ดึงข้อมูล
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Preview chip showing what was scraped */}
                  {scraped && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                      <div className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-700">
                        <Icon name="check" className="size-3.5" />
                        ดึงข้อมูลสำเร็จ จาก {scraped.source}
                      </div>
                      {scraped.name && (
                        <div className="mb-1 truncate text-gray-900">
                          <span className="text-gray-500">ชื่อ:</span>{' '}
                          <span className="font-medium">{scraped.name}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {scraped.bedrooms != null && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-emerald-200">
                            🛏 {scraped.bedrooms} ห้องนอน
                          </span>
                        )}
                        {scraped.bathrooms != null && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-emerald-200">
                            🛁 {scraped.bathrooms} ห้องน้ำ
                          </span>
                        )}
                        {scraped.maxGuests != null && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-emerald-200">
                            👥 {scraped.maxGuests} ท่าน
                          </span>
                        )}
                        {scraped.checkinTime && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-emerald-200">
                            🕐 เช็คอิน {scraped.checkinTime}
                          </span>
                        )}
                        {scraped.checkoutTime && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-emerald-200">
                            🕘 เช็คเอาท์ {scraped.checkoutTime}
                          </span>
                        )}
                        {scraped.images.length > 0 && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-emerald-200">
                            🖼 {scraped.images.length} รูป
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {scrapeError && (
          <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {scrapeError}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
        <Link href={backHref}>
          <Button variant="secondary" type="button">
            <Icon name="chevronLeft" className="size-3.5" />
          </Button>
        </Link>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 sm:flex-initial sm:px-10"
        >
          ดำเนินการต่อ
        </Button>
      </div>
    </div>
  )
}
