import { buildUrl } from './endpoints'

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

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
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
    const message =
      typeof responseBody === 'object' && responseBody && 'message' in responseBody
        ? String((responseBody as any).message)
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

export function del<T = unknown>(path: string, headers?: Record<string, string>) {
  return request<T>(path, { method: 'DELETE', headers })
}

