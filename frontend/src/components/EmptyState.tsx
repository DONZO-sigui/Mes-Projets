interface Props {
  icon?: string
  title?: string
  description?: string
  className?: string
}

export function EmptyState({
  icon = 'bi-inbox',
  title = 'Aucun résultat',
  description,
  className = '',
}: Props) {
  return (
    <div className={`text-center py-5 text-muted ${className}`}>
      <i className={`bi ${icon} fs-1 d-block mb-2`} aria-hidden="true" />
      <p className="fw-medium mb-1">{title}</p>
      {description && <p className="small mb-0">{description}</p>}
    </div>
  )
}
