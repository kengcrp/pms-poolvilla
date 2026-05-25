import * as React from 'react'
import { Input } from './Input'

interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
}

/**
 * Number input with thousands-comma formatting on display.
 * - Stores/emits raw number
 * - Renders as "10,000" using `toLocaleString`
 * - User input is stripped of non-digits and parsed back to number
 * - On focus, the field ALWAYS displays empty (regardless of current value) so the user
 *   can type fresh without backspacing. Underlying value is unchanged until they type;
 *   if they blur without typing, the original value re-appears.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, placeholder, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false)
    const [hasTyped, setHasTyped] = React.useState(false)
    const formatted = !value || value === 0 ? '' : value.toLocaleString('en-US')
    // Show empty while focused + untouched so any existing number disappears on click
    const display = focused && !hasTyped ? '' : formatted

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder ?? '0'}
        onFocus={(e) => {
          setFocused(true)
          setHasTyped(false)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          setHasTyped(false)
          onBlur?.(e)
        }}
        onChange={(e) => {
          setHasTyped(true)
          // Strip everything except digits so commas pasted in get ignored
          const raw = e.target.value.replace(/[^\d]/g, '')
          onChange(Number(raw || 0))
        }}
        {...props}
      />
    )
  },
)
NumberInput.displayName = 'NumberInput'
