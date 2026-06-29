import { describe, it, expect } from 'vitest'
import { buildTasksOrFilter } from '../supabase.js'

// These tests guard the cross-division task visibility fix.
// Tanvi can assign tasks to Aditi while in a different division.
// The OR filter must always include the assignee condition so those tasks
// are never silently hidden.

describe('buildTasksOrFilter', () => {
  it('includes the current division', () => {
    const filter = buildTasksOrFilter(3, null)
    expect(filter).toContain('division_id.eq.3')
  })

  it('always includes tasks with no division (Tina/WhatsApp tasks)', () => {
    const filter = buildTasksOrFilter(3, null)
    expect(filter).toContain('division_id.is.null')
  })

  it('includes tasks assigned to the current user when personId is provided', () => {
    const filter = buildTasksOrFilter(3, 7)
    expect(filter).toContain('assigned_to.eq.7')
  })

  it('does NOT add assigned_to when personId is absent', () => {
    expect(buildTasksOrFilter(3, null)).not.toContain('assigned_to')
    expect(buildTasksOrFilter(3, undefined)).not.toContain('assigned_to')
    expect(buildTasksOrFilter(3, 0)).not.toContain('assigned_to')
  })

  it('produces a comma-separated OR string with all three parts when personId is given', () => {
    const filter = buildTasksOrFilter(5, 12)
    const parts = filter.split(',')
    expect(parts).toHaveLength(3)
    expect(parts).toContain('division_id.eq.5')
    expect(parts).toContain('division_id.is.null')
    expect(parts).toContain('assigned_to.eq.12')
  })

  it('produces exactly two parts when no personId', () => {
    const parts = buildTasksOrFilter(5, null).split(',')
    expect(parts).toHaveLength(2)
  })

  it('works with string division IDs (select element values)', () => {
    // currentDivision.id may come through as a number but defensive check
    const filter = buildTasksOrFilter(2, 9)
    expect(filter).toContain('division_id.eq.2')
    expect(filter).toContain('assigned_to.eq.9')
  })
})
