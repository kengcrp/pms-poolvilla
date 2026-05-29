'use client'

/**
 * อัพโหลดวิดีโอที่พัก — grid of video thumbnails with search + pagination.
 * Currently UI-only with mock data.
 */

import { useMemo, useState } from 'react'
import { Icon } from '@pms/ui'

interface MockVideo {
  code: string
  location: string
  cover: string
}

const MOCK_VIDEOS: MockVideo[] = [
  { code: 'TN 003', location: 'พัทยา', cover: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80' },
  { code: 'TN 002', location: 'บางแสน', cover: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80' },
  { code: 'TN 001', location: 'บางแสน', cover: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80' },
  { code: 'TN 004', location: 'พัทยา', cover: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=600&q=80' },
  { code: 'TN 005', location: 'หัวหิน', cover: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80' },
  { code: 'TN 006', location: 'หัวหิน', cover: 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=600&q=80' },
  { code: 'TN 007', location: 'บางแสน', cover: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80' },
  { code: 'Harry Home Poolvilla', location: 'บางแสน', cover: 'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=600&q=80' },
]

const PAGE_SIZE = 8

export default function UploadVideosPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MOCK_VIDEOS
    return MOCK_VIDEOS.filter(
      (v) => v.code.toLowerCase().includes(q) || v.location.includes(search),
    )
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">upload_accommodation_video</h1>

      {/* Search bar */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="ค้นหาชื่อที่พัก"
            className="h-12 w-full rounded-full border border-gray-200 bg-white pl-11 pr-4 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Icon name="search" className="size-3.5" />
          ค้นหา
        </button>
      </div>

      <div className="text-sm text-gray-500">
        total_records_count: <span className="font-semibold text-gray-900">{filtered.length}</span>
      </div>

      {/* Grid */}
      {pageItems.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
          ไม่พบที่พักตามคำค้นหา
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pageItems.map((v) => (
            <VideoCard key={v.code} video={v} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          « ก่อนหน้า
        </button>
        <div className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-sm">
          {page}
        </div>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ถัดไป »
        </button>
      </div>
    </div>
  )
}

function VideoCard({ video }: { video: MockVideo }) {
  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.cover}
          alt={video.code}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Location pin chip — top-left */}
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm backdrop-blur">
          <Icon name="pin" className="size-2.5 text-brand-600" />
          {video.location}
        </div>
      </div>
      <div className="px-3 py-2.5 text-sm font-semibold text-gray-900">{video.code}</div>
    </div>
  )
}
