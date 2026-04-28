import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Asset } from '../../types'
import { Button, Input, Select } from '../Ui'

type AssignableAsset = Pick<Asset, 'id' | 'inventoryNumber' | 'type' | 'brand' | 'model'>

type DrawerAssignmentsProps = {
  isOpen: boolean
  onClose: () => void
  assignable: AssignableAsset[]
  assetId: number | ''
  setAssetId: Dispatch<SetStateAction<number | ''>>
  department: string
  setDepartment: Dispatch<SetStateAction<string>>
  users: string[]
  setUsers: Dispatch<SetStateAction<string[]>>
  startDate: string
  setStartDate: Dispatch<SetStateAction<string>>
  loading: boolean
  onSubmit: (e: FormEvent) => void | Promise<void>
}

const ANIMATION_MS = 220

export function DrawerAssignments({
  isOpen,
  onClose,
  assignable,
  assetId,
  setAssetId,
  department,
  setDepartment,
  users,
  setUsers,
  startDate,
  setStartDate,
  loading,
  onSubmit,
}: DrawerAssignmentsProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const id = window.setTimeout(() => setVisible(true), 10)
      return () => window.clearTimeout(id)
    }
    setVisible(false)
    const id = window.setTimeout(() => setMounted(false), ANIMATION_MS)
    return () => window.clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    if (!mounted) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [mounted, loading, onClose])

  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 min-h-screen min-h-[100dvh]">
      <button
        type="button"
        className={`absolute inset-0 min-h-screen min-h-[100dvh] bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          if (!loading) onClose()
        }}
        aria-label="Fermer"
      />

      <aside
        className={`absolute inset-y-0 right-0 flex w-full min-h-0 min-w-0 max-w-xl flex-col overflow-x-hidden border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Transférer un matériel vers une direction"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <h3 className="min-w-0 text-base font-semibold leading-snug text-gray-900">
              Transférer un matériel du Stock vers une Direction
            </h3>
            <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
              Fermer
            </Button>
          </div>

          <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={onSubmit}>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <Select
                  className="md:col-span-2"
                  label="Matériel"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Sélectionner…</option>
                  {assignable.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.inventoryNumber} — {a.type} — {a.brand} {a.model}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Direction / Service"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
                <Input label="Date début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <div className="space-y-2 md:col-span-2 max-w-md">
                  <div className="mb-1 text-xs font-medium text-gray-600">Utilisateurs</div>
                  {users.map((value, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        className="min-w-0 flex-1 border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        placeholder={index === 0 ? "Nom de l'utilisateur" : 'Autre utilisateur'}
                        value={value}
                        onChange={(e) => {
                          const next = [...users]
                          next[index] = e.target.value
                          setUsers(next)
                        }}
                      />
                      <Button
                        type="button"
                        variant="default"
                        className="cursor-pointer shrink-0"
                        onClick={() => {
                          if (users.length <= 1) return
                          setUsers(users.filter((_, i) => i !== index))
                        }}
                        disabled={users.length <= 1}
                        title="Supprimer"
                      >
                        −
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="default"
                      className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                      onClick={() => setUsers([...users, ''])}
                    >
                      + Ajouter un utilisateur
                    </Button>
                  </div>
                </div>
                <p className="md:col-span-2 text-xs text-slate-600">
                  Une nouvelle affectation clôt automatiquement l'affectation active précédente (si existante).
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
                Affecter / transférer
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
