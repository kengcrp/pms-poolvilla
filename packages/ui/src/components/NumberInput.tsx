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
 * - Empty / 0 shows empty + placeholder so user can type fresh on focus
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, placeholder, ...props }, ref) => {
    const display = !value || value === 0 ? '' : value.toLocaleString('en-US')

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder ?? '0'}
        onChange={(e) => {
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
