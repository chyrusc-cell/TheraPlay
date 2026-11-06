import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardSkeleton, ProfileSkeleton, ProgressSkeleton } from './PageSkeletons.jsx'
import { ActivityCardsSkeleton, ContactCardsSkeleton } from './Skeleton.jsx'

describe('page skeletons', () => {
  it.each([
    ['Progress', ProgressSkeleton, 'Loading your progress...', 4],
    ['Dashboard', DashboardSkeleton, 'Loading your dashboard...', 4],
    ['Profile', ProfileSkeleton, 'Loading your profile...', 4],
  ])('%s announces one loading status and mirrors the page cards', (_name, Skeleton, label, cards) => {
    const { container } = render(<Skeleton />)

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent(label)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('.card-soft.rounded-xl').length).toBeGreaterThanOrEqual(cards)
    // Shapes only: no text content other than the screen-reader label.
    expect(container.querySelector('[aria-hidden="true"]').textContent).toBe('')
  })
})

describe('skeletons follow the current pages', () => {
  it('Progress shows one Skills Practiced row for each of the six categories', () => {
    const { container } = render(<ProgressSkeleton />)

    // Each row ends in a thin bar track (h-2).
    expect(container.querySelectorAll('.h-2.rounded-lg')).toHaveLength(6)
  })

  it('Dashboard streak shows seven square-cornered day boxes, and its buttons are not pills', () => {
    const { container } = render(<DashboardSkeleton />)

    expect(container.querySelectorAll('.h-9.flex-1.rounded-md')).toHaveLength(7)
    expect(container.querySelector('.h-10.rounded-xl')).not.toBeNull()
    expect(container.querySelector('.h-10.rounded-full')).toBeNull()
  })

  it('Activities shows the three filters, and Contact cards show a picture and the shadow-safe padding', () => {
    const activities = render(<ActivityCardsSkeleton count={1} />)
    expect(activities.container.querySelectorAll('.rounded-full')).toHaveLength(3)
    activities.unmount()

    const contacts = render(<ContactCardsSkeleton count={2} />)
    expect(contacts.container.querySelectorAll('.glass-stack')).toHaveLength(2)
    expect(contacts.container.querySelectorAll('.rounded-full')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveClass('px-1.5', 'pb-3')
  })
})
