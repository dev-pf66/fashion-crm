import { useState, useEffect, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { getRangeStyle, updateRangeStyle, deleteRangeStyle, getRangeStyleFiles, createRangeStyleFile, deleteRangeStyleFile } from '../lib/supabase'
import { uploadRangeStyleFile, deleteFile } from '../lib/storage'
import { STYLE_CATEGORIES } from '../lib/constants'
import CommentSection from './CommentSection'
import { X, Upload, Trash2, Star, FileText, Image as ImageIcon, Loader } from 'lucide-react'

const STATUSES = [
  { value: 'concept', label: 'Concept' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
]

export default function RangeStylePanel({ styleId, rangeId, onClose, onUpdate, onDelete }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [style, setStyle] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    if (styleId) loadStyle()
  }, [styleId])

  useEffect(() => {
    function handleEsc(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  async function loadStyle() {
    setLoading(true)
    try {
      const data = await getRangeStyle(styleId)
      setStyle(data)
      setForm({
        name: data.name || '',
        category: data.category || '',
        sub_category: data.sub_category || '',
        colorways: (data.colorways || []).join(', '),
        delivery_drop: data.delivery_drop || '',
        status: data.status || 'concept',
        notes: data.notes || '',
      })
      setFiles(data.range_style_files || [])
    } catch (err) {
      console.error('Failed to load style:', err)
      toast.error('Failed to load style')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const colorways = form.colorways
        .split(',')
        .map(c => c.trim())
        .filter(Boolean)
      await updateRangeStyle(styleId, {
        name: form.name.trim(),
        category: form.category,
        sub_category: form.sub_category.trim() || null,
        colorways,
        delivery_drop: form.delivery_drop.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      toast.success('Style updated')
      onUpdate()
    } catch (err) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e) {
    const uploadFiles = Array.from(e.target.files)
    if (!uploadFiles.length) return
    setUploading(true)
    try {
      for (const file of uploadFiles) {
        const url = await uploadRangeStyleFile(rangeId, styleId, file)
        await createRangeStyleFile({
          style_id: styleId,
          file_url: url,
          file_name: file.name,
          file_type: file.type,
        })
      }
      toast.success(`${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''} uploaded`)
      const updated = await getRangeStyleFiles(styleId)
      setFiles(updated)
      onUpdate()
    } catch (err) {
      toast.error('Upload failed')
      console.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSetThumbnail(fileUrl) {
    try {
      await updateRangeStyle(styleId, { thumbnail_url: fileUrl })
      setStyle(prev => ({ ...prev, thumbnail_url: fileUrl }))
      toast.success('Thumbnail set')
      onUpdate()
    } catch (err) {
      toast.error('Failed to set thumbnail')
    }
  }

  async function handleDeleteFile(fileId, fileUrl) {
    if (!confirm('Delete this file?')) return
    try {
      await deleteRangeStyleFile(fileId)
      // Try to delete from storage too
      try {
        const pathMatch = fileUrl.match(/style-files\/(.+)$/)
        if (pathMatch) await deleteFile('style-files', pathMatch[1])
      } catch { /* storage delete is best-effort */ }
      setFiles(prev => prev.filter(f => f.id !== fileId))
      if (style.thumbnail_url === fileUrl) {
        await updateRangeStyle(styleId, { thumbnail_url: null })
        setStyle(prev => ({ ...prev, thumbnail_url: null }))
      }
      toast.success('File deleted')
      onUpdate()
    } catch (err) {
      toast.error('Failed to delete file')
    }
  }

  async function handleDeleteStyle() {
    if (!confirm(`Delete "${style?.name}"? This cannot be undone.`)) return
    try {
      await deleteRangeStyle(styleId)
      toast.success('Style deleted')
      onDelete()
    } catch (err) {
      toast.error('Failed to delete style')
    }
  }

  const isImage = (type) => type && type.startsWith('image/')

  return (
    <>
      <div className="rp-panel-overlay" onClick={onClose} />
      <div className="rp-panel">
        <div className="rp-panel-header">
          <h2>{loading ? 'Loading...' : style?.name || 'Style Detail'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : (
          <div className="rp-panel-body">
            {/* Form fields */}
            <div className="form-group">
              <label>Style Name *</label>
              <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => updateField('category', e.target.value)}>
                  <option value="">Select...</option>
                  {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Category</label>
                <input type="text" value={form.sub_category} onChange={e => updateField('sub_category', e.target.value)} placeholder="e.g. Shirts, Trousers" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => updateField('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Delivery Drop</label>
                <input type="text" value={form.delivery_drop} onChange={e => updateField('delivery_drop', e.target.value)} placeholder="e.g. Drop 1, Main Delivery" />
              </div>
            </div>

            <div className="form-group">
              <label>Colorways <span className="text-muted text-sm">(comma-separated)</span></label>
              <input type="text" value={form.colorways} onChange={e => updateField('colorways', e.target.value)} placeholder="e.g. White, Navy, Sage" />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} placeholder="Design notes, references, construction details..." />
            </div>

            <div className="form-actions" style={{ marginBottom: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Files section */}
            <div className="rp-panel-section">
              <div className="rp-panel-section-header">
                <h3>Files & Images</h3>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <><Loader size={14} className="spin" /> Uploading...</> : <><Upload size={14} /> Upload</>}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.ai,.psd,.sketch"
                  capture="environment"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {files.length === 0 ? (
                <div
                  className="rp-upload-drop"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} />
                  <p>Click to upload images, sketches, or tech packs</p>
                </div>
              ) : (
                <div className="rp-file-grid">
                  {files.map(file => (
                    <div key={file.id} className={`rp-file-item ${style.thumbnail_url === file.file_url ? 'is-thumbnail' : ''}`}>
                      {isImage(file.file_type) ? (
                        <img src={file.file_url} alt={file.file_name} />
                      ) : (
                        <div className="rp-file-placeholder">
                          <FileText size={28} />
                          <span>{file.file_name?.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="rp-file-actions">
                        {isImage(file.file_type) && (
                          <button
                            className="rp-file-btn"
                            onClick={() => handleSetThumbnail(file.file_url)}
                            title="Set as thumbnail"
                          >
                            <Star size={12} fill={style.thumbnail_url === file.file_url ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        <button
                          className="rp-file-btn danger"
                          onClick={() => handleDeleteFile(file.id, file.file_url)}
                          title="Delete file"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {style.thumbnail_url === file.file_url && (
                        <div className="rp-thumbnail-badge">Thumbnail</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="rp-panel-section" style={{ marginTop: '0.5rem' }}>
              <CommentSection entityType="range_style" entityId={styleId} rangeId={rangeId} />
            </div>

            {/* Delete */}
            <div className="rp-panel-danger">
              <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={handleDeleteStyle}>
                <Trash2 size={14} /> Delete Style
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
