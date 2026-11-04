import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Register from './Register.jsx'
import { mockApi } from './test/helpers.jsx'

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('First Name'), 'Pat')
  await user.type(screen.getByLabelText('Last Name'), 'Parent')
  await user.type(screen.getByLabelText('Email', { exact: true }), 'pat@example.com')
  await user.type(screen.getByLabelText('Phone Number'), '0917 000 0000')
  await user.type(screen.getByLabelText('Password', { exact: true }), 'password123')
  await user.type(screen.getByLabelText(/^Confirm/), 'password123')
  await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

const setup = (registerResponse) => {
  const api = mockApi({ 'POST /register': registerResponse })
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/verify-code" element={<p data-testid="verify-code-page">verify code page</p>} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>
  )

  return api
}

describe('Register: account first, child profile only after verification', () => {
  it('has no child step: one form that creates the account', () => {
    setup({ status: 201, body: {} })

    expect(screen.queryByText(/Step 1 of 2/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Child's name")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('sends only the account details (no child), keeps the person signed in and goes to the email code screen', async () => {
    const user = userEvent.setup({ delay: null })
    localStorage.clear()
    const api = setup({ status: 201, body: { message: 'ok', token: 'new-token', user: { id: 5, email: 'pat@example.com', role: 'parent' }, email_verification: { sent: true, delivery_available: true } } })

    await fillAndSubmit(user)

    expect(await screen.findByTestId('verify-code-page')).toBeInTheDocument()
    expect(localStorage.getItem('theraplay_token')).toBe('new-token')

    const body = api.callsTo('POST', '/register')[0].body
    expect(body).toMatchObject({ email: 'pat@example.com', first_name: 'Pat' })
    expect(body).not.toHaveProperty('child')
    expect(body).not.toHaveProperty('role')
  })

  it("stays on the form and shows the server's message when the address is already used", async () => {
    const user = userEvent.setup({ delay: null })
    setup({ status: 422, body: { errors: { email: ['The email has already been taken.'] } } })

    await fillAndSubmit(user)

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument()
  })
})
