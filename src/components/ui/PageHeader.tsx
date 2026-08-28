interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="ob-page-header">
      <div>
        <p className="ob-eyebrow">{eyebrow}</p>
        <h1 className="ob-title mt-2">{title}</h1>
        {description ? <p className="ob-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
