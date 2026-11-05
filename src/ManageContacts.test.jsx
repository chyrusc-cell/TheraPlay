import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ManageContacts from './ManageContacts.jsx'
import { makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const team = {
  name: 'TheraPlay Development Team',
  description: 'The team that builds TheraPlay.',
  emails: ['team@example.com', 'support@example.com'],
  phones: ['+63 900 123 4567', '+63 917 555 0100'],
  is_sample: false,
}

const contact = { id: 1, name: 'Dr. Ana Reyes', title: 'Occupational Therapist', email: 'ana@example.com', phone: '0917 123 4567', description: 'Pediatric specialist.', photo_url: null }

async function setup(routes = {}) {
  signIn()
  const api = mockApi({
    'GET /user': { body: makeUser('admin') },
    'GET /admin/contacts': { body: { data: [contact] } },
    'GET /admin/developer-team': { body: { data: team } },
    ...routes,
  })

  renderWithProviders(<ManageContacts />, { route: '/manage-contacts' })
  await settle(api)

  return api
}

const headerButtons = () => {
  const heading = screen.getByRole('heading', { level: 1, name: 'Manage Contacts' })
  // The header row holds the heading block and the actions group.
  const row = heading.closest('div').parentElement
  return { row, buttons: within(row).getAllByRole('button').map((b) => b.textContent) }
}

describe('Manage Contacts: header', () => {
  it('has Refresh, Edit Development Team and + Add Contact in one row beside the heading, in that order', async () => {
    await setup()

    // (The order is the one the page has now; it was rearranged after the first version.)
    const { row, buttons } = headerButtons()
    expect(buttons).toEqual(['Refresh', 'Edit Development Team', '+ Add Contact'])
    // One row: the heading and the three buttons share the same header element.
    expect(within(row).getByRole('heading', { level: 1, name: 'Manage Contacts' })).toBeInTheDocument()
  })

  it('Refresh loads the contacts again', async () => {
    const user = userEvent.setup()
    const api = await setup()
    expect(api.callsTo('GET', '/admin/contacts')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => expect(api.callsTo('GET', '/admin/contacts')).toHaveLength(2))
  })

  it('+ Add Contact still opens the Add Contact form and saves a new contact', async () => {
    const user = userEvent.setup()
    const api = await setup({
      'POST /admin/contacts': ({ body }) => ({ status: 201, body: { data: { ...contact, id: 2, ...body }, message: 'ok' } }),
    })

    await user.click(screen.getByRole('button', { name: '+ Add Contact' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/^Name/), 'Dr. Ben Cruz')
    await user.type(within(dialog).getByLabelText(/^Title/), 'Speech Therapist')
    await user.type(within(dialog).getByLabelText(/^Email/), 'ben@example.com')
    await user.type(within(dialog).getByLabelText(/^Phone/), '0917 000 1111')
    await user.click(within(dialog).getByRole('button', { name: /Save|Add Contact/ }))

    await waitFor(() => expect(api.callsTo('POST', '/admin/contacts')).toHaveLength(1))
    expect(api.callsTo('POST', '/admin/contacts')[0].body).toMatchObject({
      name: 'Dr. Ben Cruz',
      title: 'Speech Therapist',
      email: 'ben@example.com',
      phone: '0917 000 1111',
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('Manage Contacts: Edit Development Team', () => {
  const openEditor = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Edit Development Team' }))
    return screen.findByRole('dialog', { name: 'Edit Development Team' })
  }

  it('opens the existing editor with the saved details filled in, including several emails and phones', async () => {
    const user = userEvent.setup()
    await setup()
    const dialog = await openEditor(user)

    expect(within(dialog).getByLabelText('Team name')).toHaveValue('TheraPlay Development Team')
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveValue('The team that builds TheraPlay.')
    expect(within(dialog).getByLabelText('Email addresses 1', { exact: true })).toHaveValue('team@example.com')
    expect(within(dialog).getByLabelText('Email addresses 2', { exact: true })).toHaveValue('support@example.com')
    expect(within(dialog).getByLabelText('Phone numbers 1', { exact: true })).toHaveValue('+63 900 123 4567')
    expect(within(dialog).getByLabelText('Phone numbers 2', { exact: true })).toHaveValue('+63 917 555 0100')
  })

  it('fetches the current saved details each time it opens (never a stale copy)', async () => {
    const user = userEvent.setup()
    let saved = team
    const api = await setup({ 'GET /admin/developer-team': () => ({ body: { data: saved } }) })

    await openEditor(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    saved = { ...team, name: 'Renamed elsewhere' }
    const dialog = await openEditor(user)

    expect(within(dialog).getByLabelText('Team name')).toHaveValue('Renamed elsewhere')
    expect(api.callsTo('GET', '/admin/developer-team')).toHaveLength(2)
  })

  it('saves edits to all emails and phones through the editor\'s own save, then closes and confirms', async () => {
    const user = userEvent.setup()
    const updated = { ...team, name: 'Dev Team', phones: [...team.phones, '+63 922 000 0000'] }
    const api = await setup({ 'PUT /admin/developer-team': { body: { data: updated } } })
    const dialog = await openEditor(user)

    const name = within(dialog).getByLabelText('Team name')
    await user.clear(name)
    await user.type(name, 'Dev Team')
    await user.click(within(dialog).getByRole('button', { name: 'Add another phone number' }))
    await user.type(within(dialog).getByLabelText('Phone numbers 3', { exact: true }), '+63 922 000 0000')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.callsTo('PUT', '/admin/developer-team')[0].body).toEqual({
      name: 'Dev Team',
      description: 'The team that builds TheraPlay.',
      emails: ['team@example.com', 'support@example.com'],
      phones: ['+63 900 123 4567', '+63 917 555 0100', '+63 922 000 0000'],
    })
    expect(screen.getByRole('status')).toHaveTextContent('Development Team details saved.')
  })

  it('keeps the form open and shows the message when saving fails', async () => {
    const user = userEvent.setup()
    await setup({ 'PUT /admin/developer-team': { status: 500, body: { message: 'The server had a problem.' } } })
    const dialog = await openEditor(user)

    await user.type(within(dialog).getByLabelText('Team name'), ' X')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    expect(await within(dialog).findByText('The server had a problem.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Team name')).toHaveValue('TheraPlay Development Team X')
  })

  it('does not open, and says why, when the details cannot be loaded', async () => {
    const user = userEvent.setup()
    await setup({ 'GET /admin/developer-team': { status: 500, body: {} } })

    await user.click(screen.getByRole('button', { name: 'Edit Development Team' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the Development Team details.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leaves the contacts list alone (the team is not a professional contact)', async () => {
    const user = userEvent.setup()
    const api = await setup({ 'PUT /admin/developer-team': { body: { data: team } } })
    const dialog = await openEditor(user)
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.calls.filter((c) => c.path.startsWith('/admin/contacts') && c.method !== 'GET')).toEqual([])
    expect(screen.getByText('Dr. Ana Reyes')).toBeInTheDocument()
  })
})
