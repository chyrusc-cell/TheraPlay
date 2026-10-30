import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import VerifyEmail from './VerifyEmail.jsx'
import { mockApi, settle, signIn } from './test/helpers.jsx'

const LINK = '/verify-email?id=7&hash=abc123&expires=1900000000&signature=sig456'

const open = (url = LINK) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <VerifyEmail />
    </MemoryRouter>
  )

const verifyRoute = (response) => ({ 'POST /email/verify/7/abc123': response })

describe('Verify email page', () => {
  it('sends the signed link to the API exactly once, without needing a login', async () => {
    const api = mockApi(verifyRoute({ body: { status: 'verified', message: 'ok' } }))
    open()
    await settle(api)

    const calls = api.callsTo('POST', '/email/verify/7/abc123')
    expect(calls).toHaveLength(1)
    expect(calls[0].query).toEqual({ expires: '1900000000', signature: 'sig456' })
    expect(calls[0].headers.Authorization).toBeUndefined()
  })

  it('shows "Checking..." while the server answers', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    mockApi(verifyRoute(() => gate.then(() => ({ body: { status: 'verified' } }))))
    open()

    expect(await screen.findByRole('status')).toHaveTextContent('Checking your verification link...')

    release()
    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument()
  })

  it('reports a verified address', async () => {
    mockApi(verifyRoute({ body: { status: 'verified' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument()
    expect(screen.getByText('Your email address is verified. Thank you!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to login' })).toHaveAttribute('href', '/login')
  })

  it('reports a completed email change', async () => {
    mockApi(verifyRoute({ body: { status: 'email_changed' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'Email address changed' })).toBeInTheDocument()
  })

  it('reports an already verified (already used) link calmly', async () => {
    mockApi(verifyRoute({ body: { status: 'already_verified' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'Already verified' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains an expired link and tells a guest how to get a new one', async () => {
    mockApi(verifyRoute({ status: 410, body: { status: 'expired' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Log in, then open your Profile/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send me a new link' })).not.toBeInTheDocument()
  })

  it('offers a logged-in person a button to send a new link, and reports delivery honestly', async () => {
    const user = userEvent.setup()
    signIn()
    const api = mockApi({
      ...verifyRoute({ status: 410, body: { status: 'expired' } }),
      'POST /email/verification-notification': { body: { message: 'Email delivery is not set up on this server yet.', delivered: false } },
    })
    open()

    await user.click(await screen.findByRole('button', { name: 'Send me a new link' }))

    expect(await screen.findByText('Email delivery is not set up on this server yet.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/verification-notification')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Go to my profile' })).toHaveAttribute('href', '/profile')
  })

  it('explains an invalid link', async () => {
    mockApi(verifyRoute({ status: 403, body: { status: 'invalid' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'This link is not valid' })).toBeInTheDocument()
  })

  it('shows an incomplete link as invalid without asking the server anything', async () => {
    const api = mockApi({})
    open('/verify-email?id=7&hash=abc123')

    expect(await screen.findByRole('heading', { name: 'This link is not valid' })).toBeInTheDocument()
    await settle(api)
    expect(api.calls).toHaveLength(0)
  })

  it('says when the new address now belongs to someone else', async () => {
    mockApi(verifyRoute({ status: 409, body: { status: 'email_taken' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'Address already in use' })).toBeInTheDocument()
  })

  it('says to wait when there are too many attempts', async () => {
    mockApi(verifyRoute({ status: 429, body: { message: 'Too Many Attempts.' } }))
    open()

    expect(await screen.findByRole('heading', { name: 'Too many attempts' })).toBeInTheDocument()
  })

  it('shows a connection problem as such, not as a bad link', async () => {
    mockApi({ 'POST /email/verify/7/abc123': () => { throw new TypeError('Failed to fetch') } })
    open()

    expect(await screen.findByRole('heading', { name: 'Could not verify' })).toBeInTheDocument()
  })

  it('treats an unknown answer as a failure rather than success', async () => {
    mockApi(verifyRoute({ status: 500, body: {} }))
    open()

    expect(await screen.findByRole('heading', { name: 'Could not verify' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Email verified' })).not.toBeInTheDocument()
  })

  it('has one main landmark and one h1', async () => {
    mockApi(verifyRoute({ body: { status: 'verified' } }))
    open()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument())

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
