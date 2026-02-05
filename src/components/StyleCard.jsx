import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { ImageOff } from 'lucide-react'

export default function StyleCard({ style }) {
  const navigate = useNavigate()
  const colorways = style.colorways || []

  return (
    <div className="style-card" onClick={() => navigate(`/styles/${style.id}`)}>
      <div className="style-card-image">
        {style.thumbnail_url ? (
          <img src={style.thumbnail_url} alt={style.name} />
        ) : (
          <ImageOff size={32} />
        )}
      </div>
      <div className="style-card-body">
        <div className="style-card-number">{style.style_number}</div>
        <div className="style-card-name">{style.name}</div>
        <div className="style-card-meta">
          <span className="style-card-supplier">
            {style.suppliers?.name || 'No supplier'}
          </span>
          {style.target_fob && (
            <span className="style-card-price">${parseFloat(style.target_fob).toFixed(2)}</span>
          )}
        </div>
        <div className="style-card-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StatusBadge status={style.status} />
            {colorways.length > 0 && (
              <div className="colorway-swatches">
                {colorways.slice(0, 5).map((c, i) => (
                  <div
                    key={i}
                    className="color-swatch"
                    style={{ background: c.hex || '#ccc' }}
                    title={c.name}
                  />
                ))}
                {colorways.length > 5 && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>
                    +{colorways.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
          {style.people && (
            <div className="assignee-avatar" title={style.people.name}>
              {style.people.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
