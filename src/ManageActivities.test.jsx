import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ManageActivities from './ManageActivities.jsx'
import { makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const activity = (id, title) => ({
  id,
  title,
  description: '',
  difficulty: 'Easy',
  category: 'Speech',
  is_published: true,
  resources: [],
})

async function setup(routes = {}) {
  signIn()
  let list = [activity(1, 'Memory Match'), activity(2, 'Story Cards')]

  const api = mockApi({
    'GET /user': { body: makeUser('admin') },
    'GET /admin/activities': () => ({ body: { data: list } }),
    'GET /admin/categories': { body: { data: [] } },
    'GET /admin/conditions': { body: { data: [] } },
    'DELETE /admin/activities/1': () => {
      list = list.filter((item) => item.id !== 1)
      return { body: { message: 'Activity deleted.' } }
    },
    ...routes,
  })

  renderWithProviders(<ManageActivities />, { route: '/manage-activities' })
  await settle(api)

  return api
}

describe('Manage Activities: permanent delete', () => {
  it('shows a Delete button on every activity next to Edit and Unpublish', async () => {
    await setup()

    for (const title of ['Memory Match', 'Story Cards']) {
      expect(screen.getByRole('button', { name: `Edit ${title}` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Unpublish ${title}` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Delete ${title}` })).toBeInTheDocument()
    }
  })

  it('names the activity and warns that its progress is deleted too', async () => {
    const user = userEvent.setup()
    const api = await setup()

    await user.click(screen.getByRole('button', { name: 'Delete Memory Match' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Delete this activity permanently?')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('"Memory Match"')
    expect(dialog).toHaveTextContent(/permanently/i)
    expect(dialog).toHaveTextContent(/progress records/i)
    // Nothing is deleted until it is confirmed.
    expect(api.callsTo('DELETE', '/admin/activities/1')).toHaveLength(0)
  })

  it('cancelling deletes nothing', async () => {
    const user = userEvent.setup()
    const api = await setup()

    await user.click(screen.getByRole('button', { name: 'Delete Memory Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.callsTo('DELETE', '/admin/activities/1')).toHaveLength(0)
    expect(screen.getByText('Memory Match')).toBeInTheDocument()
  })

  it('deletes after confirming, says so, and refreshes the list', async () => {
    const user = userEvent.setup()
    const api = await setup()

    await user.click(screen.getByRole('button', { name: 'Delete Memory Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText(/"Memory Match" was permanently deleted/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit Memory Match' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit Story Cards' })).toBeInTheDocument()
    expect(api.callsTo('DELETE', '/admin/activities/1')).toHaveLength(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sends only one request when the confirm button is pressed twice', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const api = await setup({
      'DELETE /admin/activities/1': () => gate.then(() => ({ body: { message: 'Activity deleted.' } })),
    })

    await user.click(screen.getByRole('button', { name: 'Delete Memory Match' }))
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' })
    await user.click(confirm)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deleting...' }))

    release()
    await settle(api)

    expect(api.callsTo('DELETE', '/admin/activities/1')).toHaveLength(1)
  })

  it('shows the server message when the deletion fails, and keeps the activity', async () => {
    const user = userEvent.setup()
    await setup({
      'DELETE /admin/activities/1': { status: 500, body: { message: 'Could not delete the activity.' } },
    })

    await user.click(screen.getByRole('button', { name: 'Delete Memory Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('Could not delete the activity.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Memory Match' })).toBeInTheDocument()
  })
})
