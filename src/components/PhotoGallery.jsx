import { useState, useRef } from 'react'
import { uploadSamplePhoto } from '../lib/storage'
import { Upload, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

export default function PhotoGallery({ photos = [], sampleId, onPhotosChange, readOnly = false }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = []
      for (const file of files) {
        const url = await uploadSamplePhoto(sampleId, file)
        urls.push(url)
      }
      onPhotosChange?.([...photos, ...urls])
    } catch (err) {
      console.error('Failed to upload photo:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleDelete(index) {
    const updated = photos.filter((_, i) => i !== index)
    onPhotosChange?.(updated)
  }

  function openLightbox(index) {
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
  }

  function prevPhoto() {
    setLightboxIndex(i => (i > 0 ? i - 1 : photos.length - 1))
  }

  function nextPhoto() {
    setLightboxIndex(i => (i < photos.length - 1 ? i + 1 : 0))
  }

  return (
    <div>
      <div className="photo-gallery-grid">
        {photos.map((url, i) => (
          <div key={i} className="photo-gallery-item" onClick={() => openLightbox(i)}>
            <img src={url} alt={`Sample photo ${i + 1}`} />
            {!readOnly && (
              <button
                className="photo-gallery-delete"
                onClick={e => { e.stopPropagation(); handleDelete(i) }}
                title="Remove photo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <div
            className="photo-gallery-upload"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <div className="loading-spinner" style={{ width: 24, height: 24 }} />
            ) : (
              <>
                <Upload size={20} />
                <span>Upload</span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {photos.length === 0 && readOnly && (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <p>No photos uploaded yet.</p>
        </div>
      )}

      {lightboxIndex !== null && (
        <div className="photo-lightbox" onClick={closeLightbox}>
          <button className="photo-lightbox-close" onClick={closeLightbox}>
            <X size={24} />
          </button>
          {photos.length > 1 && (
            <>
              <button className="photo-lightbox-prev" onClick={e => { e.stopPropagation(); prevPhoto() }}>
                <ChevronLeft size={32} />
              </button>
              <button className="photo-lightbox-next" onClick={e => { e.stopPropagation(); nextPhoto() }}>
                <ChevronRight size={32} />
              </button>
            </>
          )}
          <img
            src={photos[lightboxIndex]}
            alt=""
            className="photo-lightbox-image"
            onClick={e => e.stopPropagation()}
          />
          <div className="photo-lightbox-counter">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  )
}
