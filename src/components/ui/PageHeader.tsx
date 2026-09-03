interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="wm-page-header">
      <div className="min-w-0">
        <p className="wm-eyebrow">{eyebrow}</p>
        <h1 className="wm-title mt-2">{title}</h1>
        {description ? <p className="wm-subtitle">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
