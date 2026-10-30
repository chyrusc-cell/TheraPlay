import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Activities from './Activities.jsx'
import ChildSelector from './ChildSelector.jsx'
import { makeActivity, makeChild, makeUser, mockApi, renderWithProviders, settle, settleBriefly, signIn } from './test/helpers.jsx'

// The minimum loading time for skeletons is a UX nicety, not behaviour under test.
vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const mia = makeChild(1, 'Mia', { conditions: [{ id: 10, name: 'ADHD', is_active: true }] })
const leo = makeChild(2, 'Leo', { conditions: [{ id: 11, name: 'Autism', is_active: true }] })

// Memory/Easy, Memory/Hard, Motor/Easy, and one with no category.
const published = [
  makeActivity(1, 'Memory Match', { category: 'Memory', difficulty: 'Easy' }),
  makeActivity(2, 'Memory Master', { category: 'Memory', difficulty: 'Hard' }),
  makeActivity(3, 'Block Stacking', { category: 'Motor Skills', difficulty: 'Easy' }),
  makeActivity(4, 'Free Play', { category: null, difficulty: 'Medium' }),
]

const progress = (...activityIds) => ({
  body: {
    data: {
      records: activityIds.map((id) => ({ id: 100 + id, activity_id: id, status: 'completed', completed_at: '2026-10-20T10:00:00Z' })),
    },
  },
})

// A normal signed-in parent with two children; override any route per test.
// user: null with signedIn: false is a guest; makeUser('admin') is an admin.
async function setup(routes = {}, { children = [mia, leo], user = makeUser('parent'), signedIn = true } = {}) {
  if (signedIn) signIn()
  const api = mockApi({
    'GET /user': user ? { body: user } : { status: 401, body: {} },
    'GET /children': { body: { data: children } },
    'GET /activities': { body: { data: published } },
    // Like the real server: with several children, it must be told which one.
    'GET /progress': ({ query }) =>
      !query.child_id && children.length > 1
        ? { status: 422, body: { errors: { child_id: ['Choose which child this is for.'] } } }
        : progress(),
    ...routes,
  })

  renderWithProviders(
    <>
      <ChildSelector />
      <Activities />
    </>,
    { route: '/activities' }
  )

  // The page loads in steps (user, children, then its own data); wait for the end.
  await settle(api)

  return api
}

const titles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
const waitForCards = () => screen.findByRole('link', { name: 'View activity: Memory Match' })
const cardFor = (title) => screen.getByRole('heading', { name: title }).closest('.flex-col')
const pick = (label, value) => userEvent.selectOptions(screen.getByLabelText(label), value)

describe('Activities: which activities a parent sees', () => {
  it('shows ALL published activities, whatever the selected child\'s conditions are', async () => {
    await setup()
    await waitForCards()

    expect(titles()).toEqual(['Memory Match', 'Memory Master', 'Block Stacking', 'Free Play'])
  })

  it('asks only for the public published list, never filtered by child or condition', async () => {
    const api = await setup()
    await waitForCards()

    const requests = api.callsTo('GET', '/activities')
    expect(requests.length).toBeGreaterThanOrEqual(1)
    requests.forEach((request) => expect(request.query).toEqual({}))
    // No admin list (which includes drafts), no condition or child narrowing.
    expect(api.calls.filter((c) => c.path.startsWith('/admin'))).toEqual([])
    expect(api.calls.map((c) => JSON.stringify(c.query)).join()).not.toMatch(/condition/i)
  })

  it('shows exactly what the published list returns (a draft the list leaves out never appears)', async () => {
    // The server's public list excludes drafts (covered by the backend tests);
    // the page must not add anything of its own.
    await setup({ 'GET /activities': { body: { data: [published[0]] } } })
    await waitForCards()

    expect(titles()).toEqual(['Memory Match'])
    expect(screen.queryByText('Draft Idea')).not.toBeInTheDocument()
  })

  it('shows the same list for a child with no conditions at all', async () => {
    await setup({}, { children: [makeChild(5, 'Sam')] })
    await waitForCards()

    expect(titles()).toHaveLength(4)
  })
})

describe('Activities: Category and Difficulty filters', () => {
  it('offers only the categories that the loaded activities really have, in order', async () => {
    await setup()
    await waitForCards()

    const options = within(screen.getByLabelText('Category')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['All Categories', 'Memory', 'Motor Skills'])

    const levels = within(screen.getByLabelText('Difficulty')).getAllByRole('option').map((o) => o.textContent)
    expect(levels).toEqual(['All Difficulties', 'Easy', 'Medium', 'Hard'])
  })

  it('filters by Category alone', async () => {
    await setup()
    await waitForCards()

    await pick('Category', 'Memory')

    expect(titles()).toEqual(['Memory Match', 'Memory Master'])
  })

  it('filters by Difficulty alone (including activities with no category)', async () => {
    await setup()
    await waitForCards()

    await pick('Difficulty', 'Medium')

    expect(titles()).toEqual(['Free Play'])
  })

  it('combines Category and Difficulty', async () => {
    await setup()
    await waitForCards()

    await pick('Category', 'Memory')
    await pick('Difficulty', 'Hard')

    expect(titles()).toEqual(['Memory Master'])
  })

  it('keeps the two filters independent: changing one does not reset the other', async () => {
    await setup()
    await waitForCards()

    await pick('Difficulty', 'Easy')
    expect(titles()).toEqual(['Memory Match', 'Block Stacking'])

    await pick('Category', 'Motor Skills')
    expect(screen.getByLabelText('Difficulty')).toHaveValue('Easy')
    expect(titles()).toEqual(['Block Stacking'])

    await pick('Category', 'all')
    expect(screen.getByLabelText('Difficulty')).toHaveValue('Easy')
    expect(titles()).toEqual(['Memory Match', 'Block Stacking'])
  })

  it('restores the full published list when the filters are cleared', async () => {
    await setup()
    await waitForCards()

    await pick('Category', 'Memory')
    await pick('Difficulty', 'Hard')
    expect(titles()).toHaveLength(1)

    await pick('Category', 'all')
    await pick('Difficulty', 'all')

    expect(titles()).toEqual(['Memory Match', 'Memory Master', 'Block Stacking', 'Free Play'])
  })

  it('explains an empty result and offers "Reset filters", which restores everything', async () => {
    const user = userEvent.setup()
    await setup()
    await waitForCards()

    await pick('Category', 'Motor Skills')
    await pick('Difficulty', 'Hard')

    expect(screen.getByRole('status')).toHaveTextContent('No activities match these filters.')
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(titles()).toHaveLength(4)
    expect(screen.getByLabelText('Category')).toHaveValue('all')
    expect(screen.getByLabelText('Difficulty')).toHaveValue('all')
  })

  it('filters without sending any new request', async () => {
    const api = await setup()
    await waitForCards()
    const before = api.calls.length

    await pick('Category', 'Memory')
    await pick('Difficulty', 'Hard')

    expect(api.calls).toHaveLength(before)
  })
})

describe('Activities: the selected child decides completion, not visibility', () => {
  it('marks only the selected child\'s completed activities, and keeps the list the same', async () => {
    await setup({
      'GET /progress?child_id=1': progress(1),
      'GET /progress?child_id=2': progress(3),
    })
    await waitForCards()

    expect(within(cardFor('Memory Match')).getByText(/Completed/)).toBeInTheDocument()
    expect(within(cardFor('Block Stacking')).queryByText(/Completed/)).not.toBeInTheDocument()
    expect(screen.getAllByText('✓ Completed')).toHaveLength(1)
  })

  it('switching child moves the completed marks and never mixes the two children', async () => {
    const user = userEvent.setup()
    const api = await setup({
      'GET /progress?child_id=1': progress(1),
      'GET /progress?child_id=2': progress(3),
    })
    await waitForCards()
    const countBefore = titles().length

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))

    await waitFor(() => expect(within(cardFor('Block Stacking')).getByText(/Completed/)).toBeInTheDocument())

    expect(within(cardFor('Memory Match')).queryByText(/Completed/)).not.toBeInTheDocument()
    expect(screen.getAllByText('✓ Completed')).toHaveLength(1)
    // The visible list did not change: same activities for either child.
    expect(titles()).toHaveLength(countBefore)
    // Completion was requested for each child by id (never for anyone else).
    expect(api.callsTo('GET', '/progress').map((c) => c.query.child_id).filter(Boolean)).toEqual(['1', '2'])
  })

  it('shows nothing as completed for a child with no completed activities', async () => {
    await setup({ 'GET /progress?child_id=1': progress() })
    await waitForCards()

    expect(screen.queryByText('✓ Completed')).not.toBeInTheDocument()
  })

  it('lists not-completed activities first and completed ones last, each exactly once', async () => {
    await setup({ 'GET /progress?child_id=1': progress(1, 3) })
    await waitForCards()

    expect(titles()).toEqual(['Memory Master', 'Free Play', 'Memory Match', 'Block Stacking'])
  })

  it('only ever sends a child that is in the parent\'s own list', async () => {
    // A stale remembered id (for example another parent\'s child) is ignored.
    localStorage.setItem('theraplay_selected_child:1', '999')
    const api = await setup({ 'GET /progress?child_id=1': progress(1) })
    await waitForCards()

    const sent = api.callsTo('GET', '/progress').map((c) => c.query.child_id).filter(Boolean)
    expect(sent).toEqual(['1'])
    expect(sent).not.toContain('999')
  })

  it('does not mark anything as completed when the server refuses the child (404)', async () => {
    await setup({ 'GET /progress?child_id=1': { status: 404, body: { message: 'Not found' } } })
    await waitForCards()

    expect(screen.queryByText('✓ Completed')).not.toBeInTheDocument()
    expect(titles()).toHaveLength(4)
    expect(screen.getByText(/could not load your completion status/)).toBeInTheDocument()
  })
})

describe('Activities: a parent with no child', () => {
  it('still shows the published activities and never sends an invalid child id', async () => {
    const api = await setup({}, { children: [] })
    await waitForCards()

    expect(titles()).toHaveLength(4)
    expect(screen.queryByText('✓ Completed')).not.toBeInTheDocument()
    const urls = api.calls.map((c) => `${c.path}?${new URLSearchParams(c.query)}`).join(' ')
    expect(urls).not.toMatch(/child_id=(null|undefined|NaN|$|&)/)
  })
})

describe('Activities: loading, empty and error states', () => {
  it('says so when there are no activities, and shows no filters', async () => {
    await setup({ 'GET /activities': { body: { data: [] } } })

    expect(await screen.findByText('No activities are available right now.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument()
  })

  it('shows an error when the activities cannot be loaded (parent with no child)', async () => {
    await setup({ 'GET /activities': { status: 500, body: {} } }, { children: [] })

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load activities.')
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })

  it('shows an error when the activities cannot be loaded (parent with a child selected)', async () => {
    await setup({ 'GET /activities': { status: 500, body: {} } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load activities.')
  })

  it('links every card to its activity page', async () => {
    await setup()
    await waitForCards()

    expect(screen.getByRole('link', { name: 'View activity: Memory Match' })).toHaveAttribute('href', '/activities/1')
    expect(screen.getByRole('link', { name: 'View activity: Free Play' })).toHaveAttribute('href', '/activities/4')
  })
})

describe('Activities: loading always ends, also after a failure', () => {
  it('replaces the skeleton with the error when the load fails for the selected child', async () => {
    await setup({ 'GET /activities': { status: 500, body: {} } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load activities.')
    expect(document.querySelector('.skeleton')).toBeNull()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })

  it('a failed load for one child does not stop another child (or the same child, later) from loading', async () => {
    const user = userEvent.setup()
    let activityRequests = 0
    const api = await setup({
      // Only the very first request fails.
      'GET /activities': () => {
        activityRequests += 1
        return activityRequests === 1 ? { status: 500, body: {} } : { body: { data: published } }
      },
      'GET /progress?child_id=1': progress(1),
      'GET /progress?child_id=2': progress(3),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load activities.')

    // Another child loads normally...
    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    await waitFor(() => expect(within(cardFor('Block Stacking')).getByText(/Completed/)).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // ...and so does the first child when chosen again (there is no retry button;
    // choosing the child again is what asks again).
    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Mia' }))
    await waitFor(() => expect(within(cardFor('Memory Match')).getByText(/Completed/)).toBeInTheDocument())
    expect(within(cardFor('Block Stacking')).queryByText(/Completed/)).not.toBeInTheDocument()
    expect(api.callsTo('GET', '/activities')).toHaveLength(3)
  })

  it('never lets a slow answer for the previous child overwrite the newly selected child', async () => {
    const user = userEvent.setup()
    let releaseMia
    const miaGate = new Promise((resolve) => {
      releaseMia = resolve
    })
    await setup({
      // Mia's completion answer is held back (and marks Memory Match)...
      'GET /progress?child_id=1': () => miaGate.then(() => progress(1)),
      'GET /progress?child_id=2': progress(3),
    })

    // ...while Leo is chosen and answers first (marks Block Stacking).
    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    await waitFor(() => expect(within(cardFor('Block Stacking')).getByText(/Completed/)).toBeInTheDocument())

    // Mia's late answer arrives now. It must change nothing.
    releaseMia()
    await settleBriefly()

    expect(within(cardFor('Block Stacking')).getByText(/Completed/)).toBeInTheDocument()
    expect(within(cardFor('Memory Match')).queryByText(/Completed/)).not.toBeInTheDocument()
    expect(screen.getAllByText('✓ Completed')).toHaveLength(1)
  })

  it('ignores an answer for the previous child even if the browser still delivers it', async () => {
    const user = userEvent.setup()
    let releaseMia
    const miaGate = new Promise((resolve) => {
      releaseMia = resolve
    })
    await setup({
      'GET /progress?child_id=1': () => miaGate.then(() => ({ ...progress(1), deliverEvenIfAborted: true })),
      'GET /progress?child_id=2': progress(3),
    })

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    await waitFor(() => expect(within(cardFor('Block Stacking')).getByText(/Completed/)).toBeInTheDocument())

    releaseMia()
    await settleBriefly()

    expect(within(cardFor('Memory Match')).queryByText(/Completed/)).not.toBeInTheDocument()
    expect(within(cardFor('Block Stacking')).getByText(/Completed/)).toBeInTheDocument()
  })

  it('does not leave the page loading when the account cannot be verified', async () => {
    const api = await setup({ 'GET /user': { status: 500, body: {} } })

    // No one is known to be a parent, so there is no completion to ask for, but
    // the public activities are shown.
    expect(await screen.findByRole('link', { name: 'View activity: Memory Match' })).toBeInTheDocument()
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)
    expect(document.querySelector('.skeleton')).toBeNull()
  })
})

describe('Activities: no request before there is enough verified information', () => {
  it('a parent with several children makes exactly one activities request and one progress request, for the selected child', async () => {
    const api = await setup()
    await waitForCards()

    expect(api.callsTo('GET', '/activities')).toHaveLength(1)
    expect(api.callsTo('GET', '/progress')).toHaveLength(1)
    expect(api.callsTo('GET', '/progress')[0].query).toEqual({ child_id: '1' })
  })

  it('asks for nothing until the login has been verified', async () => {
    let releaseUser
    const userGate = new Promise((resolve) => {
      releaseUser = resolve
    })
    const api = await setup({ 'GET /user': () => userGate.then(() => ({ body: makeUser('parent') })) })

    // /user is still pending: not even the public list is requested yet, and
    // nothing parent-specific is.
    expect(api.callsTo('GET', '/user')).toHaveLength(1)
    expect(api.callsTo('GET', '/activities')).toHaveLength(0)
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)

    releaseUser()
    await waitForCards()
    expect(api.callsTo('GET', '/activities')).toHaveLength(1)
    expect(api.callsTo('GET', '/progress')[0].query).toEqual({ child_id: '1' })
  })

  it('a parent with no child gets the activities and makes no progress request at all', async () => {
    const api = await setup({}, { children: [] })
    await waitForCards()

    expect(api.callsTo('GET', '/activities')).toHaveLength(1)
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)
  })

  it('an admin sees the activities and makes no parent-only request (no children, no progress)', async () => {
    const api = await setup({}, { user: makeUser('admin') })
    await waitForCards()

    expect(api.callsTo('GET', '/activities')).toHaveLength(1)
    expect(api.callsTo('GET', '/children')).toHaveLength(0)
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)
    expect(screen.queryByText(/could not load your completion status/)).not.toBeInTheDocument()
  })

  it('a guest sees the activities and makes no request that needs a login', async () => {
    const api = await setup({}, { user: null, signedIn: false })
    await waitForCards()

    expect(api.calls.map((c) => c.path)).toEqual(['/activities'])
  })
})
