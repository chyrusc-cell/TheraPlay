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

    const badge = await screen.findByTestId('email-verified-badge')
    expect(badge).toHaveTextContent('Verified')
    expect(badge.className).toContain('bg-success-bg')
    expect(badge.className).toContain('text-success-text')
    expect(badge.className).toContain('border-[#188038]')
    expect(screen.queryByText(/Your email address is verified/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resend verification email' })).not.toBeInTheDocument()
  })

  it('tells the person when the address is not verified and offers to resend', async () => {
    await setup({ user: account({ email_verified: false }) })

    expect(await screen.findByText(/Your email address is not verified/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeInTheDocument()
  })

  it('resending says "sent" only when the server really delivered it', async () => {
    const user = userEvent.setup()
    const api = await setup({
      user: account({ email_verified: false }),
      routes: { 'POST /email/code/resend': { body: { message: 'A verification email has been sent.', delivered: true } } },
    })

    await user.click(await screen.findByRole('button', { name: 'Resend code' }))

    expect(await screen.findByText('A verification email has been sent.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/code/resend')).toHaveLength(1)
  })

  it('resending shows the server\'s warning when email delivery is not set up', async () => {
    const user = userEvent.setup()
    await setup({
      user: account({ email_verified: false }),
      routes: { 'POST /email/code/resend': { body: { message: 'Email delivery is not set up on this server yet.', delivered: false } } },
    })

    await user.click(await screen.findByRole('button', { name: 'Resend code' }))

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
        'POST /email/code/resend': () => {
          n += 1
          return n === 1 ? { status: 429, body: {} } : { status: 503, body: { message: 'We could not send the verification email right now.' } }
        },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Resend code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait a minute')

    await user.click(screen.getByRole('button', { name: 'Resend code' }))
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

describe('Profile: the email address is fixed', () => {
  it('shows the address read-only, with no current-password field', async () => {
    const user = userEvent.setup()
    await setup()
    await startEditing(user)

    const email = screen.getByLabelText('Email Address')
    expect(email).toHaveAttribute('readonly')
    expect(email).toBeDisabled()
    // Visually darker than an editable field, with a not-allowed cursor.
    expect(email.className).toContain('bg-black/10')
    expect(email.className).toContain('cursor-not-allowed')
    expect(email).toHaveValue('parent@example.com')
    expect(screen.getByText("Your verified email address can't be changed.")).toBeInTheDocument()

    await user.type(email, 'x')
    expect(email).toHaveValue('parent@example.com')
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })

  it('saves the name without sending an email or a password', async () => {
    const user = userEvent.setup()
    const api = await setup({
      routes: { 'PUT /profile': { body: { message: 'Profile updated successfully.', user: makeUser('parent') } } },
    })
    await startEditing(user)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.callsTo('PUT', '/profile')).toHaveLength(1))
    const body = api.callsTo('PUT', '/profile')[0].body
    expect(body).not.toHaveProperty('email')
    expect(body).not.toHaveProperty('current_password')
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

describe('Profile: an unverified email can be corrected', () => {
  it('lets the person change it and sends the new address', async () => {
    const user = userEvent.setup()
    const api = await setup({
      user: account({ email_verified: false }),
      routes: {
        'PUT /profile': {
          body: {
            message: 'Email address updated. We sent a new verification code to it.',
            user: account({ email_verified: false, email: 'new@example.com' }),
          },
        },
      },
    })
    await startEditing(user)

    const email = screen.getByLabelText('Email Address')
    expect(email).toBeEnabled()
    expect(screen.getByText(/not verified yet, so you can correct it/)).toBeInTheDocument()

    await user.clear(email)
    await user.type(email, 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.callsTo('PUT', '/profile')).toHaveLength(1))
    expect(api.callsTo('PUT', '/profile')[0].body.email).toBe('new@example.com')
  })

  it('does not send the email when it was not changed', async () => {
    const user = userEvent.setup()
    const api = await setup({
      user: account({ email_verified: false }),
      routes: { 'PUT /profile': { body: { message: 'ok', user: account({ email_verified: false }) } } },
    })
    await startEditing(user)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.callsTo('PUT', '/profile')).toHaveLength(1))
    expect(api.callsTo('PUT', '/profile')[0].body).not.toHaveProperty('email')
  })

  it('shows the server error when the new address is taken', async () => {
    const user = userEvent.setup()
    await setup({
      user: account({ email_verified: false }),
      routes: { 'PUT /profile': { status: 422, body: { errors: { email: ['This email address cannot be used.'] } } } },
    })
    await startEditing(user)

    const email = screen.getByLabelText('Email Address')
    await user.clear(email)
    await user.type(email, 'taken@example.com')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('This email address cannot be used.')).toBeInTheDocument()
  })
})

describe('Profile: phone number', () => {
  const saved = { body: { message: 'Profile updated successfully.', user: makeUser('parent') } }

  it('shows the +63 prefix with the saved number in the same format, and saves a changed number as +63 912 345 6789', async () => {
    const user = userEvent.setup()
    const api = await setup({ routes: { 'PUT /profile': saved } })
    await startEditing(user)

    const phone = screen.getByLabelText('Phone Number')
    expect(screen.getByText('+63')).toBeInTheDocument()
    expect(phone).toHaveValue('917 000 0000')

    await user.clear(phone)
    await user.type(phone, '0912 345 6789')
    expect(phone).toHaveValue('912 345 6789')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.callsTo('PUT', '/profile')).toHaveLength(1))
    expect(api.callsTo('PUT', '/profile')[0].body.contact_number).toBe('+63 912 345 6789')
  })

  it('does not save a number that is not complete', async () => {
    const user = userEvent.setup()
    const api = await setup({ routes: { 'PUT /profile': saved } })
    await startEditing(user)

    const phone = screen.getByLabelText('Phone Number')
    await user.clear(phone)
    await user.type(phone, '91234')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText(/10-digit mobile number/)).toBeInTheDocument()
    expect(api.callsTo('PUT', '/profile')).toHaveLength(0)
  })

  it('can clear the phone number', async () => {
    const user = userEvent.setup()
    const api = await setup({ routes: { 'PUT /profile': saved } })
    await startEditing(user)

    await user.clear(screen.getByLabelText('Phone Number'))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.callsTo('PUT', '/profile')).toHaveLength(1))
    expect(api.callsTo('PUT', '/profile')[0].body.contact_number).toBeNull()
  })
})

describe('Profile: phone number display', () => {
  it('shows a saved number as +63 912 345 6789 even if it was saved in an older format', async () => {
    await setup()

    expect(await screen.findByText('+63 917 000 0000')).toBeInTheDocument()
  })
})
