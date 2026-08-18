import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { Modal } from './Modal'
import { Button } from './Button'

export type CalendarFilterValue = Date | null | [Date | null, Date | null]

type CalendarFilterModalProps = {
  open: boolean
  title: string
  value: CalendarFilterValue
  onClose: () => void
  onApply: (value: CalendarFilterValue) => void
  onClear: () => void
}

function formatDateLabel(date?: Date | null): string {
  if (!date) return '-'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function rangeLabel(value: CalendarFilterValue): string {
  if (!value) return 'Aucune periode'

  if (Array.isArray(value)) {
    const [rawStart, rawEnd] = value
    const start = rawStart ?? rawEnd
    const end = rawEnd ?? rawStart

    if (!start || !end) return 'Aucune periode'

    const startLabel = formatDateLabel(start)
    const endLabel = formatDateLabel(end)

    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`
  }

  return formatDateLabel(value)
}

export function CalendarFilterModal({
  open,
  title,
  value,
  onClose,
  onApply,
  onClear,
}: CalendarFilterModalProps) {
  const [draftValue, setDraftValue] = useState<CalendarFilterValue>(value)
  const [snapshot, setSnapshot] = useState({ open, value })

  if (open !== snapshot.open || value !== snapshot.value) {
    setSnapshot({ open, value })
    if (open) {
      setDraftValue(value)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          <Button
            type="button"
            variant="default"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={onClear}
          >
            Reinitialiser
          </Button>
          <Button
            type="button"
            variant="primary"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={() => onApply(draftValue)}
          >
            Appliquer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Periode selectionnee
          </div>
          <div className="mt-1 text-sm font-medium text-gray-900">{rangeLabel(draftValue)}</div>
        </div>

        <div className="app-calendar-modal">
          <Calendar
            value={draftValue}
            onChange={(nextValue) => setDraftValue(nextValue as CalendarFilterValue)}
            selectRange
            allowPartialRange
            locale="fr-FR"
          />
        </div>
      </div>
    </Modal>
  )
}
