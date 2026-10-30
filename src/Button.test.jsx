import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Mail } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button.jsx'

describe('Button', () => {
  it('is a single native button that shows its children', () => {
    render(<Button>Save Changes</Button>)

    const button = screen.getByRole('button', { name: 'Save Changes' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.querySelector('button')).toBeNull()
  })

  it('never submits a form by accident: type is "button" unless asked otherwise', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </form>
    )

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('calls onClick, and does not when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Go</Button>)

    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<Button onClick={onClick} disabled>Go</Button>)
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('while loading it is disabled, marked busy and shows a spinner next to the label', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { container } = render(<Button loading onClick={onClick}>Saving...</Button>)

    const button = screen.getByRole('button', { name: 'Saving...' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not marked busy when it is not loading', () => {
    render(<Button>Idle</Button>)

    expect(screen.getByRole('button', { name: 'Idle' })).not.toHaveAttribute('aria-busy')
  })

  it.each([
    ['primary', /btn-solid/, /bg-primary/],
    ['secondary', /btn-glass/, /border-edge-strong/],
    ['danger', /btn-solid/, /a50e0e/],
    ['success', /btn-solid/, /bg-success/],
  ])('the %s variant uses the shared glass classes and its own color', (variant, glass, color) => {
    render(<Button variant={variant}>Action</Button>)

    const classes = screen.getByRole('button', { name: 'Action' }).className
    expect(classes).toMatch(glass)
    expect(classes).toMatch(color)
  })

  it('the ghost variant has no glass surface', () => {
    render(<Button variant="ghost">Quiet</Button>)

    expect(screen.getByRole('button', { name: 'Quiet' }).className).not.toMatch(/btn-(solid|glass)/)
  })

  it('defaults to the secondary variant and the medium size, and has three sizes', () => {
    const { rerender } = render(<Button>Plain</Button>)
    const classes = () => screen.getByRole('button', { name: 'Plain' }).className

    expect(classes()).toMatch(/btn-glass/)
    expect(classes()).toMatch(/text-\[14px\]/)

    rerender(<Button size="small">Plain</Button>)
    expect(classes()).toMatch(/text-\[13px\]/)

    rerender(<Button size="large">Plain</Button>)
    expect(classes()).toMatch(/text-\[16px\]/)
  })

  it('appends className and passes every other prop (aria, title, ref) to the button', () => {
    const ref = createRef()
    render(
      <Button ref={ref} className="w-full" title="Add one" aria-label="Add a thing" data-testid="b">
        +
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Add a thing' })
    expect(button.className).toMatch(/w-full/)
    expect(button).toHaveAttribute('title', 'Add one')
    expect(ref.current).toBe(button)
  })

  it('keeps icons and text together as ordinary children', () => {
    const { container } = render(
      <Button variant="primary">
        <Mail size={16} aria-hidden="true" />
        Send
      </Button>
    )

    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
