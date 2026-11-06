import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeChild, makeUser, mockApi, renderApp, signIn } from './test/helpers.jsx'

const empty = { body: { data: [] } }

function setup(user) {
  signIn()

  return mockApi(
    {
      'GET /user': { body: user },
      'GET /children': { body: { data: [makeChild(1, 'Mia')] } },
      'POST /logout': { body: { message: 'Logged out.' } },
    },
    { fallback: empty }
  )
}

const openMenu = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Open profile menu' }))
  return screen.getByRole('menu', { name: 'Profile menu' })
}

describe.each([
  ['a parent', () => makeUser('parent'), '/dashboard'],
  ['an administrator', () => makeUser('admin'), '/manage-accounts'],
])('Profile menu for %s', (_label, makeAccount, startPath) => {
  it('opens with exactly two choices: Profile and Logout', async () => {
    const user = userEvent.setup()
    setup(makeAccount())
    renderApp(startPath)

    const menu = await openMenu(user)

    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Profile', 'Logout'])
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows the signed-in name and email above the two choices', async () => {
    const user = userEvent.setup()
    const account = makeAccount()
    setup(account)
    renderApp(startPath)

    const menu = await openMenu(user)

    expect(within(menu).getByText(account.name)).toBeInTheDocument()
    expect(within(menu).getByText(account.email)).toBeInTheDocument()
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2)
  })

  it('closes on a second click of the icon, on Escape, and on an outside click', async () => {
    const user = userEvent.setup()
    setup(makeAccount())
    renderApp(startPath)

    await openMenu(user)
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await openMenu(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toHaveFocus()

    await openMenu(user)
    await user.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Profile goes to the Profile page and closes the menu', async () => {
    const user = userEvent.setup()
    setup(makeAccount())
    renderApp(startPath)

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Profile' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'My Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Logout asks first, then uses the existing logout and returns to login', async () => {
    const user = userEvent.setup()
    const api = setup(makeAccount())
    renderApp(startPath)

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Logout' }))

    const dialog = await screen.findByRole('dialog', { name: 'Log out?' })
    expect(api.callsTo('POST', '/logout')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    await waitFor(() => expect(api.callsTo('POST', '/logout')).toHaveLength(1))
  })

  it('has no Log Out button left in the side navigation', async () => {
    setup(makeAccount())
    renderApp(startPath)
    await screen.findByRole('button', { name: 'Open profile menu' })

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Log ?out$/i })).not.toBeInTheDocument()
  })
})
