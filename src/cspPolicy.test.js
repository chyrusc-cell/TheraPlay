import { describe, expect, it } from 'vitest'
import { buildCsp } from './cspPolicy.js'

const sources = import.meta.glob(['./*.jsx', './*.js', '!./*.test.*', '!./test/**'], { query: '?raw', import: 'default', eager: true })
const html = import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true })

const directive = (policy, name) => policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? ''

describe('Content Security Policy', () => {
  const policy = buildCsp('http://127.0.0.1:8000/api')

  it('allows scripts only from the app itself: no inline scripts and no eval', () => {
    const script = directive(policy, 'script-src')
    expect(script).toBe("script-src 'self'")
    expect(policy).not.toContain('unsafe-eval')
  })

  it('lets the app reach only its own API', () => {
    expect(directive(policy, 'connect-src')).toBe("connect-src 'self' http://127.0.0.1:8000")
    expect(directive(policy, 'img-src')).toContain('http://127.0.0.1:8000')
    expect(buildCsp('https://api.example.org/api/')).toContain('connect-src \'self\' https://api.example.org')
  })

  it('keeps what the app needs: blob frames and images for previews, fonts, form and base limits', () => {
    expect(directive(policy, 'frame-src')).toBe('frame-src blob:')
    expect(directive(policy, 'img-src')).toContain('blob:')
    expect(directive(policy, 'font-src')).toContain('https://fonts.gstatic.com')
    expect(directive(policy, 'style-src')).toContain('https://fonts.googleapis.com')
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(policy, 'form-action')).toBe("form-action 'self'")
    expect(directive(policy, 'default-src')).toBe("default-src 'self'")
  })

  it('is safe to put in a meta attribute (no double quotes)', () => {
    expect(policy).not.toContain('"')
  })
})

describe('the React app is compatible with that policy', () => {
  it('has no inline script or inline event handler in index.html', () => {
    const page = Object.values(html)[0]
    const scripts = [...page.matchAll(/<script\b([^>]*)>/g)]
    expect(scripts.length).toBeGreaterThan(0)
    for (const [, attributes] of scripts) expect(attributes).toMatch(/\bsrc=/)
    expect(page).not.toMatch(/\son[a-z]+=/i)
  })

  it('never uses eval, new Function, javascript: URLs or raw HTML injection', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    const offenders = Object.entries(sources).flatMap(([file, code]) =>
      [/\beval\(/, /new Function\(/, /javascript:/, /dangerouslySetInnerHTML/, /\.innerHTML\s*=/, /document\.write\(/]
        .filter((pattern) => pattern.test(code))
        .map((pattern) => `${file}: ${pattern}`)
    )
    expect(offenders).toEqual([])
  })
})
