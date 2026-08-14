import type { PropsWithChildren } from 'react'

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
