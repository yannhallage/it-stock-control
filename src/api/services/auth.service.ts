import { ENDPOINTS } from '../endpoints'
import { post } from '../http'

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken?: string
  tokenType?: string
  expiresIn?: number
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
} & Record<string, unknown>

export async function loginService(credentials: LoginRequest): Promise<LoginResponse> {
  return post<LoginRequest, LoginResponse>(ENDPOINTS.auth.login, credentials)
}
