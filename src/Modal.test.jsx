import { useEffect, useState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal.jsx'

// A page that opens a modal, the way the real pages do: a button, state, a form.
function Harness({ busy = false, onClose = () => {}, children, title = 'Edit contact' }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <button type="button">Other page button</button>
      <Modal
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        busy={busy}
        title={title}
      >
        {children ?? (
          <form>
            <label htmlFor="name">Name</label>
            <input id="name" />
            <button type="button">Save</button>
          </form>
        )}
      </Modal>
    </div>
  )
}

const openModal = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Open modal' }))
  return screen.findByRole('dialog')
}

const waitForClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

describe('Modal: opening', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>Secret</p>
      </Modal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })

  it('opens when requested and shows its title and content', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const dialog = await openModal(user)

    expect(dialog).toHaveTextContent('Edit contact')
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('is exposed as a modal dialog labelled by its title', async () => {
    const user = userEvent.setup()
    render(<Harness title="Add a child" />)

    await openModal(user)

    const dialog = screen.getByRole('dialog', { name: 'Add a child' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Add a child' })).toBeInTheDocument()
  })

  it('gives its close button an accessible name', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await openModal(user)

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})

describe('Modal: it must not disappear after opening (regression)', () => {
  it('is still open well after the open animation has finished', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await openModal(user)

    // The old bug removed the modal a moment after it appeared.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('stays open while the page keeps updating its own state', async () => {
    const user = userEvent.setup()

    // Mimics a page that loads something as soon as the modal opens.
    function Busy() {
      const [open, setOpen] = useState(false)
      const [ticks, setTicks] = useState(0)

      useEffect(() => {
        if (!open) return undefined
        const timer = setInterval(() => setTicks((n) => n + 1), 30)
        return () => clearInterval(timer)
      }, [open])

      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open modal
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Loading things">
            <p>Updates so far: {ticks}</p>
          </Modal>
        </div>
      )
    }

    render(<Busy />)
    await openModal(user)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Updates so far: [1-9]/)).toBeInTheDocument()
  })

  it('keeps what the user typed when the page re-renders', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await openModal(user)

    await user.type(screen.getByLabelText('Name'), 'Mia')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Mia')
  })

  it('shows new content when the page changes it while open', async () => {
    const user = userEvent.setup()

    function Changing() {
      const [open, setOpen] = useState(false)
      const [count, setCount] = useState(0)

      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open modal
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Counter">
            <button type="button" onClick={() => setCount((n) => n + 1)}>
              Add one
            </button>
            <p>Count: {count}</p>
          </Modal>
        </div>
      )
    }

    render(<Changing />)
    await openModal(user)

    await user.click(screen.getByRole('button', { name: 'Add one' }))
    await user.click(screen.getByRole('button', { name: 'Add one' }))

    expect(screen.getByText('Count: 2')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Modal: closing', () => {
  it('closes with its close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await openModal(user)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitForClosed()
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await openModal(user)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitForClosed()
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const dialog = await openModal(user)

    // The backdrop is the dialog's parent layer.
    await user.pointer({ keys: '[MouseLeft]', target: dialog.parentElement })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitForClosed()
  })

  it('does not close when the user clicks inside the dialog', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const dialog = await openModal(user)

    await user.click(dialog)
    await user.click(screen.getByLabelText('Name'))
    await user.click(screen.getByRole('heading', { name: 'Edit contact' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('cannot be closed while busy (a save is running)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness busy onClose={onClose} />)
    const dialog = await openModal(user)

    await user.keyboard('{Escape}')
    await user.pointer({ keys: '[MouseLeft]', target: dialog.parentElement })

    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Modal: focus', () => {
  it('moves focus into the dialog, onto its first field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await openModal(user)

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())
  })

  it('focuses the dialog itself when it has no field', async () => {
    const user = userEvent.setup()
    render(
      <Harness>
        <p>Just reading</p>
      </Harness>
    )
    const dialog = await openModal(user)

    await waitFor(() => expect(dialog).toHaveFocus())
  })

  it('keeps Tab inside the dialog (forwards)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const dialog = await openModal(user)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())

    // Name -> Save -> Close? Whatever the order, ten Tabs never leave the dialog.
    for (let i = 0; i < 10; i += 1) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement)
    }
    expect(screen.getByRole('button', { name: 'Other page button' })).not.toHaveFocus()
  })

  it('keeps Shift+Tab inside the dialog (backwards)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const dialog = await openModal(user)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())

    for (let i = 0; i < 10; i += 1) {
      await user.tab({ shift: true })
      expect(dialog).toContainElement(document.activeElement)
    }
  })

  it('returns focus to the button that opened it when it closes', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open modal' })

    await openModal(user)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())

    await user.keyboard('{Escape}')
    await waitForClosed()

    // Focus goes back in the same cleanup step, just after the dialog is removed.
    await waitFor(() => expect(opener).toHaveFocus())
  })
})

describe('Modal: page scrolling', () => {
  it('locks the page scroll while open and restores it afterwards', async () => {
    const user = userEvent.setup()
    document.body.style.overflow = 'auto'
    render(<Harness />)

    expect(document.body.style.overflow).toBe('auto')

    await openModal(user)
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    await waitForClosed()
    // The page's scroll is handed back by an effect cleanup that runs just after
    // the dialog leaves the DOM, so wait for it instead of checking at that instant.
    await waitFor(() => expect(document.body.style.overflow).toBe('auto'))
  })

  it('restores the page scroll if the page leaves while the modal is open', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness />)
    await openModal(user)
    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'))
  })
})
