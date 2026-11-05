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
  let archived = [{ ...activity(3, 'Draft Notes'), is_published: false, is_archived: true }]

  const api = mockApi({
    'GET /user': { body: makeUser('admin') },
    'GET /admin/activities': ({ query }) => ({ body: { data: query.archived ? archived : list } }),
    'GET /admin/categories': { body: { data: [] } },
    'GET /admin/conditions': { body: { data: [] } },
    'POST /admin/activities/1/archive': () => {
      archived = [...archived, { ...list[0], is_published: false, is_archived: true }]
      list = list.filter((item) => item.id !== 1)
      return { body: { message: 'Activity archived.' } }
    },
    'POST /admin/activities/3/restore': () => {
      list = [...list, { ...archived[0], is_archived: false }]
      archived = []
      return { body: { message: 'Activity restored.' } }
    },
    'DELETE /admin/activities/3': () => {
      archived = archived.filter((item) => item.id !== 3)
      return { body: { message: 'Activity deleted.' } }
    },
    ...routes,
  })

  renderWithProviders(<ManageActivities />, { route: '/manage-activities' })
  await settle(api)

  return api
}

async function openArchived(user, api) {
  await user.click(screen.getByRole('button', { name: 'Archived Activities' }))
  await settle(api)
}

describe('Manage Activities: archive and restore', () => {
  it('offers Archive (not Delete) on live activities and keeps Edit and Unpublish', async () => {
    await setup()

    for (const title of ['Memory Match', 'Story Cards']) {
      expect(screen.getByRole('button', { name: `Edit ${title}` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Unpublish ${title}` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Archive ${title}` })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: `Delete ${title}` })).not.toBeInTheDocument()
    }

    expect(screen.queryByText('Draft Notes')).not.toBeInTheDocument()
  })

  it('archives an activity and says where to find it', async () => {
    const user = userEvent.setup()
    const api = await setup()

    await user.click(screen.getByRole('button', { name: 'Archive Memory Match' }))
    await settle(api)

    expect(api.callsTo('POST', '/admin/activities/1/archive')).toHaveLength(1)
    expect(screen.getByText(/"Memory Match" was archived/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Memory Match' })).not.toBeInTheDocument()
  })

  it('lists archived activities separately, labelled Archived, with Restore and Delete only', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await openArchived(user, api)

    expect(api.calls.some((call) => call.path === '/admin/activities' && call.query.archived === '1')).toBe(true)
    expect(screen.getByText('Draft Notes')).toBeInTheDocument()
    expect(screen.getByText('Archived', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore Draft Notes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Draft Notes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Draft Notes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish Draft Notes' })).not.toBeInTheDocument()
  })

  it('restores an archived activity back to the normal list', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await openArchived(user, api)

    await user.click(screen.getByRole('button', { name: 'Restore Draft Notes' }))
    await settle(api)

    expect(api.callsTo('POST', '/admin/activities/3/restore')).toHaveLength(1)
    expect(screen.getByText('No archived activities.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Activities' }))
    await settle(api)
    expect(screen.getByText('Draft Notes')).toBeInTheDocument()
  })
})

describe('Manage Activities: permanent delete (archived activities only)', () => {
  it('names the activity and warns that its progress is deleted too', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await openArchived(user, api)

    await user.click(screen.getByRole('button', { name: 'Delete Draft Notes' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Delete this activity permanently?')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('"Draft Notes"')
    expect(dialog).toHaveTextContent('progress history')
    expect(dialog).toHaveTextContent('cannot be undone')
    expect(api.callsTo('DELETE', '/admin/activities/3')).toHaveLength(0)
  })

  it('cancelling deletes nothing', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await openArchived(user, api)

    await user.click(screen.getByRole('button', { name: 'Delete Draft Notes' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.callsTo('DELETE', '/admin/activities/3')).toHaveLength(0)
    expect(screen.getByText('Draft Notes')).toBeInTheDocument()
  })

  it('deletes after confirming, says so, and refreshes the archived list', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await openArchived(user, api)

    await user.click(screen.getByRole('button', { name: 'Delete Draft Notes' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))
    await settle(api)

    expect(api.callsTo('DELETE', '/admin/activities/3')).toHaveLength(1)
    expect(screen.getByText(/"Draft Notes" was permanently deleted/)).toBeInTheDocument()
    expect(screen.getByText('No archived activities.')).toBeInTheDocument()
  })

  it('sends only one request when the confirm button is pressed twice', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const api = await setup({
      'DELETE /admin/activities/3': () => gate.then(() => ({ body: { message: 'Activity deleted.' } })),
    })
    await openArchived(user, api)

    await user.click(screen.getByRole('button', { name: 'Delete Draft Notes' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deleting...' }))

    release()
    await settle(api)

    expect(api.callsTo('DELETE', '/admin/activities/3')).toHaveLength(1)
  })

  it('shows the server message when the deletion fails, and keeps the activity', async () => {
    const user = userEvent.setup()
    const api = await setup({
      'DELETE /admin/activities/3': { status: 500, body: { message: 'Could not delete the activity.' } },
    })
    await openArchived(user, api)

    await user.click(screen.getByRole('button', { name: 'Delete Draft Notes' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('Could not delete the activity.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore Draft Notes' })).toBeInTheDocument()
  })
})

describe('Manage Activities: the category is required', () => {
  const categories = [
    { id: 1, name: 'Executive Function', description: null, activities_count: 0 },
    { id: 6, name: 'Visual', description: null, activities_count: 0 },
  ]

  async function openAddForm(routes = {}) {
    const user = userEvent.setup()
    const api = await setup({
      'GET /admin/categories': { body: { data: categories } },
      'POST /admin/activities': { status: 201, body: { message: 'Activity created.', data: activity(9, 'New one') } },
      ...routes,
    })

    await user.click(screen.getByRole('button', { name: '+ Add Activity' }))
    await user.type(await screen.findByLabelText('Activity Name'), 'New one')
    await user.type(screen.getByLabelText(/Instructions/), 'Step one')

    return { user, api }
  }

  it('offers a "Select a category" placeholder instead of "No category"', async () => {
    await openAddForm()

    const select = screen.getByLabelText('Category')
    expect(within(select).getByRole('option', { name: 'Select a category' })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'No category' })).not.toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Visual' })).toBeInTheDocument()
  })

  it('shows a message and sends nothing when no category is chosen', async () => {
    const { user, api } = await openAddForm()

    await user.click(screen.getByRole('button', { name: 'Add Activity' }))

    expect(await screen.findByText('Please select a category.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/admin/activities')).toHaveLength(0)
  })

  it('sends the chosen category id', async () => {
    const { user, api } = await openAddForm()

    await user.selectOptions(screen.getByLabelText('Category'), 'Visual')
    await user.click(screen.getByRole('button', { name: 'Add Activity' }))

    await waitFor(() => expect(api.callsTo('POST', '/admin/activities')).toHaveLength(1))
    expect(api.callsTo('POST', '/admin/activities')[0].body.category_id).toBe(6)
  })

  it('shows the server message when the server rejects the category', async () => {
    const { user } = await openAddForm({
      'POST /admin/activities': {
        status: 422,
        body: { message: 'The selected category id is invalid.', errors: { category_id: ['The selected category id is invalid.'] } },
      },
    })

    await user.selectOptions(screen.getByLabelText('Category'), 'Visual')
    await user.click(screen.getByRole('button', { name: 'Add Activity' }))

    expect(await screen.findByText('The selected category id is invalid.')).toBeInTheDocument()
  })

  it('also requires a category when editing an activity that has none', async () => {
    const user = userEvent.setup()
    const api = await setup({
      'GET /admin/categories': { body: { data: categories } },
      'GET /admin/activities': () => ({ body: { data: [{ ...activity(1, 'Memory Match'), category: null, category_id: null, instructions: ['Go'], materials: [] }] } }),
      'GET /admin/activities/1': { body: { data: { ...activity(1, 'Memory Match'), category: null, category_id: null, instructions: ['Go'], materials: [], condition_ids: [] } } },
      'PUT /admin/activities/1': { body: { message: 'Activity updated.', data: activity(1, 'Memory Match') } },
    })

    await user.click(screen.getByRole('button', { name: 'Edit Memory Match' }))
    await user.click(await screen.findByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Please select a category.')).toBeInTheDocument()
    expect(api.callsTo('PUT', '/admin/activities/1')).toHaveLength(0)
  })
})
