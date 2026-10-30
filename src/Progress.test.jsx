import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ChildSelector from './ChildSelector.jsx'
import Progress from './Progress.jsx'
import { makeChild, makeUser, mockApi, renderWithProviders, settle, settleBriefly, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const mia = makeChild(1, 'Mia')
const leo = makeChild(2, 'Leo')

const record = (id, title, category) => ({
  id,
  activity_id: id,
  activity_title: title,
  category,
  status: 'completed',
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
})

const miaRecords = [record(1, 'Memory Match', 'Memory')]
const leoRecords = [record(2, 'Block Stacking', 'Motor Skills'), record(3, 'Bead Threading', 'Motor Skills')]

// user: null with signedIn: false is a guest; makeUser('admin') is an admin.
async function setup(routes = {}, { children = [mia, leo], user = makeUser('parent'), signedIn = true } = {}) {
  if (signedIn) signIn()
  const api = mockApi({
    'GET /user': user ? { body: user } : { status: 401, body: {} },
    'GET /children': { body: { data: children } },
    // Like the real server: with several children it must be told which one.
    'GET /progress': () => ({ status: 422, body: { errors: { child_id: ['Choose which child this is for.'] } } }),
    'GET /progress?child_id=1': { body: { data: { records: miaRecords } } },
    'GET /progress?child_id=2': { body: { data: { records: leoRecords } } },
    ...routes,
  })

  renderWithProviders(
    <>
      <ChildSelector />
      <Progress />
    </>,
    { route: '/progress' }
  )
  await settle(api)

  return api
}

describe('Progress: per-child progress', () => {
  it('shows the selected child\'s name and only that child\'s activities', async () => {
    await setup()

    expect(await screen.findByText('Progress for Mia')).toBeInTheDocument()
    expect(screen.getByText('Memory Match')).toBeInTheDocument()
    expect(screen.queryByText('Block Stacking')).not.toBeInTheDocument()
    expect(screen.queryByText('Bead Threading')).not.toBeInTheDocument()
  })

  it('switches to the other child\'s progress without mixing the two', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await screen.findByText('Progress for Mia')

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))

    expect(await screen.findByText('Progress for Leo')).toBeInTheDocument()
    expect(screen.getByText('Block Stacking')).toBeInTheDocument()
    expect(screen.getByText('Bead Threading')).toBeInTheDocument()
    expect(screen.queryByText('Memory Match')).not.toBeInTheDocument()
    expect(api.callsTo('GET', '/progress').map((c) => c.query.child_id).filter(Boolean)).toEqual(['1', '2'])
  })

  it('never shows the previous child\'s progress while the new child\'s is still loading', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    await setup({ 'GET /progress?child_id=2': () => gate.then(() => ({ body: { data: { records: leoRecords } } })) })
    await screen.findByText('Progress for Mia')

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))

    // Leo's data has not arrived: Mia's must already be gone.
    await waitFor(() => expect(screen.queryByText('Memory Match')).not.toBeInTheDocument())
    expect(screen.queryByText('Progress for Mia')).not.toBeInTheDocument()

    release()
    expect(await screen.findByText('Progress for Leo')).toBeInTheDocument()
  })
})

describe('Progress: no child, failures and expired logins', () => {
  it('asks a parent with no child to add one first, and requests no child\'s progress', async () => {
    const api = await setup({}, { children: [] })

    expect(await screen.findByRole('heading', { name: 'Add a child profile first' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a child profile' })).toHaveAttribute('href', '/profile')
    // Nothing at all is asked of the progress endpoint.
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)
    expect(screen.queryByText(/Progress for/)).not.toBeInTheDocument()
  })

  it('tells the parent when the children could not be loaded, and asks for no progress', async () => {
    const api = await setup({ 'GET /children': { status: 500, body: {} } })

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your child profiles.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(api.callsTo('GET', '/progress').filter((c) => c.query.child_id)).toHaveLength(0)
  })

  it('clears the saved login when the server says it has expired (401)', async () => {
    await setup({ 'GET /progress?child_id=1': { status: 401, body: { message: 'Unauthenticated.' } } })

    await waitFor(() => expect(localStorage.getItem('theraplay_token')).toBeNull())
  })
})

describe('Progress: loading always ends, also after a failure', () => {
  it('replaces the skeleton with the error when the load fails for the selected child', async () => {
    await setup({ 'GET /progress?child_id=1': { status: 500, body: {} } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your progress.')
    expect(document.querySelector('.skeleton')).toBeNull()
    expect(screen.queryByText('Progress for Mia')).not.toBeInTheDocument()
  })

  it('a failed load for one child does not stop another child (or the same child, later) from loading', async () => {
    const user = userEvent.setup()
    let miaRequests = 0
    const api = await setup({
      // Mia's first request fails; asking again works.
      'GET /progress?child_id=1': () => {
        miaRequests += 1
        return miaRequests === 1 ? { status: 500, body: {} } : { body: { data: { records: miaRecords } } }
      },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your progress.')

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    expect(await screen.findByText('Progress for Leo')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // There is no retry button; choosing the first child again asks again.
    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Mia' }))
    expect(await screen.findByText('Progress for Mia')).toBeInTheDocument()
    expect(screen.getByText('Memory Match')).toBeInTheDocument()
    expect(api.callsTo('GET', '/progress').map((c) => c.query.child_id)).toEqual(['1', '2', '1'])
  })

  it('never lets a slow answer for the previous child overwrite the newly selected child', async () => {
    const user = userEvent.setup()
    let releaseMia
    const miaGate = new Promise((resolve) => {
      releaseMia = resolve
    })
    await setup({ 'GET /progress?child_id=1': () => miaGate.then(() => ({ body: { data: { records: miaRecords } } })) })

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    expect(await screen.findByText('Progress for Leo')).toBeInTheDocument()

    // Mia's late answer arrives now. It must change nothing.
    releaseMia()
    await settleBriefly()

    expect(screen.getByText('Progress for Leo')).toBeInTheDocument()
    expect(screen.getByText('Block Stacking')).toBeInTheDocument()
    expect(screen.queryByText('Memory Match')).not.toBeInTheDocument()
  })
})

describe('Progress: a stale answer', () => {
  it('is ignored even if the browser still delivers it', async () => {
    const user = userEvent.setup()
    let releaseMia
    const miaGate = new Promise((resolve) => {
      releaseMia = resolve
    })
    await setup({
      'GET /progress?child_id=1': () =>
        miaGate.then(() => ({ body: { data: { records: miaRecords } }, deliverEvenIfAborted: true })),
    })

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    expect(await screen.findByText('Progress for Leo')).toBeInTheDocument()

    releaseMia()
    await settleBriefly()

    expect(screen.getByText('Progress for Leo')).toBeInTheDocument()
    expect(screen.queryByText('Memory Match')).not.toBeInTheDocument()
  })
})

describe('Progress: no request before there is enough verified information', () => {
  it('a parent with several children makes exactly one progress request, for the selected child', async () => {
    const api = await setup()
    await screen.findByText('Progress for Mia')

    expect(api.callsTo('GET', '/progress')).toHaveLength(1)
    expect(api.callsTo('GET', '/progress')[0].query).toEqual({ child_id: '1' })
  })

  it('asks for nothing until the login has been verified', async () => {
    let releaseUser
    const userGate = new Promise((resolve) => {
      releaseUser = resolve
    })
    const api = await setup({ 'GET /user': () => userGate.then(() => ({ body: makeUser('parent') })) })

    expect(api.callsTo('GET', '/progress')).toHaveLength(0)

    releaseUser()
    expect(await screen.findByText('Progress for Mia')).toBeInTheDocument()
    expect(api.callsTo('GET', '/progress')).toHaveLength(1)
  })

  it('an admin makes no parent-only request (no children, no progress) and nothing keeps loading', async () => {
    const api = await setup({}, { user: makeUser('admin') })

    expect(await screen.findByRole('heading', { level: 1, name: 'My Progress' })).toBeInTheDocument()
    expect(api.callsTo('GET', '/children')).toHaveLength(0)
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)
    expect(document.querySelector('.skeleton')).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a guest is sent to login and makes no request at all', async () => {
    const api = await setup({}, { user: null, signedIn: false })

    expect(api.calls).toHaveLength(0)
  })

  it('does not hang when the account cannot be verified: it says so and asks for no progress', async () => {
    const api = await setup({ 'GET /user': { status: 500, body: {} } })

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not verify your account.')
    expect(api.callsTo('GET', '/progress')).toHaveLength(0)
    expect(document.querySelector('.skeleton')).toBeNull()
  })
})
