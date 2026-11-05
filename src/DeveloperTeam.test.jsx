import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Contact from './Contact.jsx'
import { makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const savedTeam = {
  name: 'TheraPlay Development Team',
  description: 'The team that builds TheraPlay.',
  emails: ['team@example.com', 'support@example.com'],
  phones: ['+63 900 123 4567', '+63 917 555 0100'],
  is_sample: false,
}

// Renders the Contact Us page for an admin, a parent, or a guest (user: null).
async function setup({ user = makeUser('admin'), routes = {} } = {}) {
  if (user) signIn()
  const api = mockApi({
    'GET /user': user ? { body: user } : { status: 401, body: {} },
    'GET /children': { body: { data: [] } },
    'GET /contacts': { body: { data: [] } },
    'GET /developer-team': { body: { data: savedTeam } },
    ...routes,
  })

  renderWithProviders(<Contact />, { route: '/contact' })
  await settle(api)

  return api
}

const editButton = () => screen.queryByRole('button', { name: 'Edit Developer Team' })

describe('Developer Team card: who can edit it', () => {
  it('shows the Edit Developer Team button to an admin', async () => {
    await setup()

    expect(await screen.findByRole('button', { name: 'Edit Developer Team' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Development Team' })).toBeInTheDocument()
  })

  it('does not show it to a parent (the card itself is still shown)', async () => {
    await setup({ user: makeUser('parent') })

    expect(await screen.findByText('TheraPlay Development Team')).toBeInTheDocument()
    expect(editButton()).not.toBeInTheDocument()
  })

  it('does not show it to a guest', async () => {
    await setup({ user: null })

    expect(await screen.findByText('TheraPlay Development Team')).toBeInTheDocument()
    expect(editButton()).not.toBeInTheDocument()
  })

  it('does not show it when an admin\'s login is no longer valid (the page then looks like a guest\'s)', async () => {
    // The saved login is rejected (for example it has expired): the user is logged out.
    signIn()
    await setup({ user: null })

    expect(await screen.findByText('TheraPlay Development Team')).toBeInTheDocument()
    expect(editButton()).not.toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
  })

  it('shows the button once the team details have loaded, and keeps the card when the load fails', async () => {
    await setup({ routes: { 'GET /developer-team': { status: 500, body: {} } } })

    expect(await screen.findByText('Unable to load the developer team details.')).toBeInTheDocument()
    expect(editButton()).not.toBeInTheDocument()
  })
})

describe('Developer Team card: editing', () => {
  const openEditor = async (user) => {
    await user.click(await screen.findByRole('button', { name: 'Edit Developer Team' }))
    return screen.findByRole('dialog', { name: 'Edit Developer Team' })
  }

  it('opens the existing edit modal with the current details filled in, including several emails and phones', async () => {
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

  it('saves the changes (all emails and phones), closes, and shows the new details on the card', async () => {
    const user = userEvent.setup()
    const updated = { ...savedTeam, name: 'Dev Team', emails: [...savedTeam.emails, 'press@example.com'] }
    const api = await setup({ routes: { 'PUT /admin/developer-team': { body: { data: updated } } } })
    const dialog = await openEditor(user)

    const name = within(dialog).getByLabelText('Team name')
    await user.clear(name)
    await user.type(name, 'Dev Team')
    await user.click(within(dialog).getByRole('button', { name: 'Add another email' }))
    await user.type(within(dialog).getByLabelText('Email addresses 3', { exact: true }), 'press@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.callsTo('PUT', '/admin/developer-team')[0].body).toEqual({
      name: 'Dev Team',
      description: 'The team that builds TheraPlay.',
      emails: ['team@example.com', 'support@example.com', 'press@example.com'],
      phones: ['+63 900 123 4567', '+63 917 555 0100'],
    })
    expect(await screen.findByText('Dev Team')).toBeInTheDocument()
    expect(screen.getByText(/press@example\.com/)).toBeInTheDocument()
  })

  it('does not save invalid details, and keeps the form open', async () => {
    const user = userEvent.setup()
    const api = await setup()
    const dialog = await openEditor(user)

    await user.clear(within(dialog).getByLabelText('Email addresses 2', { exact: true }))
    await user.type(within(dialog).getByLabelText('Email addresses 2', { exact: true }), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(api.callsTo('PUT', '/admin/developer-team')).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the server\'s refusal and keeps what was typed when saving fails', async () => {
    const user = userEvent.setup()
    await setup({ routes: { 'PUT /admin/developer-team': { status: 403, body: { message: 'Forbidden' } } } })
    const dialog = await openEditor(user)

    await user.type(within(dialog).getByLabelText('Team name'), ' X')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    expect(await within(dialog).findByText('You do not have permission to edit this.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Team name')).toHaveValue('TheraPlay Development Team X')
  })

  it('closes with Escape or Cancel and changes nothing', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await openEditor(user)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.callsTo('PUT', '/admin/developer-team')).toHaveLength(0)
    expect(screen.getByText('TheraPlay Development Team')).toBeInTheDocument()
  })
})
