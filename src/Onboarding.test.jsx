import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeChild, makeUser, mockApi, renderApp, settle, signIn } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const parent = (onboarding, overrides = {}) =>
  makeUser('parent', {
    email: 'pat@example.com',
    email_verified: onboarding !== 'verify_email',
    onboarding,
    ...overrides,
  })

const status = (expiresIn) => ({
  body: { verified: false, email: 'pat@example.com', code_active: expiresIn !== null, expires_in: expiresIn },
})

function setup(user, routes = {}) {
  signIn()

  return mockApi(
    {
      'GET /user': { body: user },
      'GET /children': { body: { data: user.onboarding === 'complete' ? [makeChild(1, 'Mia')] : [] } },
      'GET /conditions': { body: { data: [] } },
      'GET /activities': { body: { data: [] } },
      'GET /progress': { body: { data: { records: [] } } },
      ...routes,
    },
    { fallback: { body: { data: [] } } }
  )
}

const codeBox = () => screen.getByLabelText('Verification code')

describe('Sign-up routing follows the account state', () => {
  it('lets an unverified parent browse, with a reminder (they are not forced to the code screen)', async () => {
    setup(parent('verify_email'), { 'GET /email/code/status': status(540) })
    renderApp('/dashboard')

    const banner = await screen.findByTestId('verification-banner')
    expect(banner).toHaveTextContent('Your email address is not verified')
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Verify your email first' })).toBeInTheDocument()
  })

  it('does not show the reminder to a verified parent', async () => {
    setup(parent('complete'))
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: /Hello/ })).toBeInTheDocument()
    expect(screen.queryByTestId('verification-banner')).not.toBeInTheDocument()
  })

  it('lets an unverified parent open the code screen later, and shows the reminder link to it', async () => {
    setup(parent('verify_email'), { 'GET /email/code/status': status(540) })
    renderApp('/activities')

    const banner = await screen.findByTestId('verification-banner')
    expect(within(banner).getByRole('link', { name: 'Verify now' })).toHaveAttribute('href', '/verify-code')
  })

  it('sends a verified parent without a child to the child profile form after login', async () => {
    setup(parent('create_child'))
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: "Your child's profile" })).toBeInTheDocument()
  })

  it('sends a parent with a child straight to the dashboard (and away from the sign-up pages)', async () => {
    setup(parent('complete'))
    renderApp('/verify-code')

    expect(await screen.findByRole('heading', { level: 1, name: /Hello/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument()
  })

  it('keeps an unverified parent off the child form (they go to the dashboard, still unverified)', async () => {
    setup(parent('verify_email'), { 'GET /email/code/status': status(540) })
    renderApp('/create-child')

    expect(await screen.findByTestId('verification-banner')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: "Your child's profile" })).not.toBeInTheDocument()
  })

  it('sends a guest to login and an admin to the admin dashboard', async () => {
    mockApi({ 'GET /user': { status: 401, body: {} } }, { fallback: { body: { data: [] } } })
    renderApp('/verify-code')
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('does not put an admin through sign-up', async () => {
    setup(makeUser('admin'))
    renderApp('/create-child')

    await waitFor(() => expect(screen.queryByRole('heading', { name: "Your child's profile" })).not.toBeInTheDocument())
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent("Your child's profile")
  })
})

describe('Email code screen', () => {
  const open = async (routes = {}) => {
    const api = setup(parent('verify_email'), { 'GET /email/code/status': status(540), ...routes })
    renderApp('/verify-code')
    await screen.findByRole('heading', { name: 'Check your email' })
    await settle(api)

    return api
  }

  it('shows the stage, the address, the countdown, Verify and Resend', async () => {
    await open()

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Verify email')
    expect(screen.getByText(/six-digit code/)).toBeInTheDocument()
    expect(screen.getByText('The code expires in 9:00.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled()
  })

  it('accepts only digits, at most six, and supports paste', async () => {
    const user = userEvent.setup()
    await open()

    await user.type(codeBox(), 'ab12-34cd5678')
    expect(codeBox()).toHaveValue('123456')

    await user.clear(codeBox())
    fireEvent.paste(codeBox(), { clipboardData: { getData: () => ' 98 76-54 321 ' } })
    expect(codeBox()).toHaveValue('987654')
    expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled()
  })

  it('verifies a correct code and moves on to the child profile without a login', async () => {
    const user = userEvent.setup()
    const api = await open({
      'POST /email/code/verify': {
        body: { status: 'verified', user: parent('create_child', { email_verified: true }) },
      },
    })

    await user.type(codeBox(), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('heading', { name: "Your child's profile" })).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/code/verify')[0].body).toEqual({ code: '123456' })
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument()
  })

  it('shows an error for a wrong code, keeps the screen, and says how many tries are left', async () => {
    const user = userEvent.setup()
    await open({
      'POST /email/code/verify': { status: 422, body: { status: 'invalid', attempts_left: 4 } },
    })

    await user.type(codeBox(), '000000')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not correct. You have 4 tries left.')
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
  })

  it('explains an expired code and offers a new one', async () => {
    const user = userEvent.setup()
    await open({ 'POST /email/code/verify': { status: 410, body: { status: 'expired' } } })

    await user.type(codeBox(), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This code has expired')
    expect(screen.getByText(/expired or none is active/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled()
  })

  it('tells the person when the guess limit destroyed the code', async () => {
    const user = userEvent.setup()
    await open({ 'POST /email/code/verify': { status: 422, body: { status: 'too_many_attempts' } } })

    await user.type(codeBox(), '111111')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('request a new one')
    expect(codeBox()).toHaveValue('')
  })

  it('handles the rate limit politely', async () => {
    const user = userEvent.setup()
    await open({ 'POST /email/code/verify': { status: 429, body: {} } })

    await user.type(codeBox(), '111111')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
  })

  it('sends one request even if Verify is pressed twice quickly', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const api = await open({
      'POST /email/code/verify': () => gate.then(() => ({ status: 422, body: { status: 'invalid', attempts_left: 4 } })),
    })

    await user.type(codeBox(), '123456')
    const verify = screen.getByRole('button', { name: 'Verify' })
    await user.click(verify)
    await user.click(screen.getByRole('button', { name: 'Verifying...' }))

    expect(api.callsTo('POST', '/email/code/verify')).toHaveLength(1)
    release()
    await screen.findByRole('alert')
  })

  it('resends a code, restarts the countdown and disables Resend for a moment', async () => {
    const user = userEvent.setup()
    const api = await open({
      'POST /email/code/resend': { body: { status: 'sent', delivered: true, message: 'A new code was sent. The previous code no longer works.', expires_in: 600 } },
    })

    await user.type(codeBox(), '123')
    await user.click(screen.getByRole('button', { name: 'Resend code' }))

    expect(await screen.findByText('A new code was sent. The previous code no longer works.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/code/resend')).toHaveLength(1)
    expect(codeBox()).toHaveValue('')
    expect(screen.getByText('The code expires in 10:00.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Resend code \(\d+s\)/ })).toBeDisabled()
  })

  it('does not claim delivery when email is not set up, and reports a send failure', async () => {
    const user = userEvent.setup()
    await open({
      'POST /email/code/resend': { body: { status: 'not_delivered', delivered: false, message: 'Email delivery is not set up on this server yet, so no email was delivered.', expires_in: 600 } },
    })

    await user.click(screen.getByRole('button', { name: 'Resend code' }))

    expect(await screen.findByText(/no email was delivered/)).toBeInTheDocument()
  })

  it('has a log out action', async () => {
    const user = userEvent.setup()
    const api = await open({ 'POST /logout': { body: {} } })

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(api.callsTo('POST', '/logout')).toHaveLength(1)
    expect(localStorage.getItem('theraplay_token')).toBeNull()
  })
})

describe('Child profile screen', () => {
  // Like the real server: once the child exists, the account is "complete".
  const serverWithChild = (onCreate) => {
    let created = false

    return {
      'GET /user': () => ({ body: parent(created ? 'complete' : 'create_child') }),
      'GET /children': () => ({ body: { data: created ? [makeChild(9, 'Mia')] : [] } }),
      'POST /children': async () => {
        await onCreate?.()
        created = true

        return { status: 201, body: { data: { child: makeChild(9, 'Mia') } } }
      },
    }
  }

  const open = async (routes = {}) => {
    const api = setup(parent('create_child'), routes)
    renderApp('/create-child')
    await screen.findByRole('heading', { name: "Your child's profile" })
    await settle(api)

    return api
  }

  it('shows the third stage and the existing child fields', async () => {
    await open()

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Child profile')
    expect(screen.getByLabelText("Child's name")).toBeInTheDocument()
  })

  it('creates the child for the logged-in parent and goes to the dashboard', async () => {
    const user = userEvent.setup()
    const api = await open(serverWithChild())

    await user.type(screen.getByLabelText("Child's name"), ' Mia ')
    await user.click(screen.getByRole('button', { name: 'Finish sign-up' }))

    expect(await screen.findByRole('heading', { level: 1, name: /Hello/ })).toBeInTheDocument()
    expect(api.callsTo('POST', '/children')[0].body).toMatchObject({ name: 'Mia', condition_ids: [] })
    expect(api.callsTo('POST', '/children')[0].body).not.toHaveProperty('user_id')
  })

  it('sends one request even if the button is pressed twice quickly', async () => {
    const user = userEvent.setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const api = await open(serverWithChild(() => gate))

    await user.type(screen.getByLabelText("Child's name"), 'Mia')
    await user.click(screen.getByRole('button', { name: 'Finish sign-up' }))
    await user.click(screen.getByRole('button', { name: 'Saving...' }))

    expect(api.callsTo('POST', '/children')).toHaveLength(1)
    release()
    await screen.findByRole('heading', { level: 1, name: /Hello/ })
  })

  it('does not create anything when the name is missing', async () => {
    const user = userEvent.setup()
    const api = await open()

    await user.click(screen.getByRole('button', { name: 'Finish sign-up' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.')
    expect(api.callsTo('POST', '/children')).toHaveLength(0)
  })

  it('shows the server message and stays when saving fails', async () => {
    const user = userEvent.setup()
    await open({ 'POST /children': { status: 500, body: { message: 'Something went wrong.' } } })

    await user.type(screen.getByLabelText("Child's name"), 'Mia')
    await user.click(screen.getByRole('button', { name: 'Finish sign-up' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.getByRole('heading', { name: "Your child's profile" })).toBeInTheDocument()
  })

  it('goes back to the email code screen if the server says the email is not verified', async () => {
    const user = userEvent.setup()
    // Like the real server: after refusing the child it reports the account as unverified.
    let refused = false
    await open({
      'GET /user': () => ({ body: refused ? parent('verify_email') : parent('create_child') }),
      'POST /children': () => {
        refused = true

        return { status: 403, body: { code: 'email_not_verified', message: 'Please verify your email address.' } }
      },
      'GET /email/code/status': status(null),
    })

    await user.type(screen.getByLabelText("Child's name"), 'Mia')
    await user.click(screen.getByRole('button', { name: 'Finish sign-up' }))

    // The server refused the child (email not verified): the parent lands where they can
    // browse and verify, not on the child form.
    expect(await screen.findByTestId('verification-banner')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: "Your child's profile" })).not.toBeInTheDocument()
  })
})

describe('Verify later', () => {
  it('leaves the account unverified and goes to the dashboard without verifying anything', async () => {
    const user = userEvent.setup()
    const api = setup(parent('verify_email'), { 'GET /email/code/status': status(540) })
    renderApp('/verify-code')

    await user.click(await screen.findByRole('button', { name: 'Verify later' }))

    expect(await screen.findByTestId('verification-banner')).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/code/verify')).toHaveLength(0)
    expect(api.callsTo('POST', '/children')).toHaveLength(0)
  })

  it('can be reached again later and a new code can be requested there', async () => {
    const user = userEvent.setup()
    const api = setup(parent('verify_email'), {
      'GET /email/code/status': status(null),
      'POST /email/code/resend': { body: { status: 'sent', delivered: true, message: 'A new code was sent.', expires_in: 600 } },
    })
    renderApp('/verify-code')

    await user.click(await screen.findByRole('button', { name: 'Resend code' }))

    expect(await screen.findByText('A new code was sent.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/email/code/resend')).toHaveLength(1)
  })

  it('shows the wait time when the server asks for a cooldown', async () => {
    const user = userEvent.setup()
    setup(parent('verify_email'), {
      'GET /email/code/status': status(null),
      'POST /email/code/resend': { status: 429, body: { status: 'cooldown', retry_after: 25, message: 'wait' } },
    })
    renderApp('/verify-code')

    await user.click(await screen.findByRole('button', { name: 'Resend code' }))

    expect(await screen.findByText('Please wait 25 seconds before asking for another code.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend code (25s)' })).toBeDisabled()
  })
})
