import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Login from './Login.jsx'
import { makeUser, mockApi } from './test/helpers.jsx'

const setup = (user = makeUser('parent')) => {
  const api = mockApi({ 'POST /login': { body: { message: 'Login successful.', token: 'issued-token', user } } })
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p data-testid="parent-home">parent home</p>} />
        <Route path="/professional-dashboard" element={<p data-testid="admin-home">admin home</p>} />
      </Routes>
    </MemoryRouter>
  )

  return api
}

const submit = async (user) => {
  await user.type(screen.getByLabelText('Email'), 'me@example.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Login' }))
}

describe('Login: how the login is kept', () => {
  it('keeps the login across browser restarts by default ("Remember me" is on)', async () => {
    const user = userEvent.setup({ delay: null })
    setup()
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeChecked()

    await submit(user)

    expect(await screen.findByTestId('parent-home')).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBe('issued-token')
    expect(sessionStorage.getItem('theraplay_token')).toBeNull()
  })

  it('keeps it only for this browser tab when "Remember me" is switched off', async () => {
    const user = userEvent.setup({ delay: null })
    setup()
    await user.click(screen.getByRole('checkbox', { name: 'Remember me' }))

    await submit(user)

    expect(await screen.findByTestId('parent-home')).toBeInTheDocument()
    expect(sessionStorage.getItem('theraplay_token')).toBe('issued-token')
    expect(localStorage.getItem('theraplay_token')).toBeNull()
  })

  it('never stores the password anywhere', async () => {
    const user = userEvent.setup({ delay: null })
    setup()

    await submit(user)
    await screen.findByTestId('parent-home')

    const everything = JSON.stringify({ ...localStorage, ...sessionStorage })
    expect(everything).not.toContain('password123')
  })

  it('sends an admin to the admin dashboard', async () => {
    const user = userEvent.setup({ delay: null })
    setup(makeUser('admin'))

    await submit(user)

    expect(await screen.findByTestId('admin-home')).toBeInTheDocument()
  })

  it('shows the server\'s message and saves nothing for a wrong password', async () => {
    const user = userEvent.setup({ delay: null })
    mockApi({ 'POST /login': { status: 401, body: { message: 'The email or password is incorrect.' } } })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    )

    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is incorrect.')
    expect(localStorage.getItem('theraplay_token')).toBeNull()
    expect(sessionStorage.getItem('theraplay_token')).toBeNull()
  })

  it('replaces a login kept in the other storage', async () => {
    const user = userEvent.setup({ delay: null })
    sessionStorage.setItem('theraplay_token', 'old-session-token')
    setup()

    await submit(user)
    await screen.findByTestId('parent-home')

    expect(localStorage.getItem('theraplay_token')).toBe('issued-token')
    expect(sessionStorage.getItem('theraplay_token')).toBeNull()
  })
})
