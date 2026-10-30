import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ChildrenSection from './ChildrenSection.jsx'
import { makeChild, makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

const adhd = { id: 10, name: 'ADHD', description: null, is_active: true }
const autism = { id: 11, name: 'Autism', description: null, is_active: true }

// A tiny in-memory "database" so that a save is visible in the next GET /children.
function setup({ children, user = makeUser('parent'), routes = {} } = {}) {
  signIn()
  const db = {
    children: children ?? [
      makeChild(1, 'Mia', { date_of_birth: '2021-03-04', conditions: [adhd] }),
      makeChild(2, 'Leo', { date_of_birth: '2022-08-09', conditions: [] }),
    ],
  }

  const api = mockApi({
    'GET /user': { body: user },
    'GET /children': () => ({ body: { data: db.children } }),
    'GET /conditions': { body: { data: [adhd, autism] } },
    'POST /children': ({ body }) => {
      const created = makeChild(3, body.name, { date_of_birth: body.date_of_birth })
      db.children = [...db.children, created]
      return { status: 201, body: { data: { child: created } } }
    },
    'PUT /children/2': ({ body }) => {
      db.children = db.children.map((c) => (c.id === 2 ? { ...c, name: body.name, date_of_birth: body.date_of_birth } : c))
      return { body: { data: { child: db.children.find((c) => c.id === 2) } } }
    },
    'DELETE /children/2': () => {
      db.children = db.children.filter((c) => c.id !== 2)
      return { body: { message: 'deleted' } }
    },
    ...routes,
  })

  renderWithProviders(<ChildrenSection />, { route: '/profile' })

  return { api, db }
}

const childCard = (name) => screen.getByRole('heading', { level: 3, name: new RegExp(`^${name}`) }).closest('li')
const openAdd = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Add a child' }))
  return screen.findByRole('dialog', { name: 'Add a child' })
}

describe('My Children: listing and selecting', () => {
  it('lists every child with their conditions and marks the selected one', async () => {
    setup()

    expect(await screen.findByRole('heading', { level: 3, name: /^Mia/ })).toBeInTheDocument()
    expect(within(childCard('Mia')).getByText('Selected')).toBeInTheDocument()
    expect(within(childCard('Mia')).getByText('ADHD')).toBeInTheDocument()
    expect(within(childCard('Leo')).getByText('No conditions selected yet.')).toBeInTheDocument()
    expect(within(childCard('Leo')).queryByText('Selected')).not.toBeInTheDocument()
    expect(within(childCard('Mia')).getByText(/years old/)).toBeInTheDocument()
  })

  it('"Use this child" changes the selected child', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('heading', { level: 3, name: /^Mia/ })

    await user.click(within(childCard('Leo')).getByRole('button', { name: 'Use this child' }))

    expect(within(childCard('Leo')).getByText('Selected')).toBeInTheDocument()
    expect(within(childCard('Mia')).queryByText('Selected')).not.toBeInTheDocument()
    expect(within(childCard('Mia')).getByRole('button', { name: 'Use this child' })).toBeInTheDocument()
  })

  it('invites a parent with no child to add the first one', async () => {
    setup({ children: [] })

    expect(await screen.findByText(/You have not added a child yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a child' })).toBeInTheDocument()
  })

  it('shows nothing at all to an admin', async () => {
    const { api } = setup({ user: makeUser('admin') })
    await settle(api)

    expect(screen.queryByRole('heading', { name: 'My Children' })).not.toBeInTheDocument()
    expect(api.callsTo('GET', '/children')).toHaveLength(0)
  })

  it('reports a failure to load the children and offers to try again', async () => {
    const { api } = setup({ routes: { 'GET /children': { status: 500, body: {} } } })

    expect(await screen.findByText('We could not load your child profiles.')).toBeInTheDocument()
    const before = api.callsTo('GET', '/children').length
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(api.callsTo('GET', '/children').length).toBeGreaterThan(before))
  })
})

describe('My Children: adding a child', () => {
  it('opens an empty add form with the conditions to choose from', async () => {
    const user = userEvent.setup()
    setup()
    const dialog = await openAdd(user)

    expect(within(dialog).getByLabelText("Child's name")).toHaveValue('')
    expect(within(dialog).getByLabelText('Date of birth (optional)')).toHaveValue('')
    expect(await within(dialog).findByRole('checkbox', { name: 'ADHD' })).not.toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Autism' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Add Child' })).toBeInTheDocument()
  })

  it('saves a new child with their details, selects them and closes the form', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), '  Zoe ')
    await user.type(within(dialog).getByLabelText('Date of birth (optional)'), '2020-05-06')
    await user.click(await within(dialog).findByRole('checkbox', { name: 'Autism' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.callsTo('POST', '/children')[0].body).toEqual({
      name: 'Zoe',
      date_of_birth: '2020-05-06',
      condition_ids: [11],
    })
    expect(await screen.findByRole('heading', { level: 3, name: /^Zoe/ })).toBeInTheDocument()
    expect(within(childCard('Zoe')).getByText('Selected')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Child profile added.')
  })

  it('does not save, and says what is wrong, when the name is empty', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    const dialog = await openAdd(user)

    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    expect(within(dialog).getByText("Please enter your child's name.")).toBeInTheDocument()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.')
    expect(api.callsTo('POST', '/children')).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('rejects a date of birth in the future before sending anything', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), 'Zoe')
    await user.type(within(dialog).getByLabelText('Date of birth (optional)'), '2999-01-01')
    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    expect(within(dialog).getByText('The date of birth cannot be in the future.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/children')).toHaveLength(0)
  })

  it('shows the server\'s validation message on the field and keeps the form open with the typed values', async () => {
    const user = userEvent.setup()
    setup({
      routes: { 'POST /children': { status: 422, body: { errors: { name: ['This name is not allowed.'] } } } },
    })
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), 'Zoe')
    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    expect(await within(dialog).findByText('This name is not allowed.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Child's name")).toHaveValue('Zoe')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows an error when the server fails, and keeps what was typed', async () => {
    const user = userEvent.setup()
    setup({ routes: { 'POST /children': { status: 500, body: { message: 'The server had a problem.' } } } })
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), 'Zoe')
    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The server had a problem.')
    expect(within(dialog).getByLabelText("Child's name")).toHaveValue('Zoe')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: /^Zoe/ })).not.toBeInTheDocument()
  })

  it('stays open and locked while the save is running, then closes when it is done', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    setup({
      routes: {
        'POST /children': async ({ body }) => {
          await gate
          return { status: 201, body: { data: { child: makeChild(3, body.name) } } }
        },
      },
    })
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), 'Zoe')
    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    // Mid-save: the button says so, nothing can be edited or dismissed.
    expect(await within(dialog).findByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(within(dialog).getByLabelText("Child's name")).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    release()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes without saving when cancelled', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), 'Zoe')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.callsTo('POST', '/children')).toHaveLength(0)
  })

  it('leaves the app and clears the login when the session has expired while saving', async () => {
    const user = userEvent.setup()
    setup({ routes: { 'POST /children': { status: 401, body: { message: 'Unauthenticated.' } } } })
    const dialog = await openAdd(user)

    await user.type(within(dialog).getByLabelText("Child's name"), 'Zoe')
    await user.click(within(dialog).getByRole('button', { name: 'Add Child' }))

    await waitFor(() => expect(localStorage.getItem('theraplay_token')).toBeNull())
  })
})

describe('My Children: editing a child', () => {
  const openEdit = async (user, name) => {
    await screen.findByRole('heading', { level: 3, name: new RegExp(`^${name}`) })
    await user.click(within(childCard(name)).getByRole('button', { name: 'Edit' }))
    return screen.findByRole('dialog', { name: 'Edit child profile' })
  }

  it('opens with the child\'s existing details already filled in', async () => {
    const user = userEvent.setup()
    setup()
    const dialog = await openEdit(user, 'Mia')

    expect(within(dialog).getByLabelText("Child's name")).toHaveValue('Mia')
    expect(within(dialog).getByLabelText('Date of birth (optional)')).toHaveValue('2021-03-04')
    expect(await within(dialog).findByRole('checkbox', { name: 'ADHD' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Autism' })).not.toBeChecked()
    expect(within(dialog).getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('saves the changes to that child, closes, and updates the list', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    const dialog = await openEdit(user, 'Leo')

    const name = within(dialog).getByLabelText("Child's name")
    await user.clear(name)
    await user.type(name, 'Leonardo')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.callsTo('PUT', '/children/2')[0].body).toEqual({
      name: 'Leonardo',
      date_of_birth: '2022-08-09',
      condition_ids: [],
    })
    expect(await screen.findByRole('heading', { level: 3, name: /^Leonardo/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: /^Leo$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Child profile updated.')
  })

  it('keeps the same child selected after an edit', async () => {
    const user = userEvent.setup()
    setup()
    const dialog = await openEdit(user, 'Leo')

    await user.type(within(dialog).getByLabelText("Child's name"), 'x')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Mia was selected before; editing Leo does not change that.
    expect(within(childCard('Mia')).getByText('Selected')).toBeInTheDocument()
  })

  it('does not save an empty name and keeps the form open', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    const dialog = await openEdit(user, 'Mia')

    await user.clear(within(dialog).getByLabelText("Child's name"))
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    expect(within(dialog).getByText("Please enter your child's name.")).toBeInTheDocument()
    expect(api.callsTo('PUT', '/children/1')).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows an error and keeps the edits when saving fails', async () => {
    const user = userEvent.setup()
    setup({ routes: { 'PUT /children/2': { status: 500, body: { message: 'Could not save.' } } } })
    const dialog = await openEdit(user, 'Leo')

    await user.type(within(dialog).getByLabelText("Child's name"), 'x')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not save.')
    expect(within(dialog).getByLabelText("Child's name")).toHaveValue('Leox')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens the add form empty after an edit was cancelled (no leftover values)', async () => {
    const user = userEvent.setup()
    setup()
    const dialog = await openEdit(user, 'Mia')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const addDialog = await openAdd(user)

    expect(within(addDialog).getByLabelText("Child's name")).toHaveValue('')
  })
})

describe('My Children: deleting a child (mocked, nothing real is touched)', () => {
  it('asks for confirmation, then removes the child from the list', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    await screen.findByRole('heading', { level: 3, name: /^Leo/ })

    await user.click(within(childCard('Leo')).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this child profile?' })
    expect(confirm).toHaveTextContent("Leo's profile will be removed")
    expect(api.callsTo('DELETE', '/children/2')).toHaveLength(0)

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('heading', { level: 3, name: /^Leo/ })).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Child profile deleted.')
  })

  it('does nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    await screen.findByRole('heading', { level: 3, name: /^Leo/ })

    await user.click(within(childCard('Leo')).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this child profile?' })
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.callsTo('DELETE', '/children/2')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 3, name: /^Leo/ })).toBeInTheDocument()
  })

  it('explains why a child with saved progress cannot be deleted, and keeps them', async () => {
    const user = userEvent.setup()
    setup({
      routes: { 'DELETE /children/2': { status: 409, body: { code: 'child_has_progress', message: 'no' } } },
    })
    await screen.findByRole('heading', { level: 3, name: /^Leo/ })

    await user.click(within(childCard('Leo')).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this child profile?' })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Leo has saved activity progress, so the profile cannot be deleted.')
    expect(screen.getByRole('heading', { level: 3, name: /^Leo/ })).toBeInTheDocument()
  })
})
