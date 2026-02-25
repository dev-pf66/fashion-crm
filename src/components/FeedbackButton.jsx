import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MessageSquarePlus, X, Send } from 'lucide-react'

const TYPES = ['Bug', 'Suggestion', 'Question']

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'Bug', description: '', email: user?.email || '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) return
    setError(null)

    const { error: insertError } = await supabase.from('feedback').insert({
      type: form.type,
      description: form.description.trim(),
      email: form.email || null,
      user_id: user?.id || null,
      page_url: window.location.pathname,
    })

    if (insertError) {
      setError('Failed to submit. Please try again.')
      console.error('Feedback submit error:', insertError)
      return
    }

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
                {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>{error}</div>}
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
