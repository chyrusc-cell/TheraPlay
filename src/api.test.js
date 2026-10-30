import { describe, expect, it } from 'vitest'
import { API_URL, apiRequest, clearSession, getToken, mapValidationErrors } from './api.js'
import { dateLimits, validateChild } from './childValidation.js'
import { mockApi } from './test/helpers.jsx'

describe('api: the address', () => {
  it('uses the configured API address (the tests point it at a fake host, never the real server)', () => {
    expect(API_URL).toBe('http://api.test/api')
  })
})

describe('api: apiRequest', () => {
  it('does not call the server at all without a login, and reports 401', async () => {
    const api = mockApi({})

    const result = await apiRequest('/children')

    expect(result).toEqual({ ok: false, status: 401, data: {} })
    expect(api.calls).toHaveLength(0)
  })

  it('sends the saved token as a Bearer token (also from sessionStorage)', async () => {
    sessionStorage.setItem('theraplay_token', 'tab-token')
    const api = mockApi({ 'GET /children': { body: { data: [] } } })

    await apiRequest('/children')

    expect(getToken()).toBe('tab-token')
    expect(api.calls[0].headers.Authorization).toBe('Bearer tab-token')
  })

  it('sends public requests without a token', async () => {
    const api = mockApi({ 'GET /conditions': { body: { data: [] } } })

    const result = await apiRequest('/conditions', { auth: false })

    expect(result.ok).toBe(true)
    expect(api.calls[0].headers.Authorization).toBeUndefined()
  })

  it('sends a body as JSON, and returns the status and data of an error', async () => {
    localStorage.setItem('theraplay_token', 't')
    const api = mockApi({ 'POST /children': { status: 422, body: { errors: { name: ['Required'] } } } })

    const result = await apiRequest('/children', { method: 'POST', body: { name: '' } })

    expect(api.calls[0].headers['Content-Type']).toBe('application/json')
    expect(api.calls[0].body).toEqual({ name: '' })
    expect(result).toEqual({ ok: false, status: 422, data: { errors: { name: ['Required'] } } })
  })

  it('leaves the content type to the browser for file uploads', async () => {
    localStorage.setItem('theraplay_token', 't')
    const api = mockApi({ 'POST /profile/photo': { body: {} } })
    const form = new FormData()
    form.append('photo', new Blob(['x']), 'a.png')

    await apiRequest('/profile/photo', { method: 'POST', body: form })

    expect(api.calls[0].headers['Content-Type']).toBeUndefined()
    expect(api.calls[0].body).toBeInstanceOf(FormData)
  })
})

describe('api: clearSession and mapValidationErrors', () => {
  it('removes the login from both storages, and the remembered child choices', () => {
    localStorage.setItem('theraplay_token', 'a')
    sessionStorage.setItem('theraplay_token', 'b')
    localStorage.setItem('theraplay_selected_child:3', '9')

    clearSession()

    expect(getToken()).toBeNull()
    expect(localStorage.getItem('theraplay_selected_child:3')).toBeNull()
  })

  it('keeps the first message of each field, including nested field names', () => {
    expect(
      mapValidationErrors({ name: ['First', 'Second'], 'condition_ids.0': ['Bad id'], email: 'Plain text' })
    ).toEqual({ name: 'First', condition_ids: 'Bad id', email: 'Plain text' })
  })
})

describe('child validation', () => {
  it('requires a name that is not just spaces', () => {
    expect(validateChild({ name: '   ', dateOfBirth: '' }).name).toBeTruthy()
    expect(validateChild({ name: 'Mia', dateOfBirth: '' })).toEqual({})
  })

  it('accepts a date of birth within the last 18 years, up to today', () => {
    const { min, max } = dateLimits()

    expect(validateChild({ name: 'Mia', dateOfBirth: max })).toEqual({})
    expect(validateChild({ name: 'Mia', dateOfBirth: min })).toEqual({})
  })

  it('rejects future dates and dates more than 18 years ago', () => {
    expect(validateChild({ name: 'Mia', dateOfBirth: '2999-01-01' }).date_of_birth).toMatch(/future/)
    expect(validateChild({ name: 'Mia', dateOfBirth: '1990-01-01' }).date_of_birth).toMatch(/18 years/)
  })
})
