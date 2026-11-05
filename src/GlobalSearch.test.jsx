import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GlobalSearch from './GlobalSearch.jsx'
import { makeUser, mockApi, renderWithProviders, signIn } from './test/helpers.jsx'

describe('GlobalSearch pill layering', () => {
  it('keeps the pill blur on a separate layer, so the suggestions dropdown always blurs the page', async () => {
    signIn()
    mockApi({ 'GET /user': { body: makeUser('parent') } }, { fallback: { body: { data: [] } } })
    renderWithProviders(<GlobalSearch />)

    const layer = await screen.findByTestId('search-pill-layer')
    const pill = layer.parentElement

    // At the top of the page: lightly tinted, no blur anywhere.
    expect(layer.className).toContain('bg-white/40')
    expect(layer.className).not.toContain('backdrop-blur')

    window.scrollY = 200
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    // Scrolled: the blur is on the layer; the pill element itself (the dropdown's
    // ancestor) never gets a backdrop-filter, which would make it a backdrop root.
    expect(layer.className).toContain('backdrop-blur-md')
    expect(pill.className).not.toContain('backdrop-blur')
    expect(pill.className).not.toMatch(/\bbg-white\//)

    window.scrollY = 0
  })
})
