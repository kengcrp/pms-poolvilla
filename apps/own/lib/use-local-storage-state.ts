'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Like useState but persists the value to localStorage.
 * - Reads from localStorage on mount (SSR-safe, hydrates after mount to avoid hydration mismatch)
 * - Writes to localStorage only AFTER mount, on real value changes — never on the initial render.
 *
 * The skip-on-mount guard is critical: without it, the persist effect would overwrite a stored
 * value (e.g. "2" set on another page) with the local `initialValue` (e.g. 1) before the hydrate
 * effect's `setValue` has a chance to flush. Result: switching pages would silently reset state.
 *
 * @param key — localStorage key
 * @param initialValue — used until the stored value is hydrated, and as fallback when nothing is stored
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue)
  const skipNextPersistRef = useRef(true)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        setValue(JSON.parse(raw) as T)
      }
    } catch {
      // Ignore — invalid JSON or storage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Persist on change — skip the very first run so we don't overwrite stored values with `initialValue`
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore quota / private-mode errors
    }
  }, [key, value])

  return [value, setValue]
}
