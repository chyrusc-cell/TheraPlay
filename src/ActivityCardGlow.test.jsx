import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityCardsSkeleton } from './Skeleton.jsx'

// jsdom cannot evaluate ::before/::after or media queries, so the visual contract of
// the activity card glow is checked in the stylesheet sources themselves.
const read = (file) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), file), 'utf8').replace(/\r\n/g, '\n')

const tailwind = read('css/tailwind.css')
const ui = read('css/ui.css')

// The CSS of one `@utility name { ... }` block (up to the next top-level "}").
const utility = (name) => {
  const start = tailwind.indexOf(`@utility ${name} {`)
  expect(start, `@utility ${name} exists`).toBeGreaterThan(-1)
  const end = tailwind.indexOf('\n}\n', start)

  return tailwind.slice(start, end)
}

describe('Activity card glow: stylesheet contract', () => {
  const glow = utility('glow-card')
  const before = glow.slice(glow.indexOf('&::before {'), glow.indexOf('&::after {'))
  const after = glow.slice(glow.indexOf('&::after {'), glow.indexOf('&:has('))

  it('uses the sidebar ACTIVE-PAGE glow: the three muted colours only, the shared 30s animation and 5px blur', () => {
    expect(before).toContain('--glow-pink: #e07082')
    expect(before).toContain('--glow-yellow: #ece280')
    expect(before).toContain('--glow-cyan: #86cfcf')
    expect(before).toContain('linear-gradient(45deg, var(--glow-pink), var(--glow-yellow), var(--glow-cyan), var(--glow-pink))')
    expect(before).toContain('animation: navigation-glowing 30s linear infinite')
    expect(before).toContain('filter: blur(5px)')
    // The keyframes and registered colour properties are the sidebar's (not duplicated).
    expect(tailwind.match(/@keyframes navigation-glowing/g)).toHaveLength(1)
    expect(tailwind.match(/@property --glow-pink/g)).toHaveLength(1)
  })

  it('never uses the vibrant hover colours, and the muted values are exactly the sidebar active-page ones', () => {
    for (const vibrant of ['#ff0055', '#ffff69', '#00ffff', '#FF0055', '#FFFF69', '#00FFFF']) {
      expect(glow.toLowerCase()).not.toContain(vibrant.toLowerCase())
    }

    // nav-glow sets the muted colours for the current page; the card must use the same three.
    const nav = utility('nav-glow')
    const active = nav.slice(nav.indexOf('&.nav-item-active:not(:hover):not(:focus-visible)::before'))
    for (const colour of ['#e07082', '#ece280', '#86cfcf']) {
      expect(active).toContain(colour)
      expect(before).toContain(colour)
    }
  })

  it('idle: invisible glow, glass surface with only a small, tight shadow', () => {
    expect(before).toContain('opacity: 0')
    expect(before).toContain('visibility: hidden')
    expect(before).not.toContain('box-shadow')
    expect(glow).not.toContain('--glass-shadow')
    expect(after).toContain('box-shadow: 0 3px 10px -2px')
    expect(after).toContain('background-color: var(--glass-bg)')
    expect(after).toContain('border: var(--glass-border)')
    expect(after).toContain('backdrop-filter: blur(var(--glass-blur))')
  })

  it('the glow is behind the glass, follows the rounded corners and never takes clicks', () => {
    expect(before).toContain('z-index: -2')
    expect(after).toContain('z-index: -1')
    expect(before).toContain('border-radius: calc(var(--glass-radius) + 2px)')
    expect(before).toContain('inset: calc(var(--glass-stack-inset, 0px) * -1 - 2px)')
    expect(before).toContain('pointer-events: none')
    expect(after).toContain('pointer-events: none')
  })

  it('fades in and out over 0.5s', () => {
    expect(before).toContain('opacity 0.5s ease-in-out')
    expect(before).toContain('visibility 0s linear 0.5s')
    const shown = glow.slice(glow.indexOf('&:has('))
    expect(shown.match(/transition: opacity 0\.5s ease-in-out/g)).toHaveLength(2)
  })

  it('lights up on keyboard focus inside the card, and on hover only where hover really exists (a tap never leaves it lit)', () => {
    expect(glow).toContain('&:has(:focus-visible)::before')
    expect(glow).toMatch(/@media \(hover: hover\) \{\s*&:hover::before/)
    // No unconditional :hover rule outside the media query.
    const outside = glow.replace(/@media \(hover: hover\) \{[\s\S]*$/, '')
    expect(outside).not.toContain(':hover')
  })

  it('reduced motion: no gradient movement and a short 0.2s fade', () => {
    expect(ui).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.glow-card::before \{\s*animation: none !important;\s*transition-duration: 0\.2s !important;/)
  })

  it('the sidebar glow and the Manage Accounts glass-stack are untouched', () => {
    expect(tailwind).toContain('@utility nav-glow {')
    expect(tailwind).toContain('@utility glass-stack {')
    expect(utility('glass-stack')).toContain('box-shadow: var(--glass-shadow)')
    expect(tailwind).toContain('animation: navigation-glowing 30s linear infinite')
  })
})

describe('Activity card skeleton', () => {
  it('has the same glass shell as the real card but can never glow (no pointer events)', () => {
    render(<ActivityCardsSkeleton count={2} />)

    const status = screen.getByRole('status')
    const cards = status.querySelectorAll('.glow-card')
    expect(cards).toHaveLength(2)

    for (const card of cards) {
      expect(card).toHaveClass('border-2', 'border-transparent', 'pointer-events-none')
      expect(card.className).toContain('[--glass-stack-inset:2px]')
      // Same footprint inputs as the real card: padding and the 180px picture block.
      expect(card).toHaveClass('p-5')
    }
  })
})
