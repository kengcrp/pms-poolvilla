import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ICONS, type IconName } from '../icons'
import { cn } from '../cn'

interface IconProps {
  name: IconName
  className?: string
  /** Spin (e.g. loading spinner) */
  spin?: boolean
  /** Pulse animation */
  pulse?: boolean
  /** Fixed-width (useful inside menus for alignment) */
  fixedWidth?: boolean
  /** Aria label (defaults to icon name) */
  'aria-label'?: string
}

export function Icon({ name, className, spin, pulse, fixedWidth, ...rest }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={ICONS[name]}
      className={cn('inline-block', className)}
      spin={spin}
      pulse={pulse}
      fixedWidth={fixedWidth}
      {...rest}
    />
  )
}

export type { IconName }
