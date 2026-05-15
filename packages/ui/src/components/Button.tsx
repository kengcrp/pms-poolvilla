import * as React from 'react'
import { cn } from '../cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500 shadow-brand-600/20',
  secondary:
    'bg-white border border-gray-200 text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-300',
  outline:
    'border border-brand-600 text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-500',
  ghost: 'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-300',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500 shadow-red-600/20',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'h-10 w-10',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={cn(base, variantClass[variant], sizeClass[size], className)} {...props} />
  ),
)
Button.displayName = 'Button'
