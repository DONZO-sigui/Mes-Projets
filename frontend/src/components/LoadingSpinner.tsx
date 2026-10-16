interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({ size = 'md', label = 'Chargement…' }: Props) {
  const sizeClass = size === 'sm' ? 'spinner-border-sm' : ''
  return (
    <div className="d-flex justify-content-center align-items-center py-4">
      <div
        className={`spinner-border text-primary ${sizeClass}`}
        role="status"
      >
        <span className="visually-hidden">{label}</span>
      </div>
    </div>
  )
}
