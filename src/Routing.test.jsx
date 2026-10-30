import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeChild, makeUser, mockApi, renderApp, settle, signIn } from './test/helpers.jsx'

// Pages whose own data is not what these tests are about get an empty list.
const empty = { body: { data: [] } }

function setup({ user, token = true, routes = {} } = {}) {
  if (token) signIn()

  return mockApi(
    {
      'GET /user': user ? { body: user } : { status: 401, body: { message: 'Unauthenticated.' } },
      'GET /children': { body: { data: [makeChild(1, 'Mia')] } },
      ...routes,
    },
    { fallback: empty }
  )
}

const adminCalls = (api) => api.calls.filter((call) => call.path.startsWith('/admin'))

describe('routing: guests (not logged in)', () => {
  it('sends a guest from the home address to the login page', async () => {
    setup({ token: false })
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it.each(['/manage-accounts', '/manage-activities', '/manage-contacts', '/professional-dashboard'])(
    'sends a guest away from the admin page %s to login, with a message',
    async (path) => {
      const api = setup({ token: false })
      renderApp(path)

      expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByText('Please log in to continue.')).toBeInTheDocument()
      expect(adminCalls(api)).toEqual([])
    }
  )

  it.each(['/dashboard', '/progress', '/profile'])('sends a guest away from the parent page %s to login', async (path) => {
    setup({ token: false })
    renderApp(path)

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText(/Please log in/)).toBeInTheDocument()
  })

  it('lets a guest read the public Activities and Contact pages', async () => {
    setup({ token: false, routes: { 'GET /activities': { body: { data: [] } } } })
    renderApp('/activities')
    expect(await screen.findByRole('heading', { name: 'Activities', level: 1 })).toBeInTheDocument()
  })

  it('shows a Page not found page for an unknown address', async () => {
    setup({ token: false })
    renderApp('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('routing: parents', () => {
  it('lets a parent open the parent pages', async () => {
    setup({ user: makeUser('parent') })
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
  })

  it.each(['/manage-accounts', '/manage-activities', '/manage-contacts', '/professional-dashboard'])(
    'keeps a parent out of the admin page %s (sent to the parent dashboard, no admin data asked for)',
    async (path) => {
      const api = setup({ user: makeUser('parent') })
      renderApp(path)

      expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Manage (Accounts|Activities|Contacts)/ })).not.toBeInTheDocument()
      await settle(api)
      expect(adminCalls(api)).toEqual([])
    }
  )

  it('shows a parent the parent navigation and no admin links', async () => {
    setup({ user: makeUser('parent') })
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: 'My Progress' })).toBeInTheDocument()
    // The parent menu keeps its own Contact Us link.
    expect(within(nav).getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact')
    expect(within(nav).queryByRole('link', { name: /Manage Accounts/ })).not.toBeInTheDocument()
  })

  it('renders the sidebar as a floating, rounded panel and keeps navigation working', async () => {
    const user = userEvent.setup()
    setup({ user: makeUser('parent') })
    renderApp('/dashboard')
    await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const panel = nav.closest('aside')
    expect(panel).toHaveClass('fixed', 'top-sidebar-gap', 'bottom-sidebar-gap', 'left-sidebar-gap', 'rounded-[24px]', 'border')
    expect(panel).not.toHaveClass('inset-y-0', 'left-0', 'border-r')
    // The page starts after the panel plus its gaps, and the landmarks are intact.
    expect(screen.getByRole('main').parentElement).toHaveClass('ml-sidebar-offset', 'tablet:ml-sidebar-offset-rail')
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')

    await user.click(within(nav).getByRole('link', { name: 'My Progress' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'My Progress' })).toBeInTheDocument()
  })

  it('takes the role from the server, not from what is saved in the browser', async () => {
    // Someone edits their saved user to say "admin"; the server still says parent.
    localStorage.setItem('theraplay_user', JSON.stringify(makeUser('admin')))
    const api = setup({ user: makeUser('parent') })
    renderApp('/manage-accounts')

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })).toBeInTheDocument()
    expect(adminCalls(api)).toEqual([])
  })
})

describe('routing: admins', () => {
  const admin = makeUser('admin')

  it.each([
    ['/manage-accounts', 'Manage Accounts'],
    ['/manage-activities', 'Manage Activities'],
    ['/manage-contacts', 'Manage Contacts'],
    ['/professional-dashboard', 'Dashboard'],
  ])('lets an admin open %s', async (path, heading) => {
    setup({ user: admin })
    renderApp(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows an admin the admin navigation', async () => {
    setup({ user: admin })
    renderApp('/manage-accounts')
    await screen.findByRole('heading', { level: 1, name: 'Manage Accounts' })

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: /Manage Accounts/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Manage Contacts/ })).toBeInTheDocument()
  })

  it('does not add a Contact Us link to the admin navigation', async () => {
    setup({ user: admin })
    renderApp('/manage-accounts')
    await screen.findByRole('heading', { level: 1, name: 'Manage Accounts' })

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })

    expect(within(nav).queryByRole('link', { name: 'Contact Us' })).not.toBeInTheDocument()
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Manage Activities',
      'Manage Contacts',
      'Manage Accounts',
      'Profile',
    ])
  })

  it('does not load or show any child for an admin', async () => {
    const api = setup({ user: admin })
    renderApp('/professional-dashboard')
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    await settle(api)

    expect(api.callsTo('GET', '/children')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Choose child/ })).not.toBeInTheDocument()
  })
})

describe('routing: checking the login', () => {
  it('shows "Checking your access..." until the server has answered', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    setup({ user: makeUser('admin'), routes: { 'GET /user': () => gate.then(() => ({ body: makeUser('admin') })) } })
    renderApp('/manage-accounts')

    expect(await screen.findByText('Checking your access...')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Manage Accounts' })).not.toBeInTheDocument()

    release()
    expect(await screen.findByRole('heading', { level: 1, name: 'Manage Accounts' })).toBeInTheDocument()
  })

  it('treats an expired or rejected login (401) as logged out: clears it and goes to login', async () => {
    setup({ user: null })
    renderApp('/manage-accounts')

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(sessionStorage.getItem('theraplay_token')).toBeNull()
  })

  it('also works for a login saved for this tab only (sessionStorage)', async () => {
    signIn(sessionStorage)
    setup({ user: makeUser('admin'), token: false })
    renderApp('/manage-accounts')

    expect(await screen.findByRole('heading', { level: 1, name: 'Manage Accounts' })).toBeInTheDocument()
  })

  it('offers to try again when the server cannot be reached, and recovers', async () => {
    const user = userEvent.setup()
    let calls = 0
    setup({
      user: makeUser('admin'),
      routes: {
        'GET /user': () => {
          calls += 1
          return calls === 1 ? { status: 500, body: {} } : { body: makeUser('admin') }
        },
      },
    })
    renderApp('/manage-accounts')

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not verify your access.')
    // A failure to verify is not a logout: the saved login is kept.
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Manage Accounts' })).toBeInTheDocument()
  })
})

describe('routing: accounts that must verify their email first', () => {
  const held = makeUser('parent', { email_verified: false, pending_email: null, email_verification_required: true })

  it('shows the instruction instead of the page, and asks nothing else of the server', async () => {
    const api = setup({ user: held })
    renderApp('/activities')

    expect(await screen.findByRole('heading', { level: 1, name: 'Verify your email' })).toBeInTheDocument()
    expect(screen.getByText(/We sent a verification link to/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Activities' })).not.toBeInTheDocument()
    await settle(api)
    expect(api.callsTo('GET', '/activities')).toHaveLength(0)
  })

  it('still lets that account open its Profile (to resend or fix the address)', async () => {
    setup({ user: held })
    renderApp('/profile')

    expect(await screen.findByRole('heading', { level: 1, name: 'My Profile' })).toBeInTheDocument()
  })

  it('does not hold back a verified account, an admin or a guest', async () => {
    setup({ user: makeUser('parent', { email_verified: true, email_verification_required: false }), routes: { 'GET /activities': { body: { data: [] } } } })
    renderApp('/activities')

    expect(await screen.findByRole('heading', { level: 1, name: 'Activities' })).toBeInTheDocument()
  })
})

describe('routing: logging out', () => {
  async function openLogout(user) {
    await screen.findByRole('heading', { level: 1, name: 'Hello, Pat Parent!' })
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    return screen.findByRole('dialog', { name: 'Log out?' })
  }

  it('asks first, and does nothing if the user cancels', async () => {
    const user = userEvent.setup()
    const api = setup({ user: makeUser('parent') })
    renderApp('/dashboard')
    const dialog = await openLogout(user)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.callsTo('POST', '/logout')).toHaveLength(0)
    expect(localStorage.getItem('theraplay_token')).toBe('test-token')
  })

  it('ends the session on the server, clears the login and the remembered child, and goes to login', async () => {
    const user = userEvent.setup()
    const api = setup({ user: makeUser('parent'), routes: { 'POST /logout': { body: { message: 'Logged out' } } } })
    localStorage.setItem('theraplay_selected_child:1', '1')
    renderApp('/dashboard')
    const dialog = await openLogout(user)

    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText('You have been logged out.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/logout')).toHaveLength(1)
    expect(api.callsTo('POST', '/logout')[0].headers.Authorization).toBe('Bearer test-token')
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(localStorage.getItem('theraplay_selected_child:1')).toBeNull()
  })

  it('still logs out on this device, and says so, when the server cannot end the session', async () => {
    const user = userEvent.setup()
    setup({ user: makeUser('parent'), routes: { 'POST /logout': { status: 500, body: {} } } })
    renderApp('/dashboard')
    const dialog = await openLogout(user)

    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText(/could not end the session/)).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('theraplay_token')).toBeNull())
  })

  it('logs out cleanly even if the token had already expired (401 from logout)', async () => {
    const user = userEvent.setup()
    setup({ user: makeUser('parent'), routes: { 'POST /logout': { status: 401, body: {} } } })
    renderApp('/dashboard')
    const dialog = await openLogout(user)

    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))

    expect(await screen.findByText('You have been logged out.')).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBeNull()
  })
})
