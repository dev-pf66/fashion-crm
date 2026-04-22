export default function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  compact = false,
}) {
  const padding = compact ? '1.5rem 1rem' : undefined
  const iconSize = compact ? 24 : 48

  return (
    <div className="empty-state" style={padding ? { padding } : undefined}>
      {Icon && <Icon size={iconSize} />}
      {title && <h3 style={compact ? { fontSize: '0.875rem', marginBottom: '0.25rem' } : undefined}>{title}</h3>}
      {description && <p style={compact ? { fontSize: '0.75rem', marginBottom: cta ? '0.75rem' : 0 } : undefined}>{description}</p>}
      {cta && (
        <button
          className={`btn btn-${cta.variant || 'primary'} btn-sm`}
          onClick={cta.onClick}
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}
