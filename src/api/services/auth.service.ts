import { ENDPOINTS } from '../endpoints'
import { post } from '../http'

export type LoginRequest = {
  email: string
  password: string
}

// Adapter ce type en fonction de la réponse réelle du backend
export type LoginResponse = {
  accessToken?: string
  user?: {
    id: string | number
    email: string
    name?: string
  }
} & Record<string, unknown>

export async function loginService(credentials: LoginRequest): Promise<LoginResponse> {
  return post<LoginRequest, LoginResponse>(ENDPOINTS.auth.login, credentials)
}

