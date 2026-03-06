import type { AssetStatus } from '../types'
import { assetStatusLabel } from '../lib/format'

/* Style pilule : vert = en service, bleu = affecté, orange = en attente/pause, gris = neutre */
const statusStyles: Record<AssetStatus, string> = {
  EN_SERVICE: 'bg-emerald-100 text-emerald-800',
  AFFECTE: 'bg-blue-100 text-blue-800',
  EN_STOCK: 'bg-[var(--color-pill-active)] text-[var(--color-pill-active-text)]',
  EN_PANNE: 'bg-[var(--color-pill-paused)] text-[var(--color-pill-paused-text)]',
  EN_REPARATION: 'bg-[var(--color-pill-paused)] text-[var(--color-pill-paused-text)]',
  HORS_SERVICE: 'bg-gray-100 text-gray-700',
}

export function StatusBadge({ status }: { status: AssetStatus }) {
  const isActive = ['EN_SERVICE', 'AFFECTE', 'EN_STOCK'].includes(status)
  const isPaused = ['EN_PANNE', 'EN_REPARATION'].includes(status)
  const dotClass =
    status === 'EN_SERVICE'
      ? 'bg-emerald-500'
      : status === 'AFFECTE'
        ? 'bg-blue-500'
        : isActive
          ? 'bg-emerald-500'
          : isPaused
            ? 'bg-amber-500'
            : 'bg-gray-500'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
      ].join(' ')}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
      {assetStatusLabel(status)}
    </span>
  )
}
