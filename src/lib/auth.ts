const STORAGE_KEY = 'parc-info-auth'
const SESSION_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export type Session = {
  user: string
  accessToken?: string
  expiresAt: number
}

function getStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Session
    if (!data.user || typeof data.expiresAt !== 'number') return null
    return data
  } catch {
    return null
  }
}

/** Retourne la session si elle existe et n'est pas expirée, sinon null. */
export function getSession(): Session | null {
  const data = getStored()
  if (!data) return null
  if (Date.now() >= data.expiresAt) {
    clearSession()
    return null
  }
  return data
}

/** Enregistre une session valide 30 minutes. */
export function setSession(user: string, accessToken?: string): void {
  const session: Session = {
    user,
    ...(accessToken && { accessToken }),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

/** Supprime la session (déconnexion). */
export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** true si une session valide (non expirée) existe. */
export function isAuthenticated(): boolean {
  return getSession() !== null
}
