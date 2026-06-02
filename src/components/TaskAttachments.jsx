import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getTaskAttachments, logTaskAttachment, deleteTaskAttachment } from '../lib/supabase'
import { uploadTaskAttachment, deleteFile } from '../lib/storage'
import { Paperclip, Upload, X, Download, FileText, File, Loader } from 'lucide-react'

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'heic', 'heif']
const PDF_TYPE = 'pdf'

function ext(filename = '') {
  return filename.split('.').pop().toLowerCase()
}

function isImage(filename) {
  return IMAGE_TYPES.includes(ext(filename))
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TaskAttachments({ taskId }) {
  const { currentPerson } = useApp()
  const toast = useToast()
  const inputRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    load()
  }, [taskId])

  async function load() {
    try {
      const data = await getTaskAttachments(taskId)
      setAttachments(data)
    } catch (err) {
      console.error('Failed to load attachments:', err)
    }
  }

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true)
    let added = 0
    for (const file of Array.from(files)) {
      try {
        const { url, path } = await uploadTaskAttachment(taskId, file)
        const details = {
          url,
          path,
          filename: file.name,
          size: file.size,
          mime_type: file.type,
        }
        const row = await logTaskAttachment(taskId, currentPerson?.id, details)
        setAttachments(prev => [...prev, { id: row.id, uploaded_at: row.created_at, ...details }])
        added++
      } catch (err) {
        console.error('Upload failed:', err)
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    if (added) toast.success(`${added} file${added > 1 ? 's' : ''} uploaded`)
    setUploading(false)
  }

  async function handleDelete(attachment) {
    if (!confirm(`Delete "${attachment.filename}"?`)) return
    try {
      if (attachment.path) {
        await deleteFile('task-media', attachment.path).catch(() => {})
      }
      await deleteTaskAttachment(attachment.id)
      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
      toast.success('File deleted')
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error('Failed to delete file')
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Paperclip size={12} /> Attachments
          {attachments.length > 0 && <span>({attachments.length})</span>}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ fontSize: '0.75rem' }}
        >
          {uploading ? <Loader size={12} className="spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Drop zone — only shown when no files yet */}
      {attachments.length === 0 && !uploading && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
            background: dragOver ? 'rgba(99,102,241,0.04)' : 'var(--gray-50)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <Upload size={18} style={{ marginBottom: 6, opacity: 0.5 }} />
          <div>Drop files here or click to upload</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 2 }}>Images, PDFs, docs — any file type</div>
        </div>
      )}

      {/* File grid */}
      {attachments.length > 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '0.5rem',
            border: dragOver ? '2px dashed var(--primary)' : '2px solid transparent',
            borderRadius: 'var(--radius)',
            padding: dragOver ? '0.5rem' : '0',
            transition: 'border-color 0.15s, padding 0.15s',
          }}
        >
          {attachments.map(att => (
            <AttachmentCard
              key={att.id}
              attachment={att}
              onDelete={() => handleDelete(att)}
              onPreview={() => isImage(att.filename) && setLightbox(att)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <img
            src={lightbox.url}
            alt={lightbox.filename}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={18} />
          </button>
          <a
            href={lightbox.url}
            download={lightbox.filename}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 16, right: 60,
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', textDecoration: 'none',
            }}
          >
            <Download size={16} />
          </a>
        </div>
      )}
    </div>
  )
}

function AttachmentCard({ attachment, onDelete, onPreview }) {
  const img = isImage(attachment.filename)
  const isPdf = ext(attachment.filename) === PDF_TYPE

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        cursor: img ? 'zoom-in' : 'default',
      }}
      onClick={onPreview}
    >
      {img ? (
        <img
          src={attachment.url}
          alt={attachment.filename}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', gap: 4 }}>
          {isPdf ? <FileText size={28} color="#f87171" /> : <File size={28} color="#60a5fa" />}
          <div style={{ fontSize: '0.6rem', textAlign: 'center', color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.3, maxHeight: 32, overflow: 'hidden' }}>
            {attachment.filename}
          </div>
          {attachment.size && (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
              {formatSize(attachment.size)}
            </div>
          )}
        </div>
      )}

      {/* Hover overlay with actions */}
      <div
        className="attachment-overlay"
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: 0, transition: 'opacity 0.15s',
        }}
        onClick={e => e.stopPropagation()}
      >
        <a
          href={attachment.url}
          download={attachment.filename}
          title="Download"
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', textDecoration: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          <Download size={13} />
        </a>
        <button
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'rgba(239,68,68,0.7)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* filename tooltip on image cards */}
      {img && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.6)', padding: '2px 4px',
          fontSize: '0.6rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {attachment.filename}
        </div>
      )}
    </div>
  )
}
