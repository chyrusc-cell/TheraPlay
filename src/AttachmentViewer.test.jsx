import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ActivityDetails from './ActivityDetails.jsx'
import ActivityPicture from './ActivityPicture.jsx'
import AttachmentViewer from './AttachmentViewer.jsx'
import { previewKind } from './attachmentTypes.js'
import { API_URL } from './api.js'
import { mockApi } from './test/helpers.jsx'

vi.mock('./minLoading.js', () => ({ holdSkeleton: () => Promise.resolve() }))

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

// A fake file download: the viewer reads it with blob() or text().
function stubDownload({ status = 200, body = 'file', type = 'text/plain' } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    blob: async () => new Blob([body], { type }),
    text: async () => body,
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderViewer(resource, props = {}) {
  const onClose = vi.fn()
  const onDownload = vi.fn()
  render(<AttachmentViewer activityId={5} resource={resource} onClose={onClose} onDownload={onDownload} {...props} />)
  return { onClose, onDownload }
}

describe('attachment types', () => {
  it('previews images, PDF and TXT only; Office files are download-only', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) expect(previewKind(type)).toBe('image')
    expect(previewKind('application/pdf')).toBe('pdf')
    expect(previewKind('text/plain')).toBe('text')
    for (const type of [DOCX, XLSX, PPTX]) expect(previewKind(type)).toBeNull()
  })

  it('never previews HTML, SVG, scripts or unknown types', () => {
    for (const type of ['text/html', 'image/svg+xml', 'application/javascript', 'application/x-msdownload', 'application/octet-stream', undefined]) {
      expect(previewKind(type)).toBeNull()
    }
  })
})

describe('AttachmentViewer', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])('shows a %s inside the dialog', async (type) => {
    const fetchMock = stubDownload({ type })
    renderViewer({ id: 3, file_name: 'picture.file', file_type: type })

    const image = await screen.findByRole('img', { name: 'picture.file' })
    expect(image).toHaveAttribute('src', 'blob:preview')
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/activities/5/resources/3/download`, expect.anything())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a PDF in an embedded viewer with a Download fallback', async () => {
    stubDownload({ type: 'application/pdf' })
    const { onDownload } = renderViewer({ id: 4, file_name: 'guide.pdf', file_type: 'application/pdf' })

    const frame = await screen.findByTitle('Preview of guide.pdf')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame).toHaveAttribute('src', 'blob:preview')

    await userEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }))
  })

  it('shows text as plain, scrollable text and never as HTML', async () => {
    stubDownload({ body: '<script>alert(1)</script><b>bold</b>\nsecond line' })
    renderViewer({ id: 6, file_name: 'notes.txt', file_type: 'text/plain' })

    const text = await screen.findByLabelText('Contents of notes.txt')
    expect(text.tagName).toBe('PRE')
    expect(text.textContent).toContain('<script>alert(1)</script><b>bold</b>')
    expect(text.querySelector('script, b')).toBeNull()
  })

  it('says so when the file is gone, and when the preview fails, but keeps Download', async () => {
    stubDownload({ status: 404 })
    const first = renderViewer({ id: 7, file_name: 'gone.pdf', file_type: 'application/pdf' })
    expect(await screen.findByText('This file is no longer available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(first.onClose).not.toHaveBeenCalled()
  })

  it('shows an error for a server failure', async () => {
    stubDownload({ status: 500 })
    renderViewer({ id: 8, file_name: 'a.png', file_type: 'image/png' })
    expect(await screen.findByText(/preview could not be loaded/i)).toBeInTheDocument()
  })

  it('closes with the Close button and with Escape', async () => {
    stubDownload()
    const { onClose } = renderViewer({ id: 9, file_name: 'n.txt', file_type: 'text/plain' })
    await screen.findByLabelText('Contents of n.txt')

    await userEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' }).at(-1))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(onClose.mock.calls.length).toBeGreaterThan(1))
  })

  it('releases the preview file when it closes', async () => {
    stubDownload({ type: 'image/png' })
    const { unmount } = render(
      <AttachmentViewer activityId={5} resource={{ id: 3, file_name: 'a.png', file_type: 'image/png' }} onClose={() => {}} onDownload={() => {}} />
    )
    await screen.findByRole('img', { name: 'a.png' })
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})

describe('Activity details: attachment rows', () => {
  const resources = [
    { id: 1, file_name: 'guide.pdf', file_type: 'application/pdf' },
    { id: 2, file_name: 'plan.docx', file_type: DOCX },
    { id: 3, file_name: 'budget.xlsx', file_type: XLSX },
    { id: 4, file_name: 'deck.pptx', file_type: PPTX },
    { id: 5, file_name: 'photo.webp', file_type: 'image/webp' },
    { id: 6, file_name: 'notes.txt', file_type: 'text/plain' },
  ]

  async function open() {
    mockApi({
      'GET /activities/5': {
        body: {
          data: {
            id: 5, title: 'Card Game', category: 'Sensory', difficulty: 'Easy', description: 'd', objective: 'o',
            instructions: ['Go'], materials: [], resources, image_url: null, attachment_image_url: null,
          },
        },
      },
    })

    render(
      <MemoryRouter initialEntries={['/activities/5']}>
        <ActivityDetails activityId="5" embedded />
      </MemoryRouter>
    )

    await screen.findByText(/guide.pdf · PDF document/)
  }

  it('shows each file name and type, with View only for previewable files', async () => {
    await open()

    expect(screen.getByText(/guide\.pdf · PDF document/)).toBeInTheDocument()
    expect(screen.getByText(/plan\.docx · Word document/)).toBeInTheDocument()

    for (const name of ['guide.pdf', 'photo.webp', 'notes.txt']) {
      expect(screen.getByRole('button', { name: `View ${name}` })).toBeInTheDocument()
    }
    for (const name of ['plan.docx', 'budget.xlsx', 'deck.pptx']) {
      expect(screen.queryByRole('button', { name: `View ${name}` })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Download ${name}` })).toBeInTheDocument()
    }
  })

  it('previewable files get an icon-only Download beside View; download-only files keep a labeled button', async () => {
    await open()

    const view = screen.getByRole('button', { name: 'View guide.pdf' })
    const icon = screen.getByRole('button', { name: 'Download guide.pdf' })
    expect(icon).toHaveAttribute('title', 'Download guide.pdf')
    expect(icon).toHaveTextContent('')
    expect(icon.previousElementSibling).toBe(view)

    expect(screen.getByRole('button', { name: 'Download plan.docx' })).toHaveTextContent('Download plan.docx')
  })

  it('opens the preview in a dialog', async () => {
    await open()
    const fetchMock = stubDownload({ body: 'hello notes' })

    await userEvent.click(screen.getByRole('button', { name: 'View notes.txt' }))

    expect(await screen.findByLabelText('Contents of notes.txt')).toHaveTextContent('hello notes')
    expect(fetchMock).toHaveBeenCalled()
  })
})

describe('ActivityPicture: card image priority', () => {
  const placeholder = <div data-testid="placeholder" />
  const show = (urls) => render(<ActivityPicture urls={urls} alt="card" className="c" fallback={placeholder} />)

  it('uses the dedicated picture when it exists, even if an attached image exists too', () => {
    show(['/dedicated.png', '/attached.png'])
    expect(screen.getByRole('img')).toHaveAttribute('src', '/dedicated.png')
  })

  it('uses the attached image when there is no dedicated picture', () => {
    show([null, '/attached.png'])
    expect(screen.getByRole('img')).toHaveAttribute('src', '/attached.png')
  })

  it('uses the placeholder when neither exists', () => {
    show([null, null])
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('placeholder')).toBeInTheDocument()
  })

  it('falls back step by step when files fail to load, never leaving a broken image', () => {
    show(['/dedicated.png', '/attached.png'])

    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByRole('img')).toHaveAttribute('src', '/attached.png')

    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('placeholder')).toBeInTheDocument()
  })

  it('still supports a single url', () => {
    render(<ActivityPicture url="/one.png" alt="card" fallback={placeholder} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/one.png')
  })
})
