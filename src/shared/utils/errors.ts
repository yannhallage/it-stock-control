/** Message lisible à partir d'une valeur `catch` sans utiliser `any`. */
export function errorMessageFromUnknown(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message.trim()) return e.message
  return fallback
}
