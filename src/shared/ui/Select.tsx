import type React from 'react'

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string },
) {
  const { label, className, children, ...rest } = props
  return (
    <label className="block">
      {label != null ? (
        <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      ) : null}
      <select
        className={[
          'w-full  border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {children}
      </select>
    </label>
  )
}
