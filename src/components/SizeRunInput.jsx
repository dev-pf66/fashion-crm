import { SIZE_PRESETS } from '../lib/constants'

export default function SizeRunInput({ sizeRun, onChange }) {
  function handlePresetChange(preset) {
    if (preset && SIZE_PRESETS[preset]) {
      onChange({ range: preset, sizes: SIZE_PRESETS[preset] })
    } else {
      onChange({ range: '', sizes: [] })
    }
  }

  function handleCustomSizes(value) {
    const sizes = value.split(',').map(s => s.trim()).filter(Boolean)
    onChange({ range: 'Custom', sizes })
  }

  return (
    <div>
      <div className="form-row">
        <div>
          <select
            value={sizeRun.range || ''}
            onChange={e => handlePresetChange(e.target.value)}
          >
            <option value="">Select preset...</option>
            {Object.keys(SIZE_PRESETS).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
            <option value="Custom">Custom</option>
          </select>
        </div>
        <div>
          <input
            type="text"
            value={(sizeRun.sizes || []).join(', ')}
            onChange={e => handleCustomSizes(e.target.value)}
            placeholder="XS, S, M, L, XL"
          />
          <div className="form-hint">Comma-separated sizes</div>
        </div>
      </div>
    </div>
  )
}
