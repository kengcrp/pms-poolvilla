'use client'

/**
 * Shared booking state for the property detail page.
 *
 * Workflow matches the 4-step sale-page UX:
 *   1. Both fields empty, mode = 'in'
 *   2. Click a date → set check-in, auto-flip mode to 'out'
 *   3. Check-in shows in sidebar, check-out still empty
 *   4. Click second date → set check-out, mode auto-flips back to 'in'
 *
 * Clearing a field (×) resets it to null + flips mode back to that field.
 */

import { createContext, useContext, useState } from 'react'

interface BookingState {
  checkin: Date | null
  checkout: Date | null
  setCheckin: (d: Date | null) => void
  setCheckout: (d: Date | null) => void
  /** Which field a date click should update next. */
  pickerMode: 'in' | 'out'
  setPickerMode: (m: 'in' | 'out') => void
  /** Click handler that respects current pickerMode + auto-flips after pick. */
  pickDate: (d: Date) => void
  /** Derived: nights between checkin and checkout (0 when either missing). */
  nights: number
}

const BookingCtx = createContext<BookingState | null>(null)

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [checkin, setCheckin] = useState<Date | null>(null)
  const [checkout, setCheckout] = useState<Date | null>(null)
  const [pickerMode, setPickerMode] = useState<'in' | 'out'>('in')

  function pickDate(d: Date) {
    if (pickerMode === 'in') {
      setCheckin(d)
      // If existing checkout becomes invalid (≤ new checkin) clear it; user
      // will pick it next as part of step 4.
      if (checkout && ymd(d) >= ymd(checkout)) setCheckout(null)
      setPickerMode('out')
    } else {
      if (!checkin || ymd(d) <= ymd(checkin)) return // ignore invalid
      setCheckout(d)
      setPickerMode('in')
    }
  }

  const nights = checkin && checkout
    ? Math.max(0, Math.round((checkout.getTime() - checkin.getTime()) / 86_400_000))
    : 0

  const value: BookingState = {
    checkin,
    checkout,
    setCheckin,
    setCheckout,
    pickerMode,
    setPickerMode,
    pickDate,
    nights,
  }

  return <BookingCtx.Provider value={value}>{children}</BookingCtx.Provider>
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingCtx)
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>')
  return ctx
}
