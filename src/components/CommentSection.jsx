import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getComments, createComment, createNotification } from '../lib/supabase'
import { Send, AtSign, MessageSquare } from 'lucide-react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function CommentSection({ entityType, entityId, rangeId }) {
  const { currentPerson, people } = useApp()
  const toast = useToast()

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mention state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [mentionedIds, setMentionedIds] = useState(new Set())

  const textareaRef = useRef(null)

  // Load comments
  useEffect(() => {
    if (entityType && entityId) {
      loadComments()
    }
  }, [entityType, entityId])

  async function loadComments() {
    try {
      setLoading(true)
      const data = await getComments(entityType, entityId)
      setComments(data || [])
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter people based on mention query
  const filteredPeople = people
    ? people.filter(p => {
        if (!mentionQuery) return true
        return p.name?.toLowerCase().includes(mentionQuery.toLowerCase())
      })
    : []

  // Parse content and highlight @mentions
  function renderContent(content) {
    if (!content || !people || people.length === 0) {
      return content
    }

    // Build a regex that matches @Name for each person
    const personNames = people
      .map(p => p.name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length) // longest first to avoid partial matches

    if (personNames.length === 0) return content

    const escapedNames = personNames.map(name =>
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    const pattern = new RegExp(`@(${escapedNames.join('|')})`, 'g')

    const parts = []
    let lastIndex = 0
    let match

    while ((match = pattern.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }
      // Add the highlighted mention
      parts.push(
        <span key={match.index} className="mention-tag">
          @{match[1]}
        </span>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  // Handle textarea changes and detect @mentions
  function handleChange(e) {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setText(value)

    // Check if we should show the mention dropdown
    // Look backwards from cursor to find an unmatched @
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      // Check that the @ is at the start or preceded by a space/newline
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1)
        // Only show if there's no space in the query (still typing the name)
        if (!query.includes(' ') || query.length < 30) {
          const queryNoTrailingSpace = query.trimEnd()
          // Check if query matches anyone
          const matches = people
            ? people.filter(p =>
                p.name?.toLowerCase().includes(queryNoTrailingSpace.toLowerCase())
              )
            : []

          if (matches.length > 0 && !query.includes('\n')) {
            setShowMentionDropdown(true)
            setMentionQuery(queryNoTrailingSpace)
            setMentionStartIndex(lastAtIndex)
            setSelectedMentionIndex(0)
            return
          }
        }
      }
    }

    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
  }

  // Handle keyboard navigation in mention dropdown
  function handleKeyDown(e) {
    if (!showMentionDropdown || filteredPeople.length === 0) {
      // Submit on Cmd/Ctrl+Enter
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedMentionIndex(prev =>
        prev < filteredPeople.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedMentionIndex(prev =>
        prev > 0 ? prev - 1 : filteredPeople.length - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      insertMention(filteredPeople[selectedMentionIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowMentionDropdown(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
    }
  }

  // Insert a mention into the textarea
  function insertMention(person) {
    if (!person) return

    const before = text.slice(0, mentionStartIndex)
    const after = text.slice(
      mentionStartIndex + 1 + mentionQuery.length // +1 for the @
    )
    const newText = `${before}@${person.name} ${after}`
    setText(newText)

    // Track mentioned person
    setMentionedIds(prev => {
      const next = new Set(prev)
      next.add(person.id)
      return next
    })

    // Close dropdown
    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
    setSelectedMentionIndex(0)

    // Re-focus textarea and place cursor after inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = before.length + person.name.length + 2 // @Name + space
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(cursorPos, cursorPos)
      }
    }, 0)
  }

  // Submit a new comment
  async function handleSubmit() {
    if (!text.trim() || !currentPerson || submitting) return

    try {
      setSubmitting(true)

      // Also scan text for any @mentions that were typed manually (not via dropdown)
      const allMentionedIds = new Set(mentionedIds)
      if (people) {
        for (const person of people) {
          if (person.name && text.includes(`@${person.name}`)) {
            allMentionedIds.add(person.id)
          }
        }
      }
      // Remove self-mention
      allMentionedIds.delete(currentPerson.id)

      // Create the comment
      await createComment({
        entity_type: entityType,
        entity_id: entityId,
        person_id: currentPerson.id,
        content: text,
        mentions: Array.from(allMentionedIds)
      })

      // Send notifications for each mentioned person
      for (const mentionId of allMentionedIds) {
        try {
          await createNotification({
            person_id: mentionId,
            type: 'mention',
            title: `${currentPerson.name} mentioned you`,
            message: text.substring(0, 100),
            link: rangeId ? `/range-planning/${rangeId}` : null,
            from_person_id: currentPerson.id
          })
        } catch (err) {
          console.error('Failed to create notification for', mentionId, err)
        }
      }

      // Reset state
      setText('')
      setMentionedIds(new Set())
      setShowMentionDropdown(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
      setSelectedMentionIndex(0)

      // Reload comments
      await loadComments()

      toast.success('Comment added')
    } catch (err) {
      console.error('Failed to submit comment:', err)
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  if (!entityType || !entityId) return null

  return (
    <div className="comment-section">
      <h4 className="comment-section-title">
        <MessageSquare size={16} /> Comments ({comments.length})
      </h4>

      <div className="comment-list">
        {loading ? (
          <div className="text-muted" style={{ padding: '12px 0', fontSize: '13px' }}>
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-muted" style={{ padding: '12px 0', fontSize: '13px' }}>
            No comments yet. Be the first to comment.
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">
                {getInitials(c.people?.name)}
              </div>
              <div className="comment-content">
                <div className="comment-meta">
                  <strong>{c.people?.name || 'Unknown'}</strong>
                  <span className="text-muted">{timeAgo(c.created_at)}</span>
                </div>
                <div className="comment-text">
                  {renderContent(c.content)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {currentPerson && (
        <div className="comment-input-wrapper">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... Use @ to mention someone"
            rows={2}
            disabled={submitting}
          />
          {showMentionDropdown && filteredPeople.length > 0 && (
            <div className="mention-dropdown">
              {filteredPeople.map((p, i) => (
                <button
                  key={p.id}
                  className={`mention-option ${i === selectedMentionIndex ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent textarea blur
                    insertMention(p)
                  }}
                  onMouseEnter={() => setSelectedMentionIndex(i)}
                >
                  <span className="mention-option-avatar">
                    {getInitials(p.name)}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
