import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CategoriesAdmin from './CategoriesAdmin.jsx'
import { mockApi, signIn } from './test/helpers.jsx'

const categories = [
  { id: 1, name: 'Executive Function', description: null, activities_count: 2 },
  { id: 6, name: 'Visual', description: 'Seeing', activities_count: 0 },
]

function renderAdmin(routes = {}) {
  signIn()
  const api = mockApi(routes)
  const onSaved = vi.fn()

  render(
    <MemoryRouter>
      <CategoriesAdmin categories={categories} onSaved={onSaved} />
    </MemoryRouter>
  )

  return { api, onSaved }
}

describe('CategoriesAdmin: the six categories are a fixed set', () => {
  it('lists the categories but offers no add, rename or delete controls', () => {
    renderAdmin()

    expect(screen.getByText('Executive Function')).toBeInTheDocument()
    expect(screen.getByText('Visual')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add category/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('edits only the description and sends the name unchanged', async () => {
    const user = userEvent.setup()
    const saved = { id: 6, name: 'Visual', description: 'Eyes', activities_count: 0 }
    const { api, onSaved } = renderAdmin({ 'PUT /admin/categories/6': { body: { message: 'Category updated.', data: saved } } })

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()

    const field = screen.getByLabelText('Description')
    await user.clear(field)
    await user.type(field, 'Eyes')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
    expect(api.callsTo('PUT', '/admin/categories/6')[0].body).toEqual({ name: 'Visual', description: 'Eyes' })
  })

  it('shows the server message when saving fails', async () => {
    const user = userEvent.setup()
    renderAdmin({ 'PUT /admin/categories/1': { status: 500, body: { message: 'Could not save the category.' } } })

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not save the category.')).toBeInTheDocument()
  })
})
