import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from './auth'

export function AuthGuard({ children }: PropsWithChildren) {
  const location = useLocation()
  if (!isAuthenticated()) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return children
}
