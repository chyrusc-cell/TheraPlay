import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ActivityPicture from './ActivityPicture.jsx'

const PDF_THUMB = 'http://api.test/api/activities/3/resources/7/thumbnail'
const IMAGE = 'http://api.test/api/activities/4/resources/8/download'

const show = (urls) =>
  render(
    <ActivityPicture
      urls={urls}
      alt="Picture of Sample"
      className="h-[180px] w-full object-cover"
      fallback={<div data-testid="placeholder">placeholder</div>}
    />
  )

describe('ActivityPicture: card pictures from attachments', () => {
  it('shows the first page of a PDF cropped from the top, so the worksheet title stays readable', () => {
    show([null, PDF_THUMB, null])

    const img = screen.getByAltText('Picture of Sample')
    expect(img).toHaveAttribute('src', PDF_THUMB)
    expect(img).toHaveClass('object-cover', 'object-top')
  })

  it('uses an attached image as it is (centre crop, no top alignment)', () => {
    show([null, IMAGE])

    const img = screen.getByAltText('Picture of Sample')
    expect(img).toHaveAttribute('src', IMAGE)
    expect(img).not.toHaveClass('object-top')
  })

  it('prefers the dedicated picture over the attachment picture', () => {
    show(['http://api.test/api/activities/3/image', PDF_THUMB])

    expect(screen.getByAltText('Picture of Sample')).toHaveAttribute('src', 'http://api.test/api/activities/3/image')
  })

  it('falls back to the next picture, then to the placeholder, when images fail to load (never a broken icon)', () => {
    show([PDF_THUMB, IMAGE])

    fireEvent.error(screen.getByAltText('Picture of Sample'))
    expect(screen.getByAltText('Picture of Sample')).toHaveAttribute('src', IMAGE)

    fireEvent.error(screen.getByAltText('Picture of Sample'))
    expect(screen.queryByAltText('Picture of Sample')).not.toBeInTheDocument()
    expect(screen.getByTestId('placeholder')).toBeInTheDocument()
  })

  it('shows the placeholder when there is no picture at all (for example a thumbnail that could not be made)', () => {
    show([null, null, null])

    expect(screen.getByTestId('placeholder')).toBeInTheDocument()
  })

  it('does not try the same address twice when two fields point at it', () => {
    show([null, IMAGE, IMAGE])

    fireEvent.error(screen.getByAltText('Picture of Sample'))
    expect(screen.getByTestId('placeholder')).toBeInTheDocument()
  })
})
