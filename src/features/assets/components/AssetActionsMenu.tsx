import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Asset } from '@core/models'
import {
  DotsVerticalIcon,
  EyeIcon,
  HistoryIcon,
  IncidentIcon,
  PencilIcon,
  PrintIcon,
  ScreenLoanIcon,
  TransferAssignIcon,
  TrashIcon,
} from './AssetIcons'

type ActionMenuPosition = {
  top?: number
  right: number
  bottom?: number
}

type AssetActionsMenuProps = {
  asset: Asset
  loading: boolean
  loanLoading: boolean
  isLoanActive: boolean
  onView: (assetId: number) => void
  onEdit: (asset: Asset) => void
  onAssign: (assetId: number) => void
  onLoan: (assetId: number) => void
  onReport: (assetId: number) => void
  onPrint: (inventoryNumber: string) => void
  onDelete: (assetId: number) => void
}

export function AssetActionsMenu({
  asset,
  loading,
  loanLoading,
  isLoanActive,
  onView,
  onEdit,
  onAssign,
  onLoan,
  onReport,
  onPrint,
  onDelete,
}: AssetActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<ActionMenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const assignDisabled = asset.status !== 'EN_STOCK_NON_AFFECTE' || loading
  const loanDisabled = asset.status !== 'EN_STOCK_NON_AFFECTE' || isLoanActive || loading || loanLoading
  const reportDisabled =
    asset.status === 'EN_PANNE' || asset.status === 'EN_REPARATION' || loading

  const reportTitle =
    asset.status === 'EN_PANNE'
      ? 'Ce matériel est déjà en panne'
      : asset.status === 'EN_REPARATION'
        ? 'Ce matériel est déjà en réparation'
        : 'Signaler une panne pour ce matériel'

  const assignTitle =
    asset.status === 'EN_STOCK_NON_AFFECTE'
      ? 'Transférer / affecter vers une direction'
      : 'Réservé au matériel en stock non affecté'
  const loanTitle =
    isLoanActive || asset.status === 'EN_PRET'
      ? 'Ce matériel est déjà en prêt'
      : asset.status === 'EN_STOCK_NON_AFFECTE'
        ? 'Enregistrer un emprunt de matériel'
        : 'Réservé au matériel en stock non affecté'

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuHeight = 310
    const opensUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight
    const next: ActionMenuPosition = {
      right: Math.max(8, window.innerWidth - rect.right),
      ...(opensUp
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 6) }
        : { top: Math.min(rect.bottom + 6, window.innerHeight - 8) }),
    }
    setPosition(next)
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleScrollOrResize = () => updatePosition()

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open, updatePosition])

  const menuStyle: React.CSSProperties | undefined = position
    ? {
        position: 'fixed',
        right: position.right,
        top: position.top,
        bottom: position.bottom,
      }
    : undefined

  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors'
  const enabledClass = 'cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-950'
  const disabledClass = 'cursor-not-allowed text-gray-300'

  const runAction = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center cursor-pointer rounded border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60 ${
          loading || loanLoading ? 'opacity-70' : ''
        }`}
        title="Actions"
        aria-label={`Actions pour ${asset.inventoryNumber}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <DotsVerticalIcon className="h-4 w-4" />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              className="z-[60] min-w-[230px] overflow-hidden rounded border border-gray-200 bg-white py-1 shadow-lg"
              style={menuStyle}
              role="menu"
              aria-label={`Actions pour ${asset.inventoryNumber}`}
            >
              <button
                type="button"
                className={`${itemClass} ${loading ? disabledClass : enabledClass}`}
                title="Voir"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onView(asset.id))}
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Voir
              </button>

              {loading ? (
                <span className={`${itemClass} ${disabledClass}`} role="menuitem" aria-disabled="true">
                  <HistoryIcon className="h-3.5 w-3.5" />
                  Historique / aperçu
                </span>
              ) : (
                <Link
                  to={`/assets/${asset.id}`}
                  className={`${itemClass} ${enabledClass}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <HistoryIcon className="h-3.5 w-3.5" />
                  Historique / aperçu
                </Link>
              )}

              <button
                type="button"
                className={`${itemClass} ${loading ? disabledClass : enabledClass}`}
                title="Modifier"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onEdit(asset))}
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Modifier
              </button>

              <button
                type="button"
                className={`${itemClass} ${assignDisabled ? disabledClass : enabledClass}`}
                title={assignTitle}
                role="menuitem"
                disabled={assignDisabled}
                onClick={() => !assignDisabled && runAction(() => onAssign(asset.id))}
              >
                <TransferAssignIcon className="h-3.5 w-3.5" />
                Affecter
              </button>

              <button
                type="button"
                className={`${itemClass} ${loanDisabled ? disabledClass : enabledClass}`}
                title={loanTitle}
                role="menuitem"
                disabled={loanDisabled}
                onClick={() => !loanDisabled && runAction(() => onLoan(asset.id))}
              >
                <ScreenLoanIcon className="h-3.5 w-3.5" />
                Emprunter
              </button>

              <button
                type="button"
                className={`${itemClass} ${reportDisabled ? disabledClass : enabledClass}`}
                title={reportTitle}
                role="menuitem"
                disabled={reportDisabled}
                onClick={() => !reportDisabled && runAction(() => onReport(asset.id))}
              >
                <IncidentIcon className="h-3.5 w-3.5" />
                Signaler une panne
              </button>

              <button
                type="button"
                className={`${itemClass} ${loading ? disabledClass : enabledClass}`}
                title="Imprimer la fiche du materiel"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onPrint(asset.inventoryNumber))}
              >
                <PrintIcon className="h-3.5 w-3.5" />
                Imprimer
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                type="button"
                className={`${itemClass} ${
                  loading ? disabledClass : 'cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700'
                }`}
                title="Supprimer"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onDelete(asset.id))}
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
