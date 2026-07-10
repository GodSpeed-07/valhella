import type { ButtonHTMLAttributes } from 'react'
import Icon, { type IconName } from './Icon'
import Spinner from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  loading?: boolean
}

export default function Button({
  variant = 'soft',
  size = 'md',
  icon,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn-${variant}`]
  if (size !== 'md') classes.push(`btn-${size}`)
  if (className) classes.push(className)
  return (
    <button className={classes.join(' ')} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}
