import { SkeletonBlock, SkeletonStatus } from './Skeleton.jsx';

// Page skeletons that follow the real page layout: the same grids, card paddings
// and block heights as the loaded pages (Progress, Dashboard, Profile), so
// nothing jumps when the content arrives. Like the other skeletons they show
// SHAPES, never fake data, and are announced once as a "loading" status.

// The big card of Dashboard / Progress / Profile (matches those pages' cards).
const statCard =
    'min-w-0 overflow-hidden rounded-xl border border-edge bg-white p-[30px] card-soft';

// Page title (+ optional subtitle), at the real heading size.
function HeadingSkeleton({ subtitle = true }) {
    return (
        <div className="mb-8">
            <SkeletonBlock className="h-[43px] w-[260px] max-w-full phone:h-[34px]" />
            {subtitle && <SkeletonBlock className="mt-2 h-[18px] w-[200px] max-w-full" />}
        </div>
    );
}

// A row of two small stat tiles (label, number).
function StatTilesSkeleton() {
    return (
        <div className="flex gap-4">
            {[0, 1].map((index) => (
                <div className="flex flex-1 flex-col gap-2 rounded-lg border card-soft p-4" key={index}>
                    <SkeletonBlock className="h-3 w-3/4" />
                    <SkeletonBlock className="h-[22px] w-1/3" />
                </div>
            ))}
        </div>
    );
}

// A list row: round icon + two lines.
function ListRowSkeleton() {
    return (
        <div className="flex items-start gap-3 rounded-lg border card-soft p-4">
            <SkeletonBlock className="h-6 w-6 shrink-0 rounded-full" />
            <div className="flex-1">
                <SkeletonBlock className="mb-2 h-[13px] w-3/5" />
                <SkeletonBlock className="h-3 w-4/5" />
            </div>
        </div>
    );
}

// My Progress: heading + the 2 x 2 grid (Weekly Participation, Activity Trend,
// Skills Practiced, Recent Activity), in the same order as the real page.
export function ProgressSkeleton() {
    return (
        <SkeletonStatus label="Loading your progress...">
            <HeadingSkeleton />

            <div className="grid grid-cols-2 gap-6 tablet:grid-cols-1">
                <div className={`${statCard} order-1`}>
                    <SkeletonBlock className="mb-6 h-4 w-2/5" />
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div className="flex-1">
                            <SkeletonBlock className="mb-2 h-[34px] w-12" />
                            <SkeletonBlock className="h-3 w-3/4" />
                        </div>
                        <div className="flex flex-1 flex-col items-end">
                            <SkeletonBlock className="mb-2 h-[34px] w-14" />
                            <SkeletonBlock className="h-3 w-3/4" />
                        </div>
                    </div>
                    <SkeletonBlock className="mb-6 h-3 w-full rounded-lg" />
                    <StatTilesSkeleton />
                </div>

                <div className={`${statCard} order-2 tablet:order-3`}>
                    <SkeletonBlock className="mb-6 h-4 w-1/3" />
                    <div className="mb-[30px] flex items-center justify-between gap-4">
                        <SkeletonBlock className="h-3 w-1/2" />
                        <SkeletonBlock className="h-6 w-[70px] rounded-xl" />
                    </div>
                    <div className="flex h-40 items-end justify-between pt-5">
                        {[55, 30, 80, 20, 65, 40, 25].map((height, index) => (
                            <div className="flex h-full flex-col items-center justify-end gap-3" key={index}>
                                <SkeletonBlock className="w-6 rounded-t-md" style={{ height: `${height}%` }} />
                                <SkeletonBlock className="h-[11px] w-9" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`${statCard} order-3 tablet:order-2`}>
                    <SkeletonBlock className="mb-6 h-4 w-2/5" />
                    {[0, 1, 2].map((index) => (
                        <div className="mb-5 last:mb-0" key={index}>
                            <div className="mb-2 flex items-center justify-between gap-4">
                                <SkeletonBlock className="h-3.5 w-1/3" />
                                <SkeletonBlock className="h-3 w-1/4" />
                            </div>
                            <SkeletonBlock className="h-2 w-full rounded-lg" />
                        </div>
                    ))}
                </div>

                <div className={`${statCard} order-4`}>
                    <SkeletonBlock className="mb-6 h-4 w-2/5" />
                    <SkeletonBlock className="mb-2 h-[29px] w-12" />
                    <SkeletonBlock className="mb-5 h-3 w-1/2" />
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2].map((index) => (
                            <ListRowSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </div>
        </SkeletonStatus>
    );
}

// Dashboard: greeting, the two top cards (recommended activity, streak with its
// seven day circles) and the two lower cards (summary, recent activities).
export function DashboardSkeleton() {
    return (
        <SkeletonStatus label="Loading your dashboard...">
            <div className="mb-8">
                <SkeletonBlock className="h-[43px] w-[320px] max-w-full phone:h-[34px]" />
                <SkeletonBlock className="mt-2 h-4 w-[180px] max-w-full" />
            </div>

            <div className="mb-6 grid grid-cols-2 gap-6 tablet-sm:grid-cols-1">
                <div className={statCard}>
                    <SkeletonBlock className="mb-5 h-4 w-3/5" />
                    <SkeletonBlock className="mb-3 h-6 w-1/2" />
                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-5 h-3.5 w-4/5" />
                    <SkeletonBlock className="h-10 w-[150px] rounded-full" />
                </div>

                <div className={statCard}>
                    <SkeletonBlock className="mb-5 h-4 w-1/4" />
                    <SkeletonBlock className="mb-2 h-7 w-10" />
                    <SkeletonBlock className="mb-5 h-3 w-1/2" />
                    <div className="flex gap-2">
                        {Array.from({ length: 7 }, (_, index) => (
                            <SkeletonBlock className="h-9 flex-1 rounded-full" key={index} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 laptop:grid-cols-1">
                <div className={statCard}>
                    <SkeletonBlock className="mb-5 h-4 w-2/5" />
                    <div className="mb-5 flex gap-4 tablet-sm:flex-col">
                        {[0, 1].map((index) => (
                            <div className="flex-1 rounded-lg border card-soft p-5" key={index}>
                                <SkeletonBlock className="mb-3 h-3 w-3/4" />
                                <SkeletonBlock className="mb-2 h-6 w-10" />
                                <SkeletonBlock className="h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                    <SkeletonBlock className="h-4 w-1/3" />
                </div>

                <div className={statCard}>
                    <SkeletonBlock className="mb-5 h-4 w-1/3" />
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2].map((index) => (
                            <ListRowSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </div>
        </SkeletonStatus>
    );
}

// My Profile: heading, the avatar card, then the Personal Information, children
// and Password cards.
export function ProfileSkeleton() {
    return (
        <SkeletonStatus label="Loading your profile...">
            <div className="mb-8">
                <SkeletonBlock className="h-[43px] w-[220px] max-w-full phone:h-[34px]" />
            </div>

            <div className={`${statCard} mb-6 flex items-center gap-6 phone:flex-col phone:items-start`}>
                <SkeletonBlock className="h-20 w-20 shrink-0 rounded-full" />
                <div className="w-full flex-1">
                    <SkeletonBlock className="mb-2 h-[29px] w-2/5" />
                    <SkeletonBlock className="mb-4 h-4 w-1/5" />
                    <div className="flex gap-2">
                        <SkeletonBlock className="h-8 w-28 rounded-full" />
                        <SkeletonBlock className="h-8 w-28 rounded-full" />
                    </div>
                </div>
            </div>

            <div className={`${statCard} mb-6`}>
                <SkeletonBlock className="mb-[30px] h-[22px] w-1/3" />
                {[0, 1, 2].map((index) => (
                    <div className="mb-[18px] flex flex-col gap-2" key={index}>
                        <SkeletonBlock className="h-3 w-24" />
                        <SkeletonBlock className="h-11 w-full rounded-xl" />
                    </div>
                ))}
                <SkeletonBlock className="mt-6 h-10 w-36 rounded-full" />
            </div>

            <div className={`${statCard} mb-6`}>
                <SkeletonBlock className="mb-5 h-[22px] w-1/4" />
                <div className="flex flex-col gap-3">
                    {[0, 1].map((index) => (
                        <ListRowSkeleton key={index} />
                    ))}
                </div>
            </div>

            <div className={`${statCard} mb-6`}>
                <SkeletonBlock className="mb-3 h-[22px] w-1/4" />
                <SkeletonBlock className="mb-4 h-3.5 w-3/5" />
                <SkeletonBlock className="h-10 w-44 rounded-full" />
            </div>
        </SkeletonStatus>
    );
}
