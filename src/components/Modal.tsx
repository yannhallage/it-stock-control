import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BeatLoader } from 'react-spinners'
import { Button } from './Ui'

type ModalProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  title: string
  size?: 'md' | 'lg' | 'xl'
  /** Contenu du pied (ex: boutons). Si non fourni, aucun footer. */
  footer?: React.ReactNode
  /** Fermer au clic sur le fond (backdrop). Défaut: true */
  closeOnBackdrop?: boolean
}>

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClass = size === 'xl' ? 'max-w-2xl' : size === 'lg' ? 'max-w-xl' : 'max-w-md'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal-backdrop-enter absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div className={`modal-panel-enter relative z-10 w-full ${sizeClass} rounded-lg border border-gray-200 bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 text-gray-600">{children}</div>
        {footer != null ? (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

type ConfirmModalProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary' | 'default'
  loading?: boolean
}>

/** Modal de confirmation avec boutons Annuler / Confirmer. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeOnBackdrop={!loading}
      footer={
        <>
          <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} disabled={loading} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60">
            {loading ? <BeatLoader size={8} color="white" /> : null}
            {loading ? '' : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
