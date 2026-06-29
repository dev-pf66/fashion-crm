import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Upload, X, Trash2, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { getRoughSketches, createRoughSketch, updateRoughSketchStatus, deleteRoughSketch } from '../lib/supabase'
import { uploadRoughSketch } from '../lib/storage'

const COLUMNS = [
  { id: 'in_review', label: 'In Review', color: '#f59e0b' },
  { id: 'approved',  label: 'Approved',  color: '#10b981' },
]

export default function RoughSketches() {
  const { currentPerson } = useApp()
  const { currentDivision } = useDivision()
  const { showToast } = useToast()
  const [sketches, setSketches] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pendingName, setPendingName] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { load() }, [currentDivision])

  useEffect(() => {
    if (!pendingFile) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(pendingFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  async function load() {
    try {
      setLoading(true)
      const data = await getRoughSketches(currentDivision?.id || null)
      setSketches(data)
    } catch {
      showToast('Failed to load sketches', 'error')
    } finally {
      setLoading(false)
    }
  }

  function startUpload(file) {
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return }
    const nameFromFile = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    setPendingFile(file)
    setPendingName(nameFromFile)
    setNameModalOpen(true)
  }

  async function confirmUpload() {
    if (!pendingFile || !pendingName.trim()) return
    setNameModalOpen(false)
    setUploading(true)
    try {
      const url = await uploadRoughSketch(pendingFile)
      const sketch = await createRoughSketch({
        name: pendingName.trim(),
        file_url: url,
        file_name: pendingFile.name,
        file_type: pendingFile.type,
        status: 'in_review',
        uploaded_by: currentPerson?.id || null,
        division_id: currentDivision?.id || null,
      })
      setSketches(prev => [sketch, ...prev])
      showToast('Sketch uploaded', 'success')
    } catch {
      showToast('Upload failed', 'error')
    } finally {
      setUploading(false)
      setPendingFile(null)
      setPendingName('')
    }
  }

  async function moveSketch(id, newStatus) {
    setSketches(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
    try {
      await updateRoughSketchStatus(id, newStatus)
    } catch {
      showToast('Failed to move sketch', 'error')
      load()
    }
  }

  async function removeSketch(id) {
    if (!confirm('Delete this sketch?')) return
    setSketches(prev => prev.filter(s => s.id !== id))
    try {
      await deleteRoughSketch(id)
    } catch {
      showToast('Failed to delete sketch', 'error')
      load()
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const { draggableId, destination } = result
    const sketch = sketches.find(s => s.id === draggableId)
    if (!sketch || sketch.status === destination.droppableId) return
    moveSketch(draggableId, destination.droppableId)
  }

  const q = search.toLowerCase()
  const filtered = sketches.filter(s =>
    !q || s.name.toLowerCase().includes(q) || (s.uploader?.name || '').toLowerCase().includes(q)
  )
  const allUrls = filtered.map(s => s.file_url)

  function lightboxNav(dir) {
    const idx = allUrls.indexOf(lightbox)
    setLightbox(allUrls[(idx + dir + allUrls.length) % allUrls.length])
  }

  useEffect(() => {
    function onKey(e) {
      if (!lightbox) return
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft') lightboxNav(-1)
      if (e.key === 'ArrowRight') lightboxNav(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, allUrls])

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>Rough Sketches</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Upload and review hand sketches before they go into production
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control"
            style={{ width: 180, fontSize: '0.875rem' }}
          />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={15} />
            {uploading ? 'Uploading…' : 'Upload Sketch'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) startUpload(f); e.target.value = '' }} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/')); if (f) startUpload(f) }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: '1.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
          cursor: 'pointer',
          background: dragOver ? 'var(--primary-bg,#eff6ff)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={22} style={{ marginBottom: 6, opacity: 0.5 }} />
        <div>Drag &amp; drop an image here, or <span style={{ color: 'var(--primary)', fontWeight: 600 }}>click to browse</span></div>
      </div>

      {/* Name + preview modal */}
      {nameModalOpen && (
        <div className="modal-overlay" onClick={() => setNameModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Name this sketch</h3>
              <button className="btn-icon" onClick={() => setNameModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ paddingTop: '1rem' }}>
              {previewUrl && (
                <img src={previewUrl} alt="preview"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 6, marginBottom: '1rem', background: 'var(--gray-100)' }} />
              )}
              <input
                className="form-control"
                type="text"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                placeholder="Sketch name"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') confirmUpload() }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setNameModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmUpload} disabled={!pendingName.trim()}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {COLUMNS.map(col => {
              const cards = filtered.filter(s => s.status === col.id)
              return (
                <div key={col.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{col.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{cards.length}</span>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: 160,
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.625rem',
                          background: snapshot.isDraggingOver ? 'var(--gray-50,#f9fafb)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '2rem 0' }}>
                            {col.id === 'in_review' ? 'Upload a sketch to get started' : 'No approved sketches yet'}
                          </div>
                        )}
                        {cards.map((sketch, idx) => (
                          <Draggable key={sketch.id} draggableId={sketch.id} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                style={{
                                  background: 'var(--bg)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  boxShadow: snap.isDragging ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                                  ...prov.draggableProps.style,
                                }}
                              >
                                <div
                                  style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--gray-100)', cursor: 'zoom-in' }}
                                  onClick={() => setLightbox(sketch.file_url)}
                                >
                                  <img src={sketch.file_url} alt={sketch.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <div style={{ padding: '0.5rem 0.625rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{sketch.name}</div>
                                  {sketch.uploader && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {sketch.uploader.name} · {new Date(sketch.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                                    {col.id === 'in_review' ? (
                                      <button className="btn btn-sm" onClick={() => moveSketch(sketch.id, 'approved')}
                                        style={{ background: '#dcfce7', color: '#15803d', border: 'none', flex: 1, fontSize: '0.75rem' }}>
                                        Approve
                                      </button>
                                    ) : (
                                      <button className="btn btn-sm" onClick={() => moveSketch(sketch.id, 'in_review')}
                                        style={{ background: '#fef3c7', color: '#92400e', border: 'none', flex: 1, fontSize: '0.75rem' }}>
                                        Back to Review
                                      </button>
                                    )}
                                    <button className="btn btn-sm" onClick={() => removeSketch(sketch.id)}
                                      style={{ color: 'var(--danger,#ef4444)', border: '1px solid var(--border)', padding: '0 0.5rem' }}
                                      title="Delete">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={e => { e.stopPropagation(); lightboxNav(-1) }}
            style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <ChevronLeft size={22} />
          </button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={e => { e.stopPropagation(); lightboxNav(1) }}
            style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <ChevronRight size={22} />
          </button>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
