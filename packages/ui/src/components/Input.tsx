import * as React from 'react'
import { cn } from '../cn'

const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week'])
// On focus, move the caret to the END of the value — for non-zero text editing.
// Number inputs with a "0" value get cleared instead (see showEmpty logic below).
const CARET_AT_END_TYPES = new Set(['text', 'tel', 'email', 'url', 'search', 'password'])

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onClick, onFocus, onBlur, type, value, placeholder, onChange, ...props }, ref) => {
    // Date/time inputs lose their visible picker icon (hidden via global CSS) — open the
    // native picker programmatically on click so users still get a single-click experience.
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLInputElement>) => {
        onClick?.(e)
        if (type && PICKER_TYPES.has(type) && !e.defaultPrevented) {
          const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
          // showPicker exists in Chrome 99+/Firefox 101+/Safari 16.4+
          try {
            el.showPicker?.()
          } catch {
            // Some browsers throw if input isn't focusable/visible — ignore safely
          }
        }
      },
      [onClick, type],
    )

    // Number-input UX:
    //   - When the field has value `0` (or "") and user focuses, blank it visually so they
    //     can type fresh without backspacing the "0".
    //   - `hasTyped` flips on the first keystroke so the next "0" the user types is preserved.
    //   - For non-zero values (or non-number types), caret jumps to the end of the value
    //     so the user can append/edit naturally.
    const isNumber = type === 'number'
    const [focused, setFocused] = React.useState(false)
    const [hasTyped, setHasTyped] = React.useState(false)
    const isZero = isNumber && (value === 0 || value === '0' || value === '')
    const showEmpty = isNumber && focused && !hasTyped && isZero
    const displayValue = showEmpty
      ? ''
      : (value as React.InputHTMLAttributes<HTMLInputElement>['value'])
    const displayPlaceholder = placeholder ?? (isNumber ? '0' : undefined)

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true)
        setHasTyped(false)
        onFocus?.(e)
        const effectiveType = type ?? 'text'
        // Caret-at-end for text editing AND non-zero number values.
        // (Number+zero gets cleared via showEmpty so caret positioning is N/A.)
        const isTextLike = CARET_AT_END_TYPES.has(effectiveType)
        const isNonZeroNumber = isNumber && !isZero
        if ((isTextLike || isNonZeroNumber) && !e.defaultPrevented) {
          const el = e.target
          requestAnimationFrame(() => {
            try {
              const len = el.value.length
              if (typeof el.setSelectionRange === 'function') {
                el.setSelectionRange(len, len)
              }
            } catch {
              // ignore — some types don't support setSelectionRange
            }
          })
        }
      },
      [onFocus, type, isNumber, isZero],
    )

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false)
        setHasTyped(false)
        onBlur?.(e)
      },
      [onBlur],
    )

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isNumber) setHasTyped(true)
        onChange?.(e)
      },
      [isNumber, onChange],
    )

    return (
      <input
        ref={ref}
        type={type}
        value={displayValue}
        placeholder={displayPlaceholder}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-xs transition-all',
          'placeholder:text-gray-400',
          'hover:border-gray-300',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
          // Date/time pickers benefit from a pointer cursor
          type && PICKER_TYPES.has(type) && 'cursor-pointer',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
