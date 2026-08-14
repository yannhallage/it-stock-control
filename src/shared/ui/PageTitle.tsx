import type { PropsWithChildren } from 'react'

export function PageTitle({ children }: PropsWithChildren) {
  return (
    <h1 className="flex min-w-0 items-center gap-3 text-2xl font-semibold text-gray-900">
      {children}
    </h1>
  )
}
