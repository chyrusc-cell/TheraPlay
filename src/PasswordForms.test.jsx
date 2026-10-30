import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ForgotPassword from './ForgotPassword.jsx'
import ResetPassword from './ResetPassword.jsx'
import { mockApi } from './test/helpers.jsx'

function LoginProbe() {
  const { state } = useLocation()
  return <p data-testid="login-page">{state?.message}</p>
}

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  )

describe('Forgot password form', () => {
  it('asks the API (without a login) and shows its wording when email delivery works', async () => {
    const user = userEvent.setup()
    const api = mockApi({ 'POST /forgot-password': { body: { message: 'If an account exists for that email address, a password reset link has been sent.', delivery_available: true } } })
    renderAt('/forgot-password')

    await user.type(screen.getByLabelText('Email'), '  me@example.com ')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists for that email address')
    expect(api.callsTo('POST', '/forgot-password')[0].body).toEqual({ email: 'me@example.com' })
    expect(api.callsTo('POST', '/forgot-password')[0].headers.Authorization).toBeUndefined()
  })

  it('does not claim an email was sent when delivery is not set up', async () => {
    const user = userEvent.setup()
    mockApi({ 'POST /forgot-password': { body: { message: 'Email delivery is not set up on this server yet, so no email was delivered.', delivery_available: false } } })
    renderAt('/forgot-password')

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    const note = await screen.findByText(/no email was delivered/)
    expect(note.className).toMatch(/b26a00/)
  })

  it('rejects an obviously invalid address without calling the server', async () => {
    const user = userEvent.setup()
    const api = mockApi({})
    renderAt('/forgot-password')

    // (The browser accepts "a@b" for an email field; the app's own check does not.)
    await user.type(screen.getByLabelText('Email'), 'a@b')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a valid email address.')
    expect(api.calls).toHaveLength(0)
  })

  it('shows a rate limit and a connection failure clearly, and keeps the typed address', async () => {
    const user = userEvent.setup()
    let n = 0
    mockApi({
      'POST /forgot-password': () => {
        n += 1
        if (n === 1) return { status: 429, body: {} }
        throw new TypeError('Failed to fetch')
      },
    })
    renderAt('/forgot-password')

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests')

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findByText('Unable to connect to the server. Please try again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('me@example.com')
  })
})

describe('Reset password form', () => {
  const LINK = '/reset-password?token=tok123&email=me%40example.com'
  const fill = async (user, password = 'brand-new-pass-1', confirmation = password) => {
    await user.type(screen.getByLabelText('New password'), password)
    await user.type(screen.getByLabelText('Confirm new password'), confirmation)
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
  }

  it('sends the token, email and new password from the link to the API, then goes to login', async () => {
    const user = userEvent.setup()
    const api = mockApi({ 'POST /reset-password': { body: { message: 'Your password has been reset.' } } })
    renderAt(LINK)

    expect(screen.getByText('Resetting the password for me@example.com')).toBeInTheDocument()
    await fill(user)

    expect(await screen.findByTestId('login-page')).toHaveTextContent('Your password has been reset. Please log in with your new password.')
    expect(api.callsTo('POST', '/reset-password')[0].body).toEqual({
      token: 'tok123',
      email: 'me@example.com',
      password: 'brand-new-pass-1',
      password_confirmation: 'brand-new-pass-1',
    })
  })

  it('checks length and confirmation before calling the server', async () => {
    const user = userEvent.setup()
    const api = mockApi({})
    renderAt(LINK)

    await fill(user, 'short')
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8 characters')

    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Confirm new password'))
    await fill(user, 'long-enough-1', 'different-1')
    expect(await screen.findByText('The password confirmation does not match.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('shows an invalid, expired or already used link as such', async () => {
    const user = userEvent.setup()
    mockApi({ 'POST /reset-password': { status: 422, body: { message: 'This password reset link is invalid or has expired. Please request a new one.' } } })
    renderAt(LINK)

    await fill(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('This password reset link is invalid or has expired. Please request a new one.')
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('shows the server\'s password-rule message and a rate-limit message', async () => {
    const user = userEvent.setup()
    let n = 0
    mockApi({
      'POST /reset-password': () => {
        n += 1
        return n === 1
          ? { status: 422, body: { errors: { password: ['The password must contain at least one letter.'] } } }
          : { status: 429, body: {} }
      },
    })
    renderAt(LINK)

    await fill(user, '12345678')
    expect(await screen.findByText('The password must contain at least one letter.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(await screen.findByText(/Too many attempts/)).toBeInTheDocument()
  })

  it('does not show the form for an incomplete link and sends nothing', async () => {
    const api = mockApi({})
    renderAt('/reset-password?token=only-a-token')

    expect(screen.getByText('This reset link is incomplete.')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })
})
