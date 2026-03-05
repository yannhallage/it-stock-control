import type React from 'react'
import type { PropsWithChildren } from 'react'

export function PageTitle({ children }: PropsWithChildren) {
  return (
    <h1 className="flex items-center gap-3 text-2xl font-semibold text-gray-900">
      {children}
    </h1>
  )
}

export function Card({
  title,
  children,
  action,
}: PropsWithChildren<{ title?: string; action?: React.ReactNode }>) {
  return (
    <section className=" border border-gray-200 bg-white shadow-sm">
      {title != null ? (
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {action != null ? (
            <div className="flex items-center gap-1">{action}</div>
          ) : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}

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

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string },
) {
  const { label, className, ...rest } = props
  return (
    <label className="block">
      {label != null ? (
        <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      ) : null}
      <input
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

export function Table({
  columns,
  children,
}: PropsWithChildren<{ columns: string[] }>) {
  return (
    <div className="overflow-x-auto  border border-gray-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((c) => (
              <th
                key={c}
                className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

/** Affiche les initiales dans un cercle (avatar). */
export function Avatar({
  name,
  size = 'md',
  maxLetters,
}: {
  name: string
  size?: 'sm' | 'md'
  /** Limite le nombre de lettres affichées (ex: 1 pour une seule initiale). */
  maxLetters?: number
}) {
  const raw = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const initials = maxLetters != null ? raw.slice(0, maxLetters) : raw.slice(0, 2)
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'
  const hue = name.length > 0 ? (name.charCodeAt(0) * 17) % 360 : 200
  const bg = `hsl(${hue}, 45%, 40%)`
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${sizeClass}`}
      style={{ backgroundColor: bg }}
      title={name}
    >
      {initials || '?'}
    </span>
  )
}

/** Tooltip au survol (hover). */
export function Tooltip({
  children,
  text,
  placement = 'top',
}: PropsWithChildren<{
  text: string
  placement?: 'top' | 'bottom' | 'right'
}>) {
  const positionClass =
    placement === 'bottom'
      ? 'left-1/2 top-full mt-1 -translate-x-1/2'
      : placement === 'right'
        ? 'left-full top-1/2 ml-1 -translate-y-1/2'
        : 'left-1/2 bottom-full mb-1 -translate-x-1/2'
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className={`pointer-events-none absolute z-10 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100 ${positionClass}`}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  )
}
