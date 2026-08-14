import type { PropsWithChildren } from 'react'

export function Table({
  columns,
  children,
}: PropsWithChildren<{ columns: string[] }>) {
  return (
    <div className="scrollbar-app w-full min-w-0 overflow-x-auto border border-gray-200 bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
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
