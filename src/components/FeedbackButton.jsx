import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { MessageSquarePlus, X, Send } from 'lucide-react'

const TYPES = ['Bug', 'Suggestion', 'Question']

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'Bug', description: '', email: user?.email || '' })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) return

    const existing = JSON.parse(localStorage.getItem('feedback') || '[]')
    existing.push({ ...form, created_at: new Date().toISOString() })
    localStorage.setItem('feedback', JSON.stringify(existing))

    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
      setForm({ type: 'Bug', description: '', email: user?.email || '' })
    }, 1500)
  }

  return (
    <>
      <button className="feedback-button" onClick={() => setOpen(true)} title="Send Feedback">
        <MessageSquarePlus size={20} />
      </button>

      {open && (
        <div className="feedback-modal-overlay" onClick={() => setOpen(false)}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <div className="feedback-modal-header">
              <h3>Send Feedback</h3>
              <button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            {submitted ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Thank you!</div>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>Your feedback has been recorded.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Tell us what's on your mind..."
                    rows={4}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-actions" style={{ marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Send size={14} /> Submit</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
