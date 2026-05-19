import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import type { ScreenLoan } from '../../types'
import {
  createScreenLoanService,
  listScreenLoansService,
  markScreenLoanReturnedService,
  type CreateScreenLoanPayload,
  type ListScreenLoansParams,
} from '../services/screen-loans.service'

type UseScreenLoansResult = {
  fetchScreenLoans: (params?: ListScreenLoansParams) => Promise<ScreenLoan[]>
  createScreenLoan: (payload: CreateScreenLoanPayload) => Promise<ScreenLoan>
  markScreenLoanReturned: (id: number) => Promise<ScreenLoan>
  loading: boolean
  error: string | null
}

export function useScreenLoans(): UseScreenLoansResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScreenLoans = useCallback(async (params?: ListScreenLoansParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listScreenLoansService(params ?? {})
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors du chargement des emprunts de matériel.')
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createScreenLoan = useCallback(async (payload: CreateScreenLoanPayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createScreenLoanService(payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement de l'emprunt de matériel.")
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const markScreenLoanReturned = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      return await markScreenLoanReturnedService(id)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors du retour du matériel.')
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchScreenLoans,
    createScreenLoan,
    markScreenLoanReturned,
    loading,
    error,
  }
}
