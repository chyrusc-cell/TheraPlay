import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// findBy* and waitFor wait up to 1s by default, which is tight when the machine
// is busy (several test files run in parallel). A test that is correct simply
// finishes as soon as it can; only a failing one ever waits this long.
configure({ asyncUtilTimeout: 4000 })

// jsdom does not do layout, so offsetParent is always null. Modal's Tab trap
// ignores elements that look hidden (offsetParent === null), so without this every
// element would count as hidden. Treat attached, non-display:none elements as
// visible, which is what a real browser reports for them.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get() {
    if (!this.isConnected || getComputedStyle(this).display === 'none') {
      return null
    }
    return this.parentNode
  },
})

// jsdom has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn()

// Safety net: no test may reach the network. Every test that renders something
// that fetches installs its own mock with mockApi() (see ./helpers.jsx); anything
// else fails loudly here instead of calling the real API at 127.0.0.1:8000.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      throw new Error(`Unmocked network request in a test: ${url}`)
    })
  )
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  document.documentElement.removeAttribute('data-child-selector')
})
