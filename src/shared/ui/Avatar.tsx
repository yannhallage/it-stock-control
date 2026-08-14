/** Affiche les initiales dans un cercle (avatar). */
export function Avatar({
  name,
  size = 'md',
  maxLetters,
}: {
  name: string
  size?: 'sm' | 'md'
  /** Limite le nombre de lettres affichées (ex: 1 pour une seule initiale). */
  maxLetters?: number
}) {
  const raw = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const initials = maxLetters != null ? raw.slice(0, maxLetters) : raw.slice(0, 2)
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'
  const hue = name.length > 0 ? (name.charCodeAt(0) * 17) % 360 : 200
  const bg = `hsl(${hue}, 45%, 40%)`
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${sizeClass}`}
      style={{ backgroundColor: bg }}
      title={name}
    >
      {initials || '?'}
    </span>
  )
}
