import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Activities from './Activities.jsx'
import Dashboard from './Dashboard.jsx'
import { makeActivity, makeChild, makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const mia = makeChild(1, 'Mia')
const memory = makeActivity(1, 'Memory Match', { category: 'Memory', difficulty: 'Easy' })

const record = (id, activityId, status, extra = {}) => ({
  id,
  activity_id: activityId,
  activity_title: `Activity ${activityId}`,
  status,
  started_at: null,
  completed_at: status === 'completed' ? '2026-10-20T10:00:00Z' : null,
  ...extra,
})

describe('Undo: what the pages show afterwards', () => {
  it('the Dashboard does not list an undone (not_started) record as recent activity', async () => {
    signIn()
    const api = mockApi({
      'GET /user': { body: makeUser('parent') },
      'GET /children': { body: { data: [mia] } },
      'GET /activities': { body: { data: [memory] } },
      'GET /progress': {
        body: { data: { records: [record(3, 1, 'not_started'), record(2, 2, 'in_progress', { started_at: '2026-10-19T10:00:00Z' }), record(1, 3, 'completed')] } },
      },
    })
    renderWithProviders(<Dashboard />, { route: '/dashboard' })
    await settle(api)

    await screen.findByRole('heading', { level: 2, name: 'Recent Activities' })
    expect(screen.queryByText('Activity 1')).not.toBeInTheDocument()
    expect(screen.getByText('Activity 2')).toBeInTheDocument()
    expect(screen.getByText('Activity 3')).toBeInTheDocument()
    expect(screen.queryByText('Not Started')).not.toBeInTheDocument()
  })

  it('the activity page confirms, undoes once, and goes back to "Mark as Completed"', async () => {
    signIn()
    const api = mockApi({
      'GET /user': { body: makeUser('parent') },
      'GET /children': { body: { data: [mia] } },
      'GET /activities': { body: { data: [memory] } },
      'GET /activities/1': { body: { data: { ...memory, objective: 'o', instructions: ['Step one'], materials: ['Cards'], resources: [] } } },
      'GET /progress': { body: { data: { records: [record(101, 1, 'completed')] } } },
      'POST /progress/101/undo': {
        body: { message: 'ok', data: { record: record(101, 1, 'not_started') } },
      },
    })
    renderWithProviders(<Activities />, { route: '/activities' })
    await settle(api)

    await userEvent.click(await screen.findByRole('link', { name: 'View activity: Memory Match' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo completion' }))

    // The confirmation dialog has its own confirm button of the same name.
    const confirm = (await screen.findAllByRole('dialog')).at(-1)
    expect(api.callsTo('POST', '/progress/101/undo')).toHaveLength(0)
    await userEvent.click(within(confirm).getByRole('button', { name: 'Undo completion' }))

    await waitFor(() => expect(api.callsTo('POST', '/progress/101/undo')).toHaveLength(1))
    expect(await screen.findByRole('button', { name: 'Mark as Completed' })).toBeInTheDocument()
  })
})
