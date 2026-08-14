import { buildUrl } from './endpoints'
import { getSession, handleAuthenticationFailure } from '@core/auth/auth'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export class HttpError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const session = getSession()
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
    // Routes protégées : envoi du JWT dans l'en-tête Authorization
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
  }

  const res = await fetch(buildUrl(path), {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const responseBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleAuthenticationFailure()
    }

    const message =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody &&
      typeof (responseBody as { message: unknown }).message === 'string'
        ? (responseBody as { message: string }).message
        : `Erreur API (${res.status})`
    throw new HttpError(message, res.status, responseBody)
  }

  return responseBody as T
}

export function get<T>(path: string, headers?: Record<string, string>) {
  return request<T>(path, { method: 'GET', headers })
}

export function post<TRequest, TResponse = unknown>(path: string, body: TRequest, headers?: Record<string, string>) {
  return request<TResponse>(path, { method: 'POST', body, headers })
}

export function put<TRequest, TResponse = unknown>(path: string, body: TRequest, headers?: Record<string, string>) {
  return request<TResponse>(path, { method: 'PUT', body, headers })
}

export function patch<TRequest, TResponse = unknown>(path: string, body: TRequest, headers?: Record<string, string>) {
  return request<TResponse>(path, { method: 'PATCH', body, headers })
}

export function del<T = unknown>(path: string, headers?: Record<string, string>) {
  return request<T>(path, { method: 'DELETE', headers })
}

