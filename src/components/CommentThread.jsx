import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'
import { getComments, createComment, deleteComment } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { Send, Trash2, MessageSquare } from 'lucide-react'

export default function CommentThread({ entityType, entityId }) {
  const { currentPerson, people } = useApp()
  const toast = useToast()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef(null)
  const listEndRef = useRef(null)

  useEffect(() => { loadComments() }, [entityType, entityId])

  async function loadComments() {
    setLoading(true)
    try {
      const data = await getComments(entityType, entityId)
      setComments(data || [])
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoading(false)
    }
  }

  function scrollToBottom() {
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || !currentPerson) return
    setSending(true)
    try {
      // Extract @mentions
      const mentionRegex = /@(\w+(?:\s\w+)?)/g
      const mentions = []
      let match
      while ((match = mentionRegex.exec(text)) !== null) {
        const person = people.find(p => p.name.toLowerCase() === match[1].toLowerCase())
        if (person) mentions.push(person.id)
      }

      await createComment({
        entity_type: entityType,
        entity_id: entityId,
        person_id: currentPerson.id,
        content: text.trim(),
        mentions: mentions.length > 0 ? mentions : null,
      })
      setText('')
      toast.success('Comment added')
      loadComments()
      scrollToBottom()
    } catch (err) {
      toast.error('Failed to post comment')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(id)
      loadComments()
    } catch (err) {
      toast.error('Failed to delete comment')
    }
  }

  function handleInputChange(e) {
    const val = e.target.value
    setText(val)

    // Check for @mention trigger
    const cursorPos = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursorPos)
    const atMatch = textUpToCursor.match(/@(\w*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase())
      setShowMentions(true)
      setMentionIndex(0)
    } else {
      setShowMentions(false)
    }
  }

  function handleMentionSelect(person) {
    const cursorPos = inputRef.current.selectionStart
    const textUpToCursor = text.slice(0, cursorPos)
    const atMatch = textUpToCursor.match(/@(\w*)$/)

    if (atMatch) {
      const before = text.slice(0, cursorPos - atMatch[0].length)
      const after = text.slice(cursorPos)
      setText(`${before}@${person.name} ${after}`)
    }
    setShowMentions(false)
    inputRef.current.focus()
  }

  function handleKeyDown(e) {
    if (showMentions && filteredPeople.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(prev => Math.min(prev + 1, filteredPeople.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleMentionSelect(filteredPeople[mentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(mentionQuery)
  ).slice(0, 5)

  function renderContent(content) {
    // Highlight @mentions
    return content.replace(/@(\w+(?:\s\w+)?)/g, (match) => {
      return `<span class="comment-mention">${match}</span>`
    })
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function getRelativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="comment-thread card">
      <div className="card-header">
        <h3><MessageSquare size={16} style={{ verticalAlign: 'middle' }} /> Comments</h3>
        <span className="text-sm text-muted">{comments.length}</span>
      </div>

      <div className="comment-list">
        {loading ? (
          <div style={{ padding: '1rem', textAlign: 'center' }}><div className="loading-spinner" /></div>
        ) : comments.length === 0 ? (
          <div className="text-muted text-sm" style={{ padding: '1.5rem', textAlign: 'center' }}>
            No comments yet. Start the conversation.
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">{getInitials(c.people?.name || 'U')}</div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">{c.people?.name || 'Unknown'}</span>
                  <span className="comment-time">{getRelativeTime(c.created_at)}</span>
                  {currentPerson?.id === c.person_id && (
                    <button className="comment-delete" onClick={() => handleDelete(c.id)}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div
                  className="comment-content"
                  dangerouslySetInnerHTML={{ __html: renderContent(c.content) }}
                />
              </div>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-input-wrap">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... Use @ to mention someone"
            rows={1}
            disabled={sending}
          />
          {showMentions && filteredPeople.length > 0 && (
            <div className="mention-dropdown">
              {filteredPeople.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`mention-item ${i === mentionIndex ? 'selected' : ''}`}
                  onClick={() => handleMentionSelect(p)}
                  onMouseEnter={() => setMentionIndex(i)}
                >
                  <div className="mention-avatar">{getInitials(p.name)}</div>
                  <div>
                    <div className="mention-name">{p.name}</div>
                    <div className="mention-email">{p.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
