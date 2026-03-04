import { useState, useCallback } from 'react'
import type { LoginRequest, LoginResponse } from '../services/auth.service'
import { loginService } from '../services/auth.service'

type UseLoginResult = {
  login: (payload: LoginRequest) => Promise<LoginResponse>
  loading: boolean
  error: string | null
}

export function useLogin(): UseLoginResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (payload: LoginRequest) => {
    setLoading(true)
    setError(null)
    try {
      const res = await loginService(payload)
      return res
    } catch (e: any) {
      const message = e?.message ?? "Échec de la connexion."
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { login, loading, error }
}

