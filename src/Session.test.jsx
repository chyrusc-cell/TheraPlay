import { useEffect } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './TheraPlay.jsx'
import { makeChild, makeUser, mockApi, settle, signIn } from './test/helpers.jsx'

const empty = { body: { data: [] } }

// Renders the real route table with a handle on the router, so a test can press
// "Back" (navigate(-1)) like the browser button.
let navigateTo
function NavProbe() {
  const navigate = useNavigate()
  useEffect(() => {
    navigateTo = navigate
  }, [navigate])
  return null
}

const renderAt = (entries, index = entries.length - 1) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <AppRoutes />
      <NavProbe />
    </MemoryRouter>
  )

function setup({ user = makeUser('parent'), token = true, storage = localStorage, routes = {} } = {}) {
  if (token) signIn(storage)

  return mockApi(
    {
      'GET /user': user ? { body: user } : { status: 401, body: { message: 'Unauthenticated.' } },
      'GET /children': { body: { data: [makeChild(1, 'Mia')] } },
      'POST /logout': { body: { message: 'Logged out successfully.' } },
      ...routes,
    },
    { fallback: empty }
  )
}

const hello = () => screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })
const loginHeading = () => screen.findByRole('heading', { name: 'Login' })

describe('persistent login: the saved login is restored when the app loads', () => {
  it('restores a parent from a saved login after a reload, asking the server once', async () => {
    const api = setup()
    renderAt(['/dashboard'])

    expect(await hello()).toBeInTheDocument()
    expect(api.callsTo('GET', '/user')).toHaveLength(1)
    expect(api.callsTo('GET', '/user')[0].headers.Authorization).toBe('Bearer test-token')
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('restores an admin and keeps admin pages open', async () => {
    setup({ user: makeUser('admin') })
    renderAt(['/manage-accounts'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Manage Accounts' })).toBeInTheDocument()
  })

  it('also restores a login that was kept only for this browser tab', async () => {
    setup({ storage: sessionStorage })
    renderAt(['/dashboard'])

    expect(await hello()).toBeInTheDocument()
    expect(sessionStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('a second load (another refresh) keeps the user logged in', async () => {
    setup()
    const first = renderAt(['/dashboard'])
    await hello()
    first.unmount()

    renderAt(['/dashboard'])

    expect(await hello()).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('clears a rejected (expired or revoked) login and shows the login page', async () => {
    setup({ user: null })
    renderAt(['/dashboard'])

    expect(await loginHeading()).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(sessionStorage.getItem('theraplay_token')).toBeNull()
  })

  it('keeps a login when the server merely cannot verify it right now', async () => {
    setup({ routes: { 'GET /user': { status: 500, body: {} } } })
    renderAt(['/manage-accounts'])

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not verify your access.')
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('moving between pages does not ask the server who you are again', async () => {
    const user = userEvent.setup()
    const api = setup({ routes: { 'GET /activities': { body: { data: [] } } } })
    renderAt(['/dashboard'])
    await hello()

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    await user.click(within(nav).getByRole('link', { name: 'Activities' }))
    await screen.findByRole('heading', { level: 1, name: 'Activities' })
    await user.click(within(nav).getByRole('link', { name: 'Contact Us' }))
    await screen.findByRole('heading', { level: 1, name: 'Contact Us' })
    await user.click(within(nav).getByRole('link', { name: 'Home' }))
    await hello()

    // One check for the whole visit, however many pages were opened.
    expect(api.callsTo('GET', '/user')).toHaveLength(1)
    expect(api.callsTo('GET', '/children')).toHaveLength(1)
  })
})

describe('guest-only pages: a logged-in person is sent to their own dashboard', () => {
  it.each(['/login', '/register', '/forgot-password'])('sends a logged-in parent away from %s', async (path) => {
    setup()
    renderAt([path])

    expect(await hello()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument()
  })

  it.each(['/login', '/register', '/forgot-password'])('sends a logged-in admin away from %s', async (path) => {
    setup({ user: makeUser('admin') })
    renderAt([path])

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
  })

  it('sends a logged-in person from the home address to their dashboard', async () => {
    setup()
    renderAt(['/'])

    expect(await hello()).toBeInTheDocument()
  })

  it('does not show the form while the session is being checked, and does not loop', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const api = setup({ routes: { 'GET /user': () => gate.then(() => ({ body: makeUser('parent') })) } })
    renderAt(['/login'])

    expect(await screen.findByRole('status')).toHaveTextContent('Checking your session...')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

    release()
    expect(await hello()).toBeInTheDocument()
    await settle(api)
    // One check on the guest page, one when the dashboard loads its session. No loop.
    expect(api.callsTo('GET', '/user').length).toBeLessThanOrEqual(2)
  })

  it('shows the pages to a logged-out visitor without asking the server anything', async () => {
    const api = setup({ token: false })
    renderAt(['/login'])

    expect(await loginHeading()).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it.each([
    ['/register', 'Sign up'],
    ['/forgot-password', 'Forgot your password?'],
  ])('lets a logged-out visitor open %s', async (path, heading) => {
    setup({ token: false })
    renderAt([path])

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('clears a rejected login and shows the page instead of redirecting', async () => {
    const api = setup({ user: null })
    renderAt(['/login'])

    expect(await loginHeading()).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(api.callsTo('GET', '/user')).toHaveLength(1)
  })

  it('shows the page, and keeps the login, when the server cannot be reached', async () => {
    setup({ routes: { 'GET /user': () => { throw new TypeError('Failed to fetch') } } })
    renderAt(['/login'])

    expect(await loginHeading()).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('keeps the password reset and email verification pages open for everyone, logged in or not', async () => {
    const api = setup()
    renderAt(['/reset-password?token=abc&email=me%40example.com'])
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()

    renderAt(['/verify-email'])
    expect(await screen.findByRole('heading', { name: 'This link is not valid' })).toBeInTheDocument()

    expect(api.callsTo('GET', '/user')).toHaveLength(0)
  })

  it('Back from the dashboard never lands on the login page for a logged-in user', async () => {
    setup()
    // History: login page, then the dashboard (as it is after a login).
    renderAt(['/login', '/dashboard'])
    await hello()

    act(() => navigateTo(-1))

    expect(await hello()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument()
  })
})

describe('logging out', () => {
  const logOut = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    const dialog = await screen.findByRole('dialog', { name: 'Log out?' })
    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))
  }

  it('lets an admin log out too: revokes the login, clears it and goes to the login page', async () => {
    const user = userEvent.setup()
    const api = setup({ user: makeUser('admin') })
    renderAt(['/professional-dashboard'])
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    await logOut(user)

    expect(await loginHeading()).toBeInTheDocument()
    expect(screen.getByText('You have been logged out.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/logout')).toHaveLength(1)
    expect(api.callsTo('POST', '/logout')[0].headers.Authorization).toBe('Bearer test-token')
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(localStorage.getItem('theraplay_user')).toBeNull()
  })

  it('clears everything saved about the account, including the chosen child', async () => {
    const user = userEvent.setup()
    setup()
    localStorage.setItem('theraplay_user', JSON.stringify({ role: 'parent' }))
    localStorage.setItem('theraplay_selected_child:1', '1')
    renderAt(['/dashboard'])
    await hello()

    await logOut(user)
    await loginHeading()

    expect(localStorage.getItem('theraplay_user')).toBeNull()
    expect(localStorage.getItem('theraplay_selected_child:1')).toBeNull()
  })

  it('still logs out on this device when the server says the login was already invalid', async () => {
    const user = userEvent.setup()
    setup({ routes: { 'POST /logout': { status: 401, body: { message: 'Unauthenticated.' } } } })
    renderAt(['/dashboard'])
    await hello()

    await logOut(user)

    expect(await loginHeading()).toBeInTheDocument()
    expect(screen.getByText('You have been logged out.')).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
  })

  it('still logs out on this device when the server cannot be reached, and says so', async () => {
    const user = userEvent.setup()
    setup({ routes: { 'POST /logout': () => { throw new TypeError('Failed to fetch') } } })
    renderAt(['/dashboard'])
    await hello()

    await logOut(user)

    expect(await loginHeading()).toBeInTheDocument()
    expect(screen.getByText(/could not be reached to end the session/)).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
  })

  it('works from the Profile page and from the admin pages with the same button', async () => {
    const user = userEvent.setup()
    setup()
    renderAt(['/profile'])
    await screen.findByRole('heading', { level: 1, name: 'My Profile' })

    await logOut(user)

    expect(await loginHeading()).toBeInTheDocument()
  })
})

describe('after logging out: protected pages stay closed', () => {
  const logOutNow = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    const dialog = await screen.findByRole('dialog', { name: 'Log out?' })
    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))
    await loginHeading()
  }

  it('Back to a parent page shows the login page, not the account page', async () => {
    const user = userEvent.setup()
    setup()
    renderAt(['/dashboard', '/profile'])
    await screen.findByRole('heading', { level: 1, name: 'My Profile' })
    await logOutNow(user)

    act(() => navigateTo(-1))

    expect(await loginHeading()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).not.toBeInTheDocument()
    expect(screen.queryByText('parent@example.com')).not.toBeInTheDocument()
  })

  it('Back to an admin page shows the login page, not the admin page', async () => {
    const user = userEvent.setup()
    setup({ user: makeUser('admin') })
    renderAt(['/manage-accounts', '/professional-dashboard'])
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    await logOutNow(user)

    act(() => navigateTo(-1))

    expect(await loginHeading()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Manage Accounts' })).not.toBeInTheDocument()
  })

  it.each(['/dashboard', '/progress', '/profile', '/manage-accounts', '/manage-contacts', '/manage-activities', '/professional-dashboard'])(
    'opening %s directly after logging out is blocked',
    async (path) => {
      const api = setup({ token: false, user: null })
      renderAt([path])

      expect(await loginHeading()).toBeInTheDocument()
      expect(api.calls.filter((c) => c.path.startsWith('/admin'))).toEqual([])
    }
  )
})

describe('a login that disappears behind the page (back/forward cache, another tab)', () => {
  const pageShow = (persisted) => {
    const event = new Event('pageshow')
    Object.defineProperty(event, 'persisted', { value: persisted })
    window.dispatchEvent(event)
  }

  it('leaves a restored page when its login is gone (pageshow from the cache)', async () => {
    setup()
    renderAt(['/dashboard'])
    await hello()

    localStorage.removeItem('theraplay_token')
    act(() => pageShow(true))

    expect(await loginHeading()).toBeInTheDocument()
    expect(screen.getByText('You have been logged out.')).toBeInTheDocument()
  })

  it('ignores a normal page load event and a restore when the login is still there', async () => {
    setup()
    renderAt(['/dashboard'])
    await hello()

    act(() => pageShow(false))
    act(() => pageShow(true))

    expect(screen.getByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
  })

  it('leaves the page when the login is removed in another tab', async () => {
    setup()
    renderAt(['/dashboard'])
    await hello()

    localStorage.removeItem('theraplay_token')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'theraplay_token', newValue: null }))
    })

    expect(await loginHeading()).toBeInTheDocument()
  })

  it('ignores storage changes that are not about the login', async () => {
    setup()
    renderAt(['/dashboard'])
    await hello()

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'something-else', newValue: 'x' }))
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
  })

  it('leaves a logged-out visitor on a public page alone', async () => {
    setup({ token: false, user: null, routes: { 'GET /activities': { body: { data: [] } } } })
    renderAt(['/activities'])
    await screen.findByRole('heading', { level: 1, name: 'Activities' })

    act(() => pageShow(true))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Activities' })).toBeInTheDocument())
  })
})
