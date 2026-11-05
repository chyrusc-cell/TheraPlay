import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from './authContext.js'
import ChildProvider from './ChildProvider.jsx'
import ChildSelector from './ChildSelector.jsx'
import { clearSession } from './api.js'
import { useChildren } from './childContext.js'
import { makeChild, makeUser, mockApi, signIn } from './test/helpers.jsx'

const mia = makeChild(1, 'Mia')
const leo = makeChild(2, 'Leo')

// Shows what the shared child state says, so tests read it like a user would.
function StateProbe() {
  const { status, children, selectedChild, selectedChildId } = useChildren()

  return (
    <dl>
      <dt>status</dt>
      <dd data-testid="status">{status}</dd>
      <dt>count</dt>
      <dd data-testid="count">{children.length}</dd>
      <dt>selected</dt>
      <dd data-testid="selected">{selectedChild?.name ?? 'none'}</dd>
      <dt>id</dt>
      <dd data-testid="selected-id">{String(selectedChildId)}</dd>
    </dl>
  )
}

// ChildProvider as Layout mounts it: below the (verified) user, inside a router.
function renderChildren(user, { withSelector = true } = {}) {
  const auth = { status: user ? 'authenticated' : 'unauthenticated', user, retry: () => {}, updateUser: () => {} }
  const tree = (u) => (
    <MemoryRouter>
      <AuthContext.Provider value={{ ...auth, user: u, status: u ? 'authenticated' : 'unauthenticated' }}>
        <ChildProvider>
          {withSelector && <ChildSelector />}
          <StateProbe />
        </ChildProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
  const view = render(tree(user))

  return { ...view, rerenderAs: (u) => view.rerender(tree(u)) }
}

const selectorButton = () => screen.getByRole('button', { name: /Choose child/ })

describe('selected child: a parent with several children', () => {
  it('starts with the first child selected', async () => {
    signIn()
    mockApi({ 'GET /children': { body: { data: [mia, leo] } } })
    renderChildren(makeUser('parent'))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    expect(screen.getByTestId('count')).toHaveTextContent('2')
    expect(screen.getByTestId('selected')).toHaveTextContent('Mia')
    expect(selectorButton()).toHaveAccessibleName('Choose child. Selected: Mia')
  })

  it('lets the parent choose another child from the top-bar selector', async () => {
    const user = userEvent.setup()
    signIn()
    mockApi({ 'GET /children': { body: { data: [mia, leo] } } })
    renderChildren(makeUser('parent'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    await user.click(selectorButton())
    const list = screen.getByRole('listbox', { name: 'Children' })
    expect(within(list).getByRole('option', { name: 'Mia' })).toHaveAttribute('aria-selected', 'true')
    expect(within(list).getByRole('option', { name: 'Leo' })).toHaveAttribute('aria-selected', 'false')

    await user.click(within(list).getByRole('option', { name: 'Leo' }))

    // The shared state, the selector and the list all agree.
    expect(screen.getByTestId('selected')).toHaveTextContent('Leo')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(selectorButton()).toHaveAccessibleName('Choose child. Selected: Leo')
  })

  it('can also choose a child with the keyboard', async () => {
    const user = userEvent.setup()
    signIn()
    mockApi({ 'GET /children': { body: { data: [mia, leo] } } })
    renderChildren(makeUser('parent'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    await user.click(selectorButton())
    screen.getByRole('option', { name: 'Leo' }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('selected')).toHaveTextContent('Leo')
  })

  it('remembers the choice for next time, per account', async () => {
    const user = userEvent.setup()
    signIn()
    mockApi({ 'GET /children': { body: { data: [mia, leo] } } })
    const first = renderChildren(makeUser('parent', { id: 7 }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    await user.click(selectorButton())
    await user.click(screen.getByRole('option', { name: 'Leo' }))
    await waitFor(() => expect(localStorage.getItem('theraplay_selected_child:7')).toBe('2'))
    first.unmount()

    // A later visit restores it...
    renderChildren(makeUser('parent', { id: 7 }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('selected')).toHaveTextContent('Leo')
  })

  it('never carries one account\'s choice over to another account', async () => {
    signIn()
    localStorage.setItem('theraplay_selected_child:7', '2')
    mockApi({ 'GET /children': { body: { data: [mia, leo] } } })

    // A different parent (id 8) with the same children list gets the default.
    renderChildren(makeUser('parent', { id: 8 }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    expect(screen.getByTestId('selected')).toHaveTextContent('Mia')
  })

  it('forgets the remembered choice on logout', () => {
    localStorage.setItem('theraplay_selected_child:7', '2')
    localStorage.setItem('theraplay_selected_child:8', '5')
    localStorage.setItem('unrelated', 'keep')

    clearSession()

    expect(localStorage.getItem('theraplay_selected_child:7')).toBeNull()
    expect(localStorage.getItem('theraplay_selected_child:8')).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })
})

describe('selected child: ownership isolation', () => {
  it('ignores a remembered child id that is not in the parent\'s own list', async () => {
    signIn()
    // Some other parent's child (id 99) was left in storage.
    localStorage.setItem('theraplay_selected_child:1', '99')
    mockApi({ 'GET /children': { body: { data: [mia, leo] } } })
    renderChildren(makeUser('parent', { id: 1 }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    expect(screen.getByTestId('selected-id')).toHaveTextContent('1')
    // ...and the stored value is replaced with a valid one.
    await waitFor(() => expect(localStorage.getItem('theraplay_selected_child:1')).toBe('1'))
  })

  it('only offers the children the server returned for this parent', async () => {
    const user = userEvent.setup()
    signIn()
    const api = mockApi({ 'GET /children': { body: { data: [mia] } } })
    renderChildren(makeUser('parent'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    await user.click(selectorButton())

    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(api.callsTo('GET', '/children')).toHaveLength(1)
  })
})

describe('selected child: no child, admin, guest and errors', () => {
  it('handles a parent with no children safely (nothing selected, a clear way to add one)', async () => {
    signIn()
    mockApi({ 'GET /children': { body: { data: [] } } })
    renderChildren(makeUser('parent'))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('selected')).toHaveTextContent('none')
    expect(screen.getByTestId('selected-id')).toHaveTextContent('null')
    expect(screen.getByRole('link', { name: 'Add a child' })).toHaveAttribute('href', '/profile')
    expect(screen.queryByRole('button', { name: /Choose child/ })).not.toBeInTheDocument()
  })

  it('does not remember a selection when there is no child', async () => {
    signIn()
    localStorage.setItem('theraplay_selected_child:1', '5')
    mockApi({ 'GET /children': { body: { data: [] } } })
    renderChildren(makeUser('parent', { id: 1 }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    await waitFor(() => expect(localStorage.getItem('theraplay_selected_child:1')).toBeNull())
  })

  it('does not ask for children at all for an admin, and shows no selector', () => {
    signIn()
    const api = mockApi({})
    renderChildren(makeUser('admin'))

    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(screen.getByTestId('selected')).toHaveTextContent('none')
    expect(screen.queryByRole('button', { name: /Choose child/ })).not.toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('does not ask for children for a guest either', () => {
    const api = mockApi({})
    renderChildren(null)

    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(api.calls).toHaveLength(0)
  })

  it('reports a failure to load the children without selecting anything', async () => {
    signIn()
    mockApi({ 'GET /children': { status: 500, body: { message: 'Server error' } } })
    renderChildren(makeUser('parent'))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'))

    expect(screen.getByTestId('selected')).toHaveTextContent('none')
    expect(selectorButton()).toBeDisabled()
    expect(selectorButton()).toHaveAccessibleName('Choose child. Selected: Children unavailable')
  })

  it('starts fresh when the signed-in account changes', async () => {
    signIn()
    const children = { 1: [mia, leo], 2: [makeChild(10, 'Zoe')] }
    mockApi({
      'GET /children': () => ({ body: { data: children[currentUser.id] } }),
    })
    let currentUser = makeUser('parent', { id: 1 })
    const view = renderChildren(currentUser)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('Mia'))

    currentUser = makeUser('parent', { id: 2 })
    view.rerenderAs(currentUser)

    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('Zoe'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })
})
