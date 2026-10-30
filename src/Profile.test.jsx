import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Profile from './Profile.jsx'
import { makeUser, mockApi, renderWithProviders, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

// Shows where the app went (and the message it passed) after login redirects.
function LoginProbe() {
  const { state } = useLocation()
  return <p data-testid="login-page">Login page: {state?.message}</p>
}

const account = (overrides = {}) => ({
  ...makeUser('parent'),
  contact_number: '0917 000 0000',
  email_verified: true,
  pending_email: null,
  email_verification_required: false,
  ...overrides,
})

async function setup({ user = account(), routes = {} } = {}) {
  signIn()
  const api = mockApi({
    'GET /user': () => ({ body: user }),
    'GET /children': { body: { data: [] } },
    'GET /conditions': { body: { data: [] } },
    ...routes,
  })

  renderWithProviders(
    <Routes>
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<LoginProbe />} />
    </Routes>,
    { route: '/profile' }
  )
  await settle(api)

  return api
}

const startEditing = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Edit' }))
}

describe('Profile: email verification status', () => {
  it('shows a verified address as verified, with nothing to do', async () => {
    await setup()

    expect(await screen.findByText(/Your email address is verified/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resend verification email' })).not.toBeInTheDocument()
  })

  it('tells the person when the address is not verified and offers to resend', async () => {
    await setup({ user: account({ email_verified: false }) })

    expect(await screen.findByText(/Your email address is not verified/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument()
  })

  it('resending says "sent" only when the server really delivered it', async () => {
    const user = userEvent.setup()
    const api = await setup({
      user: account({ email_verified: false }),
      routes: { 'POST /email/verification-notification': { body: { message: 'A verification email has been sent.', delivered: true } } },
    })

    await user.click(await screen.findByRole('button', { name: 'Resend verification email' }))

    expect(await screen.findByText('A verification email has been sent.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/verification-notification')).toHaveLength(1)
  })

  it('resending shows the server\'s warning when email delivery is not set up', async () => {
    const user = userEvent.setup()
    await setup({
      user: account({ email_verified: false }),
      routes: { 'POST /email/verification-notification': { body: { message: 'Email delivery is not set up on this server yet.', delivered: false } } },
    })

    await user.click(await screen.findByRole('button', { name: 'Resend verification email' }))

    const note = await screen.findByText('Email delivery is not set up on this server yet.')
    expect(note).toHaveAttribute('role', 'status')
    expect(note.className).toMatch(/b26a00/)
  })

  it('resending shows a wait message when rate limited, and an error when it fails', async () => {
    const user = userEvent.setup()
    let n = 0
    await setup({
      user: account({ email_verified: false }),
      routes: {
        'POST /email/verification-notification': () => {
          n += 1
          return n === 1 ? { status: 429, body: {} } : { status: 503, body: { message: 'We could not send the verification email right now.' } }
        },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Resend verification email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait a minute')

    await user.click(screen.getByRole('button', { name: 'Resend verification email' }))
    expect(await screen.findByText('We could not send the verification email right now.')).toBeInTheDocument()
  })

  it('shows a pending new address and which address is still the account email', async () => {
    await setup({ user: account({ pending_email: 'new@example.com' }) })

    const status = await screen.findByTestId('email-status')
    expect(status).toHaveTextContent('Waiting for verification: new@example.com')
    expect(status).toHaveTextContent('parent@example.com')
    expect(within(status).getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument()
  })
})

describe('Profile: changing the email address', () => {
  it('asks for the current password only when the email is changed', async () => {
    const user = userEvent.setup()
    await setup()
    await startEditing(user)

    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()

    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'new@example.com')
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()

    // Typing the old address back removes the need.
    await user.clear(email)
    await user.type(email, 'PARENT@example.com')
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })

  it('does not send the change without the current password', async () => {
    const user = userEvent.setup()
    const api = await setup()
    await startEditing(user)
    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'x')
    await user.clear(screen.getByLabelText('Current password'))

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(api.callsTo('PUT', '/profile')).toHaveLength(0)
  })

  it('sends the password with the change and then shows the address as pending, not changed', async () => {
    const user = userEvent.setup()
    const api = await setup({
      routes: {
        'PUT /profile': {
          body: {
            message: 'Profile updated. We sent a verification link to new@example.com. Your email will change once you open it.',
            email_delivered: true,
            user: { ...account(), pending_email: 'new@example.com' },
          },
        },
      },
    })
    await startEditing(user)
    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText(/We sent a verification link to new@example.com/)).toBeInTheDocument()
    expect(api.callsTo('PUT', '/profile')[0].body).toMatchObject({
      email: 'new@example.com',
      current_password: 'my-password',
    })
    // Back in view mode: the account email is still the old one, with a pending note.
    expect(screen.getByTestId('email-status')).toHaveTextContent('Waiting for verification: new@example.com')
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })

  it('does not send a password when only other details change', async () => {
    const user = userEvent.setup()
    const api = await setup({
      routes: { 'PUT /profile': { body: { message: 'Profile updated successfully.', email_delivered: null, user: account() } } },
    })
    await startEditing(user)
    const phone = screen.getByLabelText('Phone Number')
    await user.clear(phone)
    await user.type(phone, '0999 111 2222')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(api.callsTo('PUT', '/profile')[0].body).not.toHaveProperty('current_password')
  })

  it('shows the server\'s message for a wrong password and keeps the form open', async () => {
    const user = userEvent.setup()
    await setup({
      routes: { 'PUT /profile': { status: 422, body: { errors: { current_password: ['The password is incorrect.'] } } } },
    })
    await startEditing(user)
    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The password is incorrect.')
    expect(screen.getByLabelText('Email Address')).toHaveValue('new@example.com')
  })

  it('shows the server\'s message for an address that is already in use', async () => {
    const user = userEvent.setup()
    await setup({
      routes: { 'PUT /profile': { status: 422, body: { errors: { email: ['This email address is already in use.'] } } } },
    })
    await startEditing(user)
    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'taken@example.com')
    await user.type(screen.getByLabelText('Current password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This email address is already in use.')
  })

  it('warns (not "success") when the verification email could not be delivered', async () => {
    const user = userEvent.setup()
    await setup({
      routes: {
        'PUT /profile': {
          body: {
            message: 'Profile updated. Your new email address is waiting for verification, but email delivery is not set up on this server yet, so no email was delivered.',
            email_delivered: false,
            user: { ...account(), pending_email: 'new@example.com' },
          },
        },
      },
    })
    await startEditing(user)
    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    const note = await screen.findByText(/no email was delivered/)
    expect(note.className).toMatch(/b26a00/)
  })

  it('Cancel forgets the typed password and the unsaved address', async () => {
    const user = userEvent.setup()
    await setup()
    await startEditing(user)
    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'secret')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await startEditing(user)

    expect(screen.getByLabelText('Email Address')).toHaveValue('parent@example.com')
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })
})

describe('Profile: deleting the account', () => {
  const openDialog = async (user) => {
    await user.click(await screen.findByRole('button', { name: 'Delete my account' }))
    return screen.findByRole('dialog', { name: 'Delete your account?' })
  }

  it('is offered to parents with a clear warning, and not to admins', async () => {
    const user = userEvent.setup()
    await setup()
    const dialog = await openDialog(user)

    expect(dialog).toHaveTextContent('permanently deletes your account and cannot be undone')
    expect(dialog).toHaveTextContent('remove them first')
    expect(within(dialog).getByLabelText('Enter your password to confirm')).toHaveAttribute('type', 'password')
  })

  it('is not shown for an administrator account', async () => {
    await setup({ user: account({ role: 'admin' }) })

    await screen.findByRole('heading', { name: 'My Profile' })
    expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeInTheDocument()
  })

  it('does not ask the server anything without a password', async () => {
    const user = userEvent.setup()
    const api = await setup()
    const dialog = await openDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }))

    expect(within(dialog).getByText('Enter your password to confirm.')).toBeInTheDocument()
    expect(api.callsTo('DELETE', '/profile')).toHaveLength(0)
  })

  it('shows a wrong password on the field and keeps the account', async () => {
    const user = userEvent.setup()
    await setup({ routes: { 'DELETE /profile': { status: 422, body: { errors: { password: ['The password is incorrect.'] } } } } })
    const dialog = await openDialog(user)

    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'wrong')
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }))

    expect(await within(dialog).findByText('The password is incorrect.')).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('explains why an account with child profiles cannot be deleted, and keeps everything', async () => {
    const user = userEvent.setup()
    await setup({
      routes: { 'DELETE /profile': { status: 409, body: { code: 'account_has_children', message: 'Your account still has child profiles, so it cannot be deleted. Remove your child profiles first.' } } },
    })
    const dialog = await openDialog(user)

    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Remove your child profiles first.')
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('deletes with the password, forgets the login and goes to the login page with a message', async () => {
    const user = userEvent.setup()
    localStorage.setItem('theraplay_selected_child:1', '3')
    const api = await setup({ routes: { 'DELETE /profile': { body: { message: 'Your account has been deleted.' } } } })
    const dialog = await openDialog(user)

    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByTestId('login-page')).toHaveTextContent('Your account has been deleted.')
    expect(api.callsTo('DELETE', '/profile')[0].body).toEqual({ password: 'password123' })
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(localStorage.getItem('theraplay_selected_child:1')).toBeNull()
  })

  it('stays open and locked while the request runs', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    await setup({ routes: { 'DELETE /profile': () => gate.then(() => ({ body: { message: 'ok' } })) } })
    const dialog = await openDialog(user)

    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }))

    expect(await within(dialog).findByRole('button', { name: 'Deleting...' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    release()
    expect(await screen.findByTestId('login-page')).toBeInTheDocument()
  })

  it('can be cancelled without any request', async () => {
    const user = userEvent.setup()
    const api = await setup()
    const dialog = await openDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.callsTo('DELETE', '/profile')).toHaveLength(0)
  })

  it('goes to login when the session has expired meanwhile (401)', async () => {
    const user = userEvent.setup()
    await setup({ routes: { 'DELETE /profile': { status: 401, body: {} } } })
    const dialog = await openDialog(user)

    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByTestId('login-page')).toHaveTextContent('Please log in to continue.')
  })
})
