import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardSkeleton, ProfileSkeleton, ProgressSkeleton } from './PageSkeletons.jsx'

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
