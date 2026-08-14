import type React from 'react'

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string },
) {
  const { label, className, ...rest } = props
  return (
    <label className="block">
      {label != null ? (
        <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      ) : null}
      <textarea
        className={[
          'w-full  border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </label>
  )
}
