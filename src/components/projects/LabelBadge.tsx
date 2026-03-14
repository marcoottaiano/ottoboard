export function LabelBadge({ labels, maxVisible = 2 }: { labels: string[]; maxVisible?: number }) {
  if (!labels.length) return null
  const visible = labels.slice(0, maxVisible)
  const overflow = labels.length - maxVisible

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((label) => (
        <span
          key={label}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-white/10 text-gray-400 border border-white/10"
        >
          {label}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-gray-600">+{overflow}</span>
      )}
    </div>
  )
}
