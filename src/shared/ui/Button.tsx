import type React from 'react'

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'default' | 'danger'
  },
) {
  const { variant = 'default', className, ...rest } = props
  const base =
    'inline-flex items-center justify-center  border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const v =
    variant === 'primary'
      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
      : variant === 'danger'
        ? 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  return <button className={[base, v, className].filter(Boolean).join(' ')} {...rest} />
}
