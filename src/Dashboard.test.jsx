import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ChildSelector from './ChildSelector.jsx'
import Dashboard from './Dashboard.jsx'
import { makeActivity, makeChild, makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const mia = makeChild(1, 'Mia')
const leo = makeChild(2, 'Leo')
const noRecords = { body: { data: { records: [] } } }

async function setup(routes = {}) {
  signIn()
  const api = mockApi({
    'GET /user': { body: makeUser('parent') },
    'GET /children': { body: { data: [mia, leo] } },
    'GET /activities': { body: { data: [makeActivity(1, 'Memory Match')] } },
    'GET /progress?child_id=1': noRecords,
    'GET /progress?child_id=2': noRecords,
    ...routes,
  })

  renderWithProviders(
    <>
      <ChildSelector />
      <Dashboard />
    </>,
    { route: '/dashboard' }
  )
  await settle(api)

  return api
}

describe('Dashboard: loading ends after a failure, and requests wait for verified information', () => {
  it('loads once, for the selected child, after the login and children are known', async () => {
    const api = await setup()

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
    expect(api.callsTo('GET', '/progress')).toHaveLength(1)
    expect(api.callsTo('GET', '/progress')[0].query).toEqual({ child_id: '1' })
  })

  it('puts Summary of Progress (left) and Recent Activities (right) side by side, stacking at laptop width and below', async () => {
    await setup()
    const summary = await screen.findByRole('heading', { level: 2, name: 'Summary of Progress' })
    const recent = screen.getByRole('heading', { level: 2, name: 'Recent Activities' })

    const row = screen.getByTestId('dashboard-lower-cards')
    expect(row).toContainElement(summary)
    expect(row).toContainElement(recent)
    expect(row).toHaveClass('grid', 'grid-cols-2', 'gap-6', 'laptop:grid-cols-1')
    // Summary comes first in the DOM, so it is the left column.
    expect(summary.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the "This week" date range on the Streak card', async () => {
    await setup()
    await screen.findByRole('heading', { level: 2, name: 'Streak' })

    expect(screen.getByText(/^This week • /)).toBeInTheDocument()
  })

  it('shows the error, not an endless skeleton, when the load fails for the selected child', async () => {
    await setup({ 'GET /progress?child_id=1': { status: 500, body: {} } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your dashboard.')
    expect(document.querySelector('.skeleton')).toBeNull()
  })

  it('still loads another child after a failure', async () => {
    const user = userEvent.setup()
    await setup({ 'GET /progress?child_id=1': { status: 500, body: {} } })
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: /Choose child/ }))
    await user.click(screen.getByRole('option', { name: 'Leo' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
