import { act, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AuthProvider from '../AuthProvider.jsx'
import ChildProvider from '../ChildProvider.jsx'
import { AppRoutes } from '../TheraPlay.jsx'
import { API_URL } from '../api.js'

// ---------------------------------------------------------------- fake server

/*
 * Replaces fetch with an in-memory fake of the Laravel API.
 *
 *   const api = mockApi({
 *     'GET /user': { body: user('parent') },
 *     'GET /progress?child_id=2': { body: { data: { records: [] } } },  // exact query
 *     'GET /progress': ({ query }) => ({ body: ... }),                 // any query
 *     'POST /children': { status: 422, body: { errors: { name: ['Required'] } } },
 *   })
 *
 *   api.calls            every request made: { method, path, query, headers, body }
 *   api.callsTo('GET', '/progress')
 *
 * A route is a response ({ status = 200, body = {} }) or a function that returns
 * one, or a promise of one (it receives the request). A request nothing matches throws, so a test never
 * silently depends on an endpoint it did not mock. Nothing here touches the network.
 */
export function mockApi(routes = {}, { fallback } = {}) {
  const calls = []

  const fake = vi.fn(async (url, init = {}) => {
    const full = String(url)

    if (!full.startsWith(API_URL)) {
      throw new Error(`Test tried to reach a non-API address: ${full}`)
    }

    const target = new URL(full)
    const path = target.pathname.replace(/^\/api/, '')
    const method = (init.method || 'GET').toUpperCase()
    const query = Object.fromEntries(target.searchParams)
    const body =
      typeof init.body === 'string'
        ? JSON.parse(init.body)
        : init.body instanceof FormData
          ? init.body
          : undefined

    const request = { method, path, query, headers: init.headers || {}, body }
    calls.push(request)

    const handler = routes[`${method} ${path}${target.search}`] ?? routes[`${method} ${path}`] ?? fallback

    if (handler === undefined) {
      throw new Error(`Unmocked API request in a test: ${method} ${path}${target.search}`)
    }

    // A handler may return a promise, to hold a response back.
    const {
      status = 200,
      body: payload = {},
      deliverEvenIfAborted = false,
    } = await (typeof handler === 'function' ? handler(request) : handler)

    // Like the real fetch, a request that was aborted meanwhile normally never
    // delivers. A real browser can still hand over an answer it had already
    // received; deliverEvenIfAborted simulates that, to test that the page ignores it.
    await Promise.resolve()

    if (init.signal?.aborted && !deliverEvenIfAborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    }
  })

  vi.stubGlobal('fetch', fake)

  return {
    calls,
    callsTo: (method, path) => calls.filter((call) => call.method === method && call.path === path),
    fetch: fake,
  }
}

// ------------------------------------------------------------------- fixtures

export const makeUser = (role = 'parent', overrides = {}) => ({
  id: role === 'admin' ? 99 : 1,
  name: role === 'admin' ? 'Ada Admin' : 'Pat Parent',
  email: `${role}@example.com`,
  role,
  ...overrides,
})

export const makeChild = (id, name, overrides = {}) => ({
  id,
  name,
  date_of_birth: null,
  conditions: [],
  ...overrides,
})

export const makeActivity = (id, title, overrides = {}) => ({
  id,
  title,
  description: `${title} description`,
  difficulty: 'Easy',
  category: null,
  image_url: null,
  ...overrides,
})

// Waits until the app has stopped making requests (nothing new for `quiet` ms),
// so a test asserts on the final screen, not on a half-loaded one. The app loads
// in steps (verify the user, load the children, then the page's own data).
export async function settle(api, quiet = 120) {
  let last = -1
  let stableTicks = 0

  // Two quiet periods in a row, so one slow step on a busy machine is not
  // mistaken for "finished".
  while (stableTicks < 2) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, quiet))
    })

    stableTicks = api.calls.length === last ? stableTicks + 1 : 0
    last = api.calls.length
  }
}

// A short wait with the app running, for "nothing should change now" checks
// (a late answer that must be ignored).
export const settleBriefly = (ms = 150) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })

// A saved login, like Login.jsx leaves behind.
export const signIn = (storage = localStorage) => storage.setItem('theraplay_token', 'test-token')

// -------------------------------------------------------------------- render

// A page (or any component) with the real router, AuthProvider and ChildProvider,
// exactly as Layout provides them. The API must be mocked (see mockApi).
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ChildProvider>{ui}</ChildProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

// The whole real route table (guards, Layout, sidebar, pages) at an address.
export function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>
  )
}
