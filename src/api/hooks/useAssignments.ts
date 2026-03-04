import { useCallback, useState } from 'react'
import type { Assignment } from '../../types'
import {
  createAssignmentForAssetService,
  endAssignmentService,
  listAssignmentsService,
  type CreateAssignmentPayload,
  type ListAssignmentsParams,
} from '../services/assignments.service'

type UseAssignmentsResult = {
  fetchAssignments: (params?: ListAssignmentsParams) => Promise<Assignment[]>
  createAssignmentForAsset: (assetId: number, payload: CreateAssignmentPayload) => Promise<Assignment>
  endAssignment: (id: number) => Promise<Assignment>
  loading: boolean
  error: string | null
}

export function useAssignments(): UseAssignmentsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = useCallback(async (params?: ListAssignmentsParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listAssignmentsService(params ?? {})
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du chargement des affectations.'
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createForAsset = useCallback(async (assetId: number, payload: CreateAssignmentPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { assignment } = await createAssignmentForAssetService(assetId, payload)
      return assignment
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors de la création de l'affectation."
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const end = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const { assignment } = await endAssignmentService(id)
      return assignment
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors de la clôture de l'affectation."
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchAssignments,
    createAssignmentForAsset: createForAsset,
    endAssignment: end,
    loading,
    error,
  }
}
