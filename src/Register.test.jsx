import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Register from './Register.jsx'
import { mockApi } from './test/helpers.jsx'

function LoginProbe() {
  const { state } = useLocation()
  return <p data-testid="login-page">{state?.message}</p>
}

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('First Name'), 'Pat')
  await user.type(screen.getByLabelText('Last Name'), 'Parent')
  await user.type(screen.getByLabelText('Email', { exact: true }), 'pat@example.com')
  await user.type(screen.getByLabelText('Phone Number'), '0917 000 0000')
  await user.type(screen.getByLabelText('Password', { exact: true }), 'password123')
  await user.type(screen.getByLabelText(/^Confirm/), 'password123')
  await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  await user.type(await screen.findByLabelText("Child's name"), 'Mia')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

const setup = (registerResponse) => {
  const api = mockApi({
    'GET /conditions': { body: { data: [] } },
    'POST /register': registerResponse,
  })
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  )

  return api
}

describe('Register: verification instructions', () => {
  it('tells the person to verify their email when the server really sent the email', async () => {
    const user = userEvent.setup({ delay: null })
    const api = setup({ status: 201, body: { message: 'ok', email_verification: { sent: true, delivery_available: true } } })

    await fillAndSubmit(user)

    expect(await screen.findByTestId('login-page')).toHaveTextContent('We sent a verification link to your email address')
    expect(api.callsTo('POST', '/register')[0].body).toMatchObject({ email: 'pat@example.com', first_name: 'Pat' })
  })

  it('does not claim an email is on its way when delivery is not set up', async () => {
    const user = userEvent.setup({ delay: null })
    setup({ status: 201, body: { message: 'ok', email_verification: { sent: true, delivery_available: false } } })

    await fillAndSubmit(user)

    const text = (await screen.findByTestId('login-page')).textContent
    expect(text).toContain('Registration successful! Please log in.')
    expect(text).toContain('verify your email address later from your Profile page')
    expect(text).not.toContain('We sent a verification link')
  })

  it('does not claim an email was sent when sending failed', async () => {
    const user = userEvent.setup({ delay: null })
    setup({ status: 201, body: { message: 'ok', email_verification: { sent: false, delivery_available: true } } })

    await fillAndSubmit(user)

    expect(await screen.findByTestId('login-page')).not.toHaveTextContent('We sent a verification link')
  })

  it('stays on the form and shows the server\'s message when the address is already used', async () => {
    const user = userEvent.setup({ delay: null })
    setup({ status: 422, body: { errors: { email: ['The email has already been taken.'] } } })

    await fillAndSubmit(user)

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })
})
