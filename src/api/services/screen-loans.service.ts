import { ENDPOINTS } from '../endpoints'
import { get, patch, post } from '../http'
import type { ScreenLoan, ScreenLoanStatus } from '../../types'

export type ListScreenLoansParams = {
  borrowerName?: string
  status?: ScreenLoanStatus | ''
}

export type CreateScreenLoanPayload = {
  assetId: number
  borrowerFirstName: string
  borrowerLastName: string
  borrowerDepartment?: string
  loanDate: string
  expectedReturnDate: string
  note?: string
}

export function listScreenLoansService(params: ListScreenLoansParams = {}): Promise<ScreenLoan[]> {
  const searchParams = new URLSearchParams()
  if (params.borrowerName) searchParams.set('borrowerName', params.borrowerName)
  if (params.status) searchParams.set('status', params.status)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.screenLoans.base}?${query}` : ENDPOINTS.screenLoans.base

  return get<ScreenLoan[]>(path)
}

export function createScreenLoanService(payload: CreateScreenLoanPayload): Promise<ScreenLoan> {
  return post<CreateScreenLoanPayload, ScreenLoan>(ENDPOINTS.screenLoans.base, payload)
}

export function markScreenLoanReturnedService(id: number): Promise<ScreenLoan> {
  return patch<Record<string, never>, ScreenLoan>(`${ENDPOINTS.screenLoans.base}/${id}/return`, {})
}
