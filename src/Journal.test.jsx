import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ActivityDetails from './ActivityDetails.jsx'
import ActivityFeedbackSection from './ActivityFeedbackSection.jsx'
import { makeActivity, makeChild, makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const mia = makeChild(1, 'Mia')
const memory = makeActivity(1, 'Memory Match', { category: 'Memory', difficulty: 'Easy' })
const detail = { ...memory, objective: 'o', instructions: ['Step one'], materials: ['Cards'], resources: [] }

const completedRecord = { id: 101, activity_id: 1, status: 'completed', started_at: null, completed_at: '2026-11-05T10:00:00Z' }

const entry = (id, rating, note, at, progressId = 101) => ({
  id, progress_id: progressId, child_id: 1, activity_id: 1, rating, note, session_completed_at: at, created_at: at,
})

function open(routes = {}, user = makeUser('parent', { email_verified: true })) {
  signIn()
  const api = mockApi({
    'GET /user': { body: user },
    'GET /children': { body: { data: [mia] } },
    'GET /activities/1': { body: { data: detail } },
    'GET /progress': { body: { data: { records: [] } } },
    'GET /activities/1/journal': { body: { data: [] } },
    ...routes,
  })

  renderWithProviders(
    <Routes>
      <Route path="/activities/:activityId" element={<ActivityDetails />} />
    </Routes>,
    { route: '/activities/1' }
  )

  return api
}

const complete = {
  'POST /activities/1/complete': {
    status: 201,
    body: { message: 'Activity marked as completed.', already_completed: false, data: { record: completedRecord } },
  },
}

describe('Session journal after completing an activity', () => {
  it('opens the journal form only after the completion succeeded, and saves rating + note', async () => {
    const user = userEvent.setup()
    const api = open({
      ...complete,
      'POST /progress/101/journal': {
        status: 201,
        body: { message: 'saved', data: { entry: entry(1, 4, 'Calm today', '2026-11-05T10:00:00Z') } },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))

    const form = await screen.findByTestId('journal-form')
    expect(api.callsTo('POST', '/activities/1/complete')).toHaveLength(1)
    expect(within(form).getByText('Session Journal / Parent\'s Observation')).toBeInTheDocument()
    expect(within(form).getByText(/How effective or helpful was this activity/)).toBeInTheDocument()

    await user.type(within(form).getByLabelText(/Parent's Observation/), 'Calm today')
    await user.click(within(form).getByRole('button', { name: 'Rate 4 out of 5' }))
    await user.click(within(form).getByRole('button', { name: 'Save journal entry' }))

    await waitFor(() => expect(api.callsTo('POST', '/progress/101/journal')).toHaveLength(1))
    expect(api.callsTo('POST', '/progress/101/journal')[0].body).toEqual({ rating: 4, note: 'Calm today' })
    await waitFor(() => expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument())
    expect(screen.getByText('Your journal entry was saved.')).toBeInTheDocument()
  })

  it('does not open the journal when the completion fails', async () => {
    const user = userEvent.setup()
    open({ 'POST /activities/1/complete': { status: 500, body: { message: 'Server broke' } } })

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))

    expect(await screen.findByText('Server broke')).toBeInTheDocument()
    expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument()
  })

  it('needs a rating, and a failed save keeps the written note', async () => {
    const user = userEvent.setup()
    const api = open({
      ...complete,
      'POST /progress/101/journal': { status: 500, body: { message: 'Could not save right now.' } },
    })

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))
    const form = await screen.findByTestId('journal-form')
    const box = within(form).getByLabelText(/Parent's Observation/)
    await user.type(box, 'He built a tower')

    await user.click(within(form).getByRole('button', { name: 'Save journal entry' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Please choose a rating from 1 to 5 stars.')
    expect(api.callsTo('POST', '/progress/101/journal')).toHaveLength(0)

    await user.click(within(form).getByRole('button', { name: 'Rate 5 out of 5' }))
    await user.click(within(form).getByRole('button', { name: 'Save journal entry' }))

    expect(await within(form).findByText('Could not save right now.')).toBeInTheDocument()
    expect(box).toHaveValue('He built a tower')
    expect(screen.getByTestId('journal-form')).toBeInTheDocument()
  })

  it('sends only one request for a double click', async () => {
    const user = userEvent.setup()
    let release
    const api = open({
      ...complete,
      'POST /progress/101/journal': () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 201, body: { data: { entry: entry(1, 3, null, '2026-11-05T10:00:00Z') } } })
        }),
    })

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))
    const form = await screen.findByTestId('journal-form')
    await user.click(within(form).getByRole('button', { name: 'Rate 3 out of 5' }))
    const save = within(form).getByRole('button', { name: 'Save journal entry' })
    await user.dblClick(save)

    await waitFor(() => expect(api.callsTo('POST', '/progress/101/journal')).toHaveLength(1))
    release()
    await waitFor(() => expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument())
    expect(api.callsTo('POST', '/progress/101/journal')).toHaveLength(1)
  })

  it('asks before throwing away a written note when skipping', async () => {
    const user = userEvent.setup()
    open(complete)

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))
    const form = await screen.findByTestId('journal-form')
    await user.type(within(form).getByLabelText(/Parent's Observation/), 'draft')

    await user.click(within(form).getByRole('button', { name: 'Skip for now' }))
    expect(within(form).getByText(/Skip and discard it/)).toBeInTheDocument()
    expect(screen.getByTestId('journal-form')).toBeInTheDocument()

    await user.click(within(form).getByRole('button', { name: 'Keep writing' }))
    expect(within(form).getByLabelText(/Parent's Observation/)).toHaveValue('draft')

    await user.click(within(form).getByRole('button', { name: 'Skip for now' }))
    await user.click(within(form).getByRole('button', { name: 'Discard and skip' }))
    await waitFor(() => expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument())
  })

  it('skips without asking when nothing was written, and the activity stays completed', async () => {
    const user = userEvent.setup()
    open(complete)

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))
    const form = await screen.findByTestId('journal-form')
    await user.click(within(form).getByRole('button', { name: 'Skip for now' }))

    await waitFor(() => expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument())
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as Completed' })).not.toBeInTheDocument()
    // The session can still be journaled later.
    expect(screen.getByRole('button', { name: 'Add journal entry' })).toBeInTheDocument()
  })

  it('allows only one journal per activity: no form after completing again, no Add button', async () => {
    const user = userEvent.setup()
    open({
      'GET /activities/1/journal': { body: { data: [entry(1, 4, 'Earlier session', '2026-11-01T10:00:00Z')] } },
      ...complete,
    })

    const history = await screen.findByTestId('journal-history')
    await within(history).findByText('Earlier session')
    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))

    expect(await screen.findByText('Completed')).toBeInTheDocument()
    expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument()
    expect(within(history).queryByRole('button', { name: 'Add journal entry' })).not.toBeInTheDocument()
    expect(within(history).getByRole('button', { name: /Edit journal entry/ })).toBeInTheDocument()
  })

  it('does not open the journal when the activity had already been completed', async () => {
    const user = userEvent.setup()
    open({
      'POST /activities/1/complete': {
        body: { message: 'This activity was already completed.', already_completed: true, data: { record: completedRecord } },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Mark as Completed' }))

    expect(await screen.findByText('Completed')).toBeInTheDocument()
    expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument()
  })
})

describe('Session journal history', () => {
  it('shows an empty state when there are no entries', async () => {
    open()

    const history = await screen.findByTestId('journal-history')
    expect(await within(history).findByText(/No journal entries yet/)).toBeInTheDocument()
    expect(history).toHaveTextContent('Session Journal for Mia')
  })

  it('lists earlier sessions of the selected child, newest first, with stars and notes', async () => {
    const api = open({
      'GET /activities/1/journal': {
        body: {
          data: [
            entry(2, 5, 'Much better\nthis time', '2026-11-08T10:00:00Z'),
            entry(1, 2, 'Struggled with the cards', '2026-11-01T10:00:00Z'),
          ],
        },
      },
    })

    const history = await screen.findByTestId('journal-history')
    await within(history).findByText('Struggled with the cards')
    expect(api.callsTo('GET', '/activities/1/journal')[0].query).toEqual({ child_id: '1' })

    const items = within(history).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Much better')
    expect(within(items[0]).getByRole('img', { name: 'Rated 5 out of 5' })).toBeInTheDocument()
    expect(items[1]).toHaveTextContent('Struggled with the cards')
    expect(within(items[1]).getByRole('img', { name: 'Rated 2 out of 5' })).toBeInTheDocument()
  })

  it('offers a retry when the journal cannot be loaded', async () => {
    const user = userEvent.setup()
    let n = 0
    open({ 'GET /activities/1/journal': () => (++n === 1 ? { status: 500, body: {} } : { body: { data: [] } }) })

    const history = await screen.findByTestId('journal-history')
    await user.click(await within(history).findByRole('button', { name: 'Try again' }))

    expect(await within(history).findByText(/No journal entries yet/)).toBeInTheDocument()
  })

  it('offers to add a journal entry for a completed session that has none, and not when it has one', async () => {
    open({
      'GET /progress': { body: { data: { records: [completedRecord] } } },
      'GET /activities/1/journal': { body: { data: [entry(1, 4, 'Done', '2026-11-05T10:00:00Z')] } },
    })

    const history = await screen.findByTestId('journal-history')
    await within(history).findByText('Done')
    expect(within(history).queryByRole('button', { name: 'Add journal entry' })).not.toBeInTheDocument()
  })

  it('offers it for a completed session with no entry', async () => {
    open({ 'GET /progress': { body: { data: { records: [completedRecord] } } } })

    const history = await screen.findByTestId('journal-history')
    expect(await within(history).findByRole('button', { name: 'Add journal entry' })).toBeInTheDocument()
  })
})

describe('Editing and deleting a journal entry', () => {
  const withEntry = (extra = {}) =>
    open({
      'GET /progress': { body: { data: { records: [completedRecord] } } },
      'GET /activities/1/journal': { body: { data: [entry(7, 3, 'First thoughts', '2026-11-05T10:00:00Z')] } },
      ...extra,
    })

  it('edits an entry: the form starts with the saved values and sends a PUT', async () => {
    const user = userEvent.setup()
    const api = withEntry({
      'PUT /journal/7': { body: { message: 'ok', data: { entry: entry(7, 5, 'Better', '2026-11-05T10:00:00Z') } } },
    })

    const history = await screen.findByTestId('journal-history')
    await user.click(await within(history).findByRole('button', { name: /Edit journal entry/ }))

    const form = await screen.findByTestId('journal-form')
    const box = within(form).getByLabelText(/Parent's Observation/)
    expect(box).toHaveValue('First thoughts')
    await user.clear(box)
    await user.type(box, 'Better')
    await user.click(within(form).getByRole('button', { name: 'Rate 5 out of 5' }))
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.callsTo('PUT', '/journal/7')).toHaveLength(1))
    expect(api.callsTo('PUT', '/journal/7')[0].body).toEqual({ rating: 5, note: 'Better' })
    expect(api.callsTo('POST', '/progress/101/journal')).toHaveLength(0)
    await waitFor(() => expect(screen.queryByTestId('journal-form')).not.toBeInTheDocument())
  })

  it('asks before deleting, then deletes only that entry', async () => {
    const user = userEvent.setup()
    const api = withEntry({ 'DELETE /journal/7': { body: { message: 'deleted' } } })

    const history = await screen.findByTestId('journal-history')
    await user.click(await within(history).findByRole('button', { name: /Delete journal entry/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete this journal entry?' })
    expect(api.callsTo('DELETE', '/journal/7')).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Delete entry' }))

    await waitFor(() => expect(api.callsTo('DELETE', '/journal/7')).toHaveLength(1))
    expect(await screen.findByText('Your journal entry was deleted.')).toBeInTheDocument()
  })

  it('cancelling the delete dialog deletes nothing', async () => {
    const user = userEvent.setup()
    const api = withEntry()

    const history = await screen.findByTestId('journal-history')
    await user.click(await within(history).findByRole('button', { name: /Delete journal entry/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this journal entry?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(api.callsTo('DELETE', '/journal/7')).toHaveLength(0)
  })
})

describe('Completed state and undo button', () => {
  it('shows a green bold Completed with a check, and a red Undo completion button', async () => {
    open({ 'GET /progress': { body: { data: { records: [completedRecord] } } } })

    const label = await screen.findByText('Completed')
    expect(label.className).toContain('font-bold')
    expect(label.className).toContain('text-[#188038]')
    expect(label.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Undo completion' }).className).toContain('btn-red')
  })
})

describe('Unverified parent on the activity page', () => {
  it('cannot mark as completed and is pointed to verification', async () => {
    const api = open({}, makeUser('parent', { email_verified: false, onboarding: 'verify_email' }))

    const button = await screen.findByRole('button', { name: 'Mark as Completed' })
    expect(button).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Verify now' })).toHaveAttribute('href', '/verify-code')
    expect(screen.queryByTestId('journal-history')).not.toBeInTheDocument()
    await settle(api)
    expect(api.callsTo('POST', '/activities/1/complete')).toHaveLength(0)
  })
})

describe('Admin: Activity Feedback', () => {
  const row = (id, extra = {}) => ({
    id,
    rating: 4,
    note: 'Great session',
    session_completed_at: '2026-11-05T10:00:00Z',
    created_at: '2026-11-05T10:00:00Z',
    user: { id: 9, name: 'Pat Parent' },
    child: { id: 1, name: 'Mia' },
    activity: { id: 1, title: 'Memory Match' },
    ...extra,
  })

  const render = (routes) => {
    signIn()
    const api = mockApi({ 'GET /user': { body: makeUser('admin') }, ...routes })
    renderWithProviders(<ActivityFeedbackSection />, { route: '/professional-dashboard' })

    return api
  }

  it('shows the parent, activity, rating, child, date and note', async () => {
    render({ 'GET /admin/activity-feedback': { body: { data: [row(1)], meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 } } } })

    const section = await screen.findByTestId('activity-feedback')
    expect(await within(section).findByText('Pat Parent')).toBeInTheDocument()
    expect(within(section).getByRole('heading', { name: 'Activity Feedback' })).toBeInTheDocument()
    expect(within(section).getByText('Memory Match')).toBeInTheDocument()
    expect(within(section).getByRole('img', { name: 'Rated 4 out of 5' })).toBeInTheDocument()
    expect(within(section).getByText('Great session')).toBeInTheDocument()
    expect(within(section).getByText(/Child: Mia/)).toBeInTheDocument()
    expect(within(section).queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    render({ 'GET /admin/activity-feedback': { body: { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 } } } })

    expect(await screen.findByText(/No activity feedback yet/)).toBeInTheDocument()
  })

  it('wraps a very long note instead of breaking the layout', async () => {
    render({ 'GET /admin/activity-feedback': { body: { data: [row(1, { note: 'x'.repeat(4000) })], meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 } } } })

    const note = await screen.findByText('x'.repeat(4000))
    expect(note.className).toContain('overflow-wrap:anywhere')
  })

  it('pages through the entries, ten at a time', async () => {
    const user = userEvent.setup()
    const api = render({
      'GET /admin/activity-feedback': ({ query }) => ({
        body: {
          data: [row(Number(query.page), { note: `Page ${query.page} note` })],
          meta: { current_page: Number(query.page), last_page: 2, total: 11, per_page: 10 },
        },
      }),
    })

    await screen.findByText('Page 1 note')
    expect(screen.getByRole('button', { name: 'Newer' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Older' }))
    await screen.findByText('Page 2 note')
    expect(api.callsTo('GET', '/admin/activity-feedback').map((call) => call.query.page)).toEqual(['1', '2'])
    expect(api.callsTo('GET', '/admin/activity-feedback')[0].query.per_page).toBe('10')
    expect(screen.getByRole('button', { name: 'Older' })).toBeDisabled()
  })

  it('offers a retry on an error', async () => {
    const user = userEvent.setup()
    let n = 0
    render({
      'GET /admin/activity-feedback': () =>
        ++n === 1
          ? { status: 500, body: {} }
          : { body: { data: [row(1)], meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 } } },
    })

    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Pat Parent')).toBeInTheDocument()
  })
})
