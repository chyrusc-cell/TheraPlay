import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ManageAccounts from './ManageAccounts.jsx'
import { makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const me = makeUser('admin') // id 99

const row = (id, name, email, role = 'parent', overrides = {}) => ({
  id,
  name,
  email,
  role,
  created_at: '2026-10-01T00:00:00Z',
  email_verified: true,
  email_verified_at: '2026-10-02T00:00:00Z',
  children_count: 0,
  has_child_profile: false,
  ...overrides,
})

const base = () => [
  row(99, 'Ada Admin', 'admin@example.com', 'admin'),
  row(2, 'Pat Parent', 'pat@example.com', 'parent'),
  row(3, 'Una Unverified', 'una@example.com', 'parent', { email_verified: false, email_verified_at: null }),
  row(4, 'Kim Kids', 'kim@example.com', 'parent', { children_count: 2, has_child_profile: true }),
  row(5, 'Other Admin', 'other@example.com', 'admin'),
]

async function setup({ accounts = base(), routes = {} } = {}) {
  signIn()
  const db = { accounts }
  const api = mockApi({
    'GET /user': { body: me },
    'GET /admin/users': () => ({ body: { data: db.accounts } }),
    ...routes,
  })

  renderWithProviders(<ManageAccounts />, { route: '/manage-accounts' })
  await settle(api)

  return { api, db }
}

// The two sections of the page (each a labelled region with its own table and search).
const parentSection = () => screen.getByRole('region', { name: 'Parent Accounts' })
const adminSection = () => screen.getByRole('region', { name: 'Administrator Accounts' })

// The table row of an account (rows only, so a notice mentioning the name is not matched).
const rowFor = (name) =>
  screen.getAllByRole('row').find((tr) => tr.querySelector('td') && tr.textContent.includes(name))
const openCreate = async (user) => {
  await user.click(await screen.findByRole('button', { name: '+ Create Administrator' }))
  return screen.findByRole('dialog', { name: 'Create Administrator' })
}
const fillCreate = async (user, dialog, values = {}) => {
  const v = { name: 'New Admin', email: 'new@example.com', password: 'password123', confirm: 'password123', ...values }
  await user.type(within(dialog).getByLabelText('Name'), v.name)
  await user.type(within(dialog).getByLabelText('Email'), v.email)
  await user.type(within(dialog).getByLabelText(/^Password/), v.password)
  await user.type(within(dialog).getByLabelText('Confirm Password'), v.confirm)
}

describe('Manage Accounts: listing', () => {
  it('shows parents and administrators in two separate tables, with email status and a "you" marker', async () => {
    await setup()

    expect(await screen.findByText('Pat Parent')).toBeInTheDocument()

    // Parent Accounts: parents only. Administrator Accounts: admins only.
    const parents = within(parentSection())
    const admins = within(adminSection())
    for (const name of ['Pat Parent', 'Una Unverified', 'Kim Kids']) expect(parents.getByText(name)).toBeInTheDocument()
    for (const name of ['Ada Admin', 'Other Admin']) expect(admins.getByText(name)).toBeInTheDocument()
    expect(parents.queryByText('Ada Admin')).not.toBeInTheDocument()
    expect(parents.queryByText('Other Admin')).not.toBeInTheDocument()
    expect(admins.queryByText('Pat Parent')).not.toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: 'Parent Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Administrator Accounts' })).toBeInTheDocument()

    // Email verification status stays visible for parents (and admins).
    expect(within(rowFor('Pat Parent')).getByText('Verified')).toBeInTheDocument()
    expect(within(rowFor('Una Unverified')).getByText('Not verified')).toBeInTheDocument()
    expect(parents.getByRole('columnheader', { name: 'Email status' })).toBeInTheDocument()
    expect(within(rowFor('Ada Admin')).getByText('you')).toBeInTheDocument()
    // The child-profile indicator is no longer shown (the deletion safeguard is
    // enforced by the server; see the 409 test below).
    expect(screen.queryByText(/child profile/i)).not.toBeInTheDocument()
    expect(within(rowFor('Kim Kids')).getByText(/Joined/)).toBeInTheDocument()
    expect(within(parentSection()).getByRole('status')).toHaveTextContent('Showing 3 of 3 parent accounts')
    expect(within(adminSection()).getByRole('status')).toHaveTextContent('Showing 2 of 2 administrator accounts')
  })

  it('never shows passwords, tokens or hashes', async () => {
    await setup()
    await screen.findByText('Pat Parent')

    const text = document.body.textContent
    for (const secret of ['password', '$2y$', 'token', 'remember']) {
      expect(text.toLowerCase()).not.toContain(secret)
    }
  })

  it('shows a loading skeleton, then the accounts', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    signIn()
    mockApi({
      'GET /user': { body: me },
      'GET /admin/users': () => gate.then(() => ({ body: { data: base() } })),
    })
    renderWithProviders(<ManageAccounts />, { route: '/manage-accounts' })

    expect(await screen.findByText('Loading parent accounts...')).toBeInTheDocument()
    expect(screen.getByText('Loading administrator accounts...')).toBeInTheDocument()
    expect(screen.queryByText('Pat Parent')).not.toBeInTheDocument()

    release()
    expect(await screen.findByText('Pat Parent')).toBeInTheDocument()
  })

  it('says so when there are no accounts', async () => {
    await setup({ accounts: [] })

    expect(await screen.findByText('No parent accounts found.')).toBeInTheDocument()
    expect(screen.getByText('No administrator accounts found.')).toBeInTheDocument()
  })

  it('shows an error with a retry when the list cannot be loaded', async () => {
    const user = userEvent.setup()
    let failing = true
    const { api } = await setup({
      routes: { 'GET /admin/users': () => (failing ? { status: 500, body: {} } : { body: { data: base() } }) },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load accounts.')

    failing = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Pat Parent')).toBeInTheDocument()
    expect(api.callsTo('GET', '/admin/users').length).toBeGreaterThanOrEqual(2)
  })

  it('explains a permission problem (403)', async () => {
    await setup({ routes: { 'GET /admin/users': { status: 403, body: {} } } })

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to manage accounts.')
  })
})

describe('Manage Accounts: two independent searches', () => {
  it('has a dedicated search field in each table and no role or email-status filter at all', async () => {
    await setup()
    await screen.findByText('Pat Parent')

    expect(screen.getByLabelText('Search parent accounts')).toBeInTheDocument()
    expect(screen.getByLabelText('Search administrator accounts')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search accounts')).not.toBeInTheDocument()

    // The old combined filters are gone: no role select, no email-status select, no select at all.
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Email status')).not.toBeInTheDocument()
    expect(screen.queryByText('All roles')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('searches the parent table by name or email without touching the administrator table', async () => {
    const user = userEvent.setup()
    await setup()
    await screen.findByText('Pat Parent')

    await user.type(screen.getByLabelText('Search parent accounts'), 'KIM@')

    const parents = within(parentSection())
    expect(parents.getByText('Kim Kids')).toBeInTheDocument()
    expect(parents.queryByText('Pat Parent')).not.toBeInTheDocument()
    expect(parents.getByRole('status')).toHaveTextContent('Showing 1 of 3 parent accounts')

    // The administrator table is exactly as before.
    const admins = within(adminSection())
    expect(admins.getByText('Ada Admin')).toBeInTheDocument()
    expect(admins.getByText('Other Admin')).toBeInTheDocument()
    expect(admins.getByRole('status')).toHaveTextContent('Showing 2 of 2 administrator accounts')
    expect(screen.getByLabelText('Search administrator accounts')).toHaveValue('')
  })

  it('searches the administrator table without touching the parent table', async () => {
    const user = userEvent.setup()
    await setup()
    await screen.findByText('Pat Parent')

    await user.type(screen.getByLabelText('Search administrator accounts'), 'other@')

    const admins = within(adminSection())
    expect(admins.getByText('Other Admin')).toBeInTheDocument()
    expect(admins.queryByText('Ada Admin')).not.toBeInTheDocument()
    expect(admins.getByRole('status')).toHaveTextContent('Showing 1 of 2 administrator accounts')

    const parents = within(parentSection())
    for (const name of ['Pat Parent', 'Una Unverified', 'Kim Kids']) expect(parents.getByText(name)).toBeInTheDocument()
    expect(screen.getByLabelText('Search parent accounts')).toHaveValue('')
  })

  it('a name only searches its own table (an admin name typed in the parent search finds nothing)', async () => {
    const user = userEvent.setup()
    await setup()
    await screen.findByText('Pat Parent')

    await user.type(screen.getByLabelText('Search parent accounts'), 'Ada')

    expect(within(parentSection()).getByText(/No parent accounts match your search/)).toBeInTheDocument()
    expect(within(adminSection()).getByText('Ada Admin')).toBeInTheDocument()
  })

  it('explains an empty result and "Clear search" restores only that table', async () => {
    const user = userEvent.setup()
    await setup()
    await screen.findByText('Pat Parent')

    await user.type(screen.getByLabelText('Search administrator accounts'), 'nobody-here')
    await user.type(screen.getByLabelText('Search parent accounts'), 'pat')
    expect(within(adminSection()).getByText(/No administrator accounts match your search/)).toBeInTheDocument()

    await user.click(within(adminSection()).getByRole('button', { name: 'Clear search' }))

    expect(within(adminSection()).getByText('Ada Admin')).toBeInTheDocument()
    expect(screen.getByLabelText('Search administrator accounts')).toHaveValue('')
    // The parent search was left alone.
    expect(screen.getByLabelText('Search parent accounts')).toHaveValue('pat')
    expect(within(parentSection()).queryByText('Kim Kids')).not.toBeInTheDocument()
  })

  it('searches without asking the server again', async () => {
    const user = userEvent.setup()
    const { api } = await setup()
    await screen.findByText('Pat Parent')
    const before = api.calls.length

    await user.type(screen.getByLabelText('Search parent accounts'), 'pat')
    await user.type(screen.getByLabelText('Search administrator accounts'), 'ada')

    expect(api.calls).toHaveLength(before)
  })

  it('has no pagination controls (every account of a role is listed)', async () => {
    await setup()
    await screen.findByText('Pat Parent')

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next page|previous page/i })).not.toBeInTheDocument()
  })
})

describe('Manage Accounts: creating an administrator', () => {
  it('opens a form with no role choice and says the account will be an administrator', async () => {
    const user = userEvent.setup()
    await setup()
    const dialog = await openCreate(user)

    expect(within(dialog).queryByLabelText('Role')).not.toBeInTheDocument()
    expect(within(dialog).getByText(/This account will be an administrator/)).toBeInTheDocument()
  })

  it('checks the fields before sending anything', async () => {
    const user = userEvent.setup()
    const { api } = await setup()
    const dialog = await openCreate(user)

    // browser validity checks are bypassed on purpose: the app's own checks run
    dialog.querySelector('form').noValidate = true
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))
    expect(within(dialog).getByText('Enter a name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(within(dialog).getByText('The password must be at least 8 characters.')).toBeInTheDocument()

    await fillCreate(user, dialog, { name: 'N', email: 'a@b.co', password: 'short', confirm: 'short' })
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))
    expect(within(dialog).getAllByText('The password must be at least 8 characters.').length).toBeGreaterThan(0)
    expect(api.callsTo('POST', '/admin/users')).toHaveLength(0)
  })

  it('rejects a password confirmation that does not match', async () => {
    const user = userEvent.setup()
    const { api } = await setup()
    const dialog = await openCreate(user)

    await fillCreate(user, dialog, { confirm: 'different-pass' })
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))

    expect(within(dialog).getByText('The password confirmation does not match.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/admin/users')).toHaveLength(0)
  })

  it('creates the account without sending a role, closes, refreshes the list and confirms (email delivered)', async () => {
    const user = userEvent.setup()
    const created = row(10, 'New Admin', 'new@example.com', 'admin', { email_verified: false, email_verified_at: null })
    const { api, db } = await setup({
      routes: {
        'POST /admin/users': () => {
          db.accounts = [...db.accounts, created]
          return { status: 201, body: { message: 'Administrator account created.', email_verification: { sent: true, delivery_available: true }, data: created } }
        },
      },
    })
    const dialog = await openCreate(user)

    await fillCreate(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.callsTo('POST', '/admin/users')[0].body).toEqual({
      name: 'New Admin',
      email: 'new@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    })
    expect(await screen.findByText(/A verification email was sent to new@example.com/)).toBeInTheDocument()
    expect(within(rowFor('New Admin')).getByText('Not verified')).toBeInTheDocument()
  })

  it('does not claim an email was sent when delivery is not set up', async () => {
    const user = userEvent.setup()
    await setup({
      routes: { 'POST /admin/users': { status: 201, body: { email_verification: { sent: true, delivery_available: false }, data: row(10, 'N', 'n@example.com', 'admin') } } },
    })
    const dialog = await openCreate(user)

    await fillCreate(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))

    expect(await screen.findByText(/no verification email was delivered/)).toBeInTheDocument()
    expect(screen.queryByText(/A verification email was sent/)).not.toBeInTheDocument()
  })

  it('shows a duplicate email on the field and keeps the form open with the typed values', async () => {
    const user = userEvent.setup()
    await setup({ routes: { 'POST /admin/users': { status: 422, body: { errors: { email: ['The email has already been taken.'] } } } } })
    const dialog = await openCreate(user)

    await fillCreate(user, dialog, { email: 'pat@example.com' })
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))

    expect(await within(dialog).findByText('The email has already been taken.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Email')).toHaveValue('pat@example.com')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a connection failure and keeps what was typed', async () => {
    const user = userEvent.setup()
    await setup({ routes: { 'POST /admin/users': () => { throw new TypeError('Failed to fetch') } } })
    const dialog = await openCreate(user)

    await fillCreate(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Create Administrator' }))

    expect(await within(dialog).findByText(/Failed to fetch|Unable to connect/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Name')).toHaveValue('New Admin')
  })
})

describe('Manage Accounts: editing', () => {
  it('edits only the name (the email is read-only), never sends a role, and has no role control', async () => {
    const user = userEvent.setup()
    const { api } = await setup({ routes: { 'PATCH /admin/users/2': { body: { data: row(2, 'Pat Renamed', 'pat@example.com') } } } })
    await screen.findByText('Pat Parent')

    await user.click(screen.getByRole('button', { name: 'Edit Pat Parent' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Account' })
    expect(within(dialog).queryByLabelText('Role')).not.toBeInTheDocument()

    const emailField = within(dialog).getByLabelText('Email')
    expect(emailField).toHaveAttribute('readonly')
    expect(emailField).toBeDisabled()
    expect(emailField.className).toContain('bg-black/10')
    expect(emailField).toHaveValue('pat@example.com')
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Pat Renamed')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.callsTo('PATCH', '/admin/users/2')[0].body).toEqual({ name: 'Pat Renamed' })
    expect(screen.getByText('Account updated.')).toBeInTheDocument()
  })
})

describe('Manage Accounts: promoting and demoting', () => {
  it('asks for confirmation first, and cancelling changes nothing', async () => {
    const user = userEvent.setup()
    const { api } = await setup()
    await screen.findByText('Pat Parent')

    await user.click(screen.getByRole('button', { name: 'Make admin: Pat Parent' }))
    expect(screen.getByText(/Make this account an admin\? They will be signed out\./)).toBeInTheDocument()
    expect(api.callsTo('POST', '/admin/users/2/promote')).toHaveLength(0)

    await user.click(within(rowFor('Pat Parent')).getByRole('button', { name: 'Cancel' }))

    expect(api.callsTo('POST', '/admin/users/2/promote')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Make admin: Pat Parent' })).toBeInTheDocument()
  })

  it('promotes through the dedicated endpoint (no role is sent) and updates the list', async () => {
    const user = userEvent.setup()
    const { api, db } = await setup({
      routes: {
        'POST /admin/users/2/promote': () => {
          db.accounts = db.accounts.map((a) => (a.id === 2 ? { ...a, role: 'admin' } : a))
          return { body: { message: 'Account promoted to administrator.', data: row(2, 'Pat Parent', 'pat@example.com', 'admin') } }
        },
      },
    })
    await screen.findByText('Pat Parent')

    await user.click(screen.getByRole('button', { name: 'Make admin: Pat Parent' }))
    await user.click(within(rowFor('Pat Parent')).getByRole('button', { name: 'Yes, continue' }))

    expect(await screen.findByText('"Pat Parent" is now an admin.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/admin/users/2/promote')[0].body).toBeUndefined()
    await waitFor(() => expect(within(adminSection()).getByText('Pat Parent')).toBeInTheDocument())
    expect(within(parentSection()).queryByText('Pat Parent')).not.toBeInTheDocument()
    expect(within(rowFor('Pat Parent')).getByRole('button', { name: 'Make parent: Pat Parent' })).toBeInTheDocument()
  })

  it('shows the server\'s reason when a promotion conflicts, and keeps the list as it was', async () => {
    const user = userEvent.setup()
    await setup({ routes: { 'POST /admin/users/2/promote': { status: 409, body: { code: 'already_admin', message: 'This account is already an administrator.' } } } })
    await screen.findByText('Pat Parent')

    await user.click(screen.getByRole('button', { name: 'Make admin: Pat Parent' }))
    await user.click(within(rowFor('Pat Parent')).getByRole('button', { name: 'Yes, continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This account is already an administrator.')
    // Still in the parent table.
    expect(within(parentSection()).getByText('Pat Parent')).toBeInTheDocument()
    expect(within(adminSection()).queryByText('Pat Parent')).not.toBeInTheDocument()
  })

  it('demotes another administrator through the dedicated endpoint', async () => {
    const user = userEvent.setup()
    const { api } = await setup({ routes: { 'POST /admin/users/5/demote': { body: { data: row(5, 'Other Admin', 'other@example.com', 'parent') } } } })
    await screen.findByText('Other Admin')

    await user.click(screen.getByRole('button', { name: 'Make parent: Other Admin' }))
    await user.click(within(rowFor('Other Admin')).getByRole('button', { name: 'Yes, continue' }))

    expect(await screen.findByText('"Other Admin" is now a parent.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/admin/users/5/demote')).toHaveLength(1)
  })

  it('does not let an administrator remove their own role', async () => {
    await setup()
    await screen.findByText('Ada Admin')

    expect(screen.getByRole('button', { name: 'Make parent: Ada Admin' })).toBeDisabled()
  })
})

describe('Manage Accounts: deleting', () => {
  it('asks for confirmation, then deletes and refreshes', async () => {
    const user = userEvent.setup()
    const { api, db } = await setup({
      routes: {
        'DELETE /admin/users/2': () => {
          db.accounts = db.accounts.filter((a) => a.id !== 2)
          return { body: { message: 'Account deleted.' } }
        },
      },
    })
    await screen.findByText('Pat Parent')

    await user.click(screen.getByRole('button', { name: 'Delete Pat Parent' }))
    expect(screen.getByText('Delete this account?')).toBeInTheDocument()
    expect(api.callsTo('DELETE', '/admin/users/2')).toHaveLength(0)

    await user.click(within(rowFor('Pat Parent')).getByRole('button', { name: 'Yes, continue' }))

    expect(await screen.findByText('"Pat Parent" was deleted.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Pat Parent')).not.toBeInTheDocument())
  })

  it('cancelling the confirmation deletes nothing', async () => {
    const user = userEvent.setup()
    const { api } = await setup()
    await screen.findByText('Pat Parent')

    await user.click(screen.getByRole('button', { name: 'Delete Pat Parent' }))
    await user.click(within(rowFor('Pat Parent')).getByRole('button', { name: 'Cancel' }))

    expect(api.callsTo('DELETE', '/admin/users/2')).toHaveLength(0)
    expect(screen.getByText('Pat Parent')).toBeInTheDocument()
  })

  it('does not offer to delete your own account', async () => {
    await setup()
    await screen.findByText('Ada Admin')

    expect(screen.getByRole('button', { name: 'Delete Ada Admin' })).toBeDisabled()
  })

  it('explains why an account with child profiles cannot be deleted and keeps it listed', async () => {
    const user = userEvent.setup()
    await setup({
      routes: { 'DELETE /admin/users/4': { status: 409, body: { code: 'has_child_profile', message: 'This account has child profiles with saved progress and cannot be deleted.' } } },
    })
    await screen.findByText('Kim Kids')

    await user.click(screen.getByRole('button', { name: 'Delete Kim Kids' }))
    await user.click(within(rowFor('Kim Kids')).getByRole('button', { name: 'Yes, continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('cannot be deleted')
    expect(screen.getByText('Kim Kids')).toBeInTheDocument()
  })

  it('refreshes the list when the account was already gone (404)', async () => {
    const user = userEvent.setup()
    const { api } = await setup({ routes: { 'DELETE /admin/users/3': { status: 404, body: { message: 'Not found' } } } })
    await screen.findByText('Una Unverified')
    const before = api.callsTo('GET', '/admin/users').length

    await user.click(screen.getByRole('button', { name: 'Delete Una Unverified' }))
    await user.click(within(rowFor('Una Unverified')).getByRole('button', { name: 'Yes, continue' }))

    await waitFor(() => expect(api.callsTo('GET', '/admin/users').length).toBeGreaterThan(before))
  })
})

describe('Manage Accounts: layered glass tables', () => {
  it('draws each table as a glass-stack container (shadow layer behind every glass surface) with its own rounded clipping wrapper', async () => {
    await setup()
    await screen.findByText('Pat Parent')

    for (const section of [parentSection(), adminSection()]) {
      const table = within(section).getByRole('table')
      const clip = table.parentElement
      expect(clip).toHaveClass('overflow-hidden')
      expect(clip.parentElement).toHaveClass('glass-stack')
      // The glass container itself never clips, so its shadow is not cut off.
      expect(clip.parentElement).not.toHaveClass('overflow-hidden')
    }
  })

  it('keeps the page-level actions: Refresh and + Create Administrator', async () => {
    await setup()
    await screen.findByText('Pat Parent')

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Create Administrator' })).toBeInTheDocument()
  })
})
