'use client'

/**
 * Full photo gallery page — opens when user clicks "ดูภาพทั้งหมด" on the
 * property detail page.
 *
 * URL: /s/[code]/[slug]/photos
 *
 * Layout: header with back → top category-thumbnail nav → each category as a
 * vertical section with its photos in a grid (1+2 wireframe pattern).
 * Click any photo → opens lightbox modal with prev/next navigation.
 */

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@pms/ui'

interface MockPhotoCategory {
  key: string
  label: string
  cover: string
  photos: string[]
}

// Reuse the same property mock structure but grouped by category
const MOCK_CATEGORIES: MockPhotoCategory[] = [
  {
    key: 'general',
    label: 'ทั่วไป',
    cover:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=80',
    photos: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    ],
  },
  {
    key: 'bedroom',
    label: 'ห้องนอน',
    cover:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
    photos: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
    ],
  },
  {
    key: 'pool',
    label: 'สระว่ายน้ำ',
    cover:
      'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=400&q=80',
    photos: [
      'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    ],
  },
  {
    key: 'bathroom',
    label: 'ห้องน้ำ',
    cover:
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80',
    photos: [
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80',
      'https://images.unsplash.com/photo-1564540583246-934409427776?w=800&q=80',
    ],
  },
]

// ─── Page ──────────────────────────────────────────────────────────────

export default function AllPhotosPage({
  params,
}: {
  params: Promise<{ code: string; slug: string }>
}) {
  const { code, slug } = use(params)
  const categories = MOCK_CATEGORIES

  // Flatten all photos across categories into a single list for lightbox nav
  const allPhotos: { src: string; label: string }[] = categories.flatMap((cat) =>
    cat.photos.map((src) => ({ src, label: cat.label })),
  )
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const closeLightbox = useCallback(() => setLightboxIdx(null), [])
  const prev = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + allPhotos.length) % allPhotos.length))
  }, [allPhotos.length])
  const next = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % allPhotos.length))
  }, [allPhotos.length])

  // Keyboard nav: Esc closes, arrows navigate
  useEffect(() => {
    if (lightboxIdx === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIdx, closeLightbox, prev, next])

  function openPhotoBySrc(src: string) {
    const idx = allPhotos.findIndex((p) => p.src === src)
    if (idx >= 0) setLightboxIdx(idx)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <PhotosHeader code={code} slug={slug} />

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-4">
        {/* Top category-thumbnail nav — click jumps to section via #anchor */}
        <CategoryNav categories={categories} />

        {/* Sections — one per category */}
        <div className="mt-6 space-y-8">
          {categories.map((cat) => (
            <CategorySection key={cat.key} category={cat} onOpen={openPhotoBySrc} />
          ))}
        </div>
      </main>

      {/* Lightbox modal — opens when any photo is clicked */}
      {lightboxIdx !== null && allPhotos[lightboxIdx] && (
        <Lightbox
          photo={allPhotos[lightboxIdx]}
          index={lightboxIdx}
          total={allPhotos.length}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  )
}

// ─── Lightbox modal ───────────────────────────────────────────────────

function Lightbox({
  photo,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  photo: { src: string; label: string }
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar — label + counter + close */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
        <div className="text-sm font-medium text-white">
          {photo.label}{' '}
          <span className="text-white/60">
            ({index + 1} / {total})
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="ปิด"
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          aria-label="ก่อนหน้า"
          className="absolute left-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
        >
          <Icon name="chevronLeft" className="size-5" />
        </button>
      )}

      {/* Photo */}
      <div className="relative max-h-[88vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.label}
          className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
        />
      </div>

      {/* Next */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          aria-label="ถัดไป"
          className="absolute right-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
        >
          <Icon name="chevronRight" className="size-5" />
        </button>
      )}

      {/* Bottom hint */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-4 py-3 text-center text-xs text-white/70">
        คลิกที่พื้นที่ว่างเพื่อปิด · ใช้ ← → เพื่อเลื่อนรูป
      </div>
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────

function PhotosHeader({ code, slug }: { code: string; slug: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href={`/s/${code}/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700"
        >
          <Icon name="chevronLeft" className="size-4" />
          กลับ
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-brand-600 text-white">
            <Icon name="beach" className="size-4" />
          </div>
          <span className="text-base font-bold text-gray-900">Logoipsum</span>
        </div>
        <div className="size-7 rounded-full bg-brand-600" aria-hidden />
      </div>
    </header>
  )
}

// ─── Top thumbnail nav ─────────────────────────────────────────────────

function CategoryNav({ categories }: { categories: MockPhotoCategory[] }) {
  return (
    <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
      {categories.map((cat) => (
        <a
          key={cat.key}
          href={`#section-${cat.key}`}
          className="group flex w-28 shrink-0 flex-col items-center"
        >
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 transition-all group-hover:ring-2 group-hover:ring-brand-400">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cat.cover} alt={cat.label} className="size-full object-cover" />
          </div>
          <span className="mt-1.5 text-xs font-medium text-gray-700 group-hover:text-brand-700">
            {cat.label}
          </span>
        </a>
      ))}
    </div>
  )
}

// ─── Category section ──────────────────────────────────────────────────

function CategorySection({
  category,
  onOpen,
}: {
  category: MockPhotoCategory
  onOpen: (src: string) => void
}) {
  // Render photos in chunks of 3 — each chunk uses 1+2 layout (big left,
  // 2 stacked right) matching the wireframe. Remaining < 3 use simpler fallbacks.
  const chunks: string[][] = []
  for (let i = 0; i < category.photos.length; i += 3) {
    chunks.push(category.photos.slice(i, i + 3))
  }
  return (
    <section id={`section-${category.key}`} className="scroll-mt-20">
      <h3 className="mb-3 text-base font-bold text-gray-900 sm:text-lg">
        {category.label}{' '}
        <span className="text-sm font-medium text-gray-500">
          ({category.photos.length} รูป)
        </span>
      </h3>

      <div className="space-y-2">
        {chunks.map((chunk, i) => (
          <PhotoChunk
            key={i}
            photos={chunk}
            altPrefix={category.label}
            startIdx={i * 3}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  )
}

/** 1-3 photos rendered in the wireframe pattern:
 *  - 1 photo:  full-width
 *  - 2 photos: big-left + tall-right (2:1 ratio)
 *  - 3 photos: big-left + 2 stacked-right (3:2 grid; hero spans 2 rows)
 */
function PhotoChunk({
  photos,
  altPrefix,
  startIdx,
  onOpen,
}: {
  photos: string[]
  altPrefix: string
  startIdx: number
  onOpen: (src: string) => void
}) {
  if (photos.length === 1) {
    return (
      <div className="aspect-[16/9]">
        <PhotoTile src={photos[0]!} alt={`${altPrefix}-${startIdx + 1}`} onOpen={onOpen} />
      </div>
    )
  }
  if (photos.length === 2) {
    return (
      <div className="grid aspect-[2/1] grid-cols-2 gap-2">
        {photos.map((src, i) => (
          <PhotoTile
            key={i}
            src={src}
            alt={`${altPrefix}-${startIdx + i + 1}`}
            onOpen={onOpen}
          />
        ))}
      </div>
    )
  }
  // 3 photos — the wireframe pattern
  const [hero, side1, side2] = photos
  return (
    <div className="grid aspect-[3/2] grid-cols-3 grid-rows-2 gap-2">
      <div className="col-span-2 row-span-2">
        {hero && (
          <PhotoTile src={hero} alt={`${altPrefix}-${startIdx + 1}`} onOpen={onOpen} />
        )}
      </div>
      {side1 && <PhotoTile src={side1} alt={`${altPrefix}-${startIdx + 2}`} onOpen={onOpen} />}
      {side2 && <PhotoTile src={side2} alt={`${altPrefix}-${startIdx + 3}`} onOpen={onOpen} />}
    </div>
  )
}

/** Single clickable photo tile — wrapper makes the photo a button that opens
 *  the lightbox modal on click. Hover gives a subtle zoom + darken cue. */
function PhotoTile({
  src,
  alt,
  onOpen,
}: {
  src: string
  alt: string
  onOpen: (src: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(src)}
      className="group block size-full overflow-hidden rounded-xl bg-gray-100"
      title="คลิกเพื่อขยายรูป"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </button>
  )
}
