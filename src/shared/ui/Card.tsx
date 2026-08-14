import type React from 'react'
import type { PropsWithChildren } from 'react'

export function Card({
  title,
  children,
  action,
}: PropsWithChildren<{ title?: string; action?: React.ReactNode }>) {
  return (
    <section className="min-w-0 border border-gray-200 bg-white shadow-sm">
      {title != null ? (
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
          <h2 className="min-w-0 truncate text-sm font-semibold text-gray-900">{title}</h2>
          {action != null ? (
            <div className="flex items-center gap-1">{action}</div>
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  )
}
