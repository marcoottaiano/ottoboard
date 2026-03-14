const SIZE = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5' }

export function ColorDot({
  color,
  size = 'md',
}: {
  color: string | null
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={`${SIZE[size]} rounded-full flex-shrink-0`}
      style={{ background: color ?? '#6b7280' }}
    />
  )
}
