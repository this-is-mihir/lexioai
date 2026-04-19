import Skeleton from 'react-loading-skeleton'
import { SkeletonTheme } from 'react-loading-skeleton'
import MuiSkeleton from '@mui/material/Skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

const cards = (count, render) => Array.from({ length: count }, (_, i) => render(i))

function RouteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <MuiSkeleton variant="rounded" width={160} height={34} sx={{ borderRadius: '12px' }} />
          <MuiSkeleton variant="rounded" width={120} height={34} sx={{ borderRadius: '12px' }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="card hidden p-4 lg:block">
          <MuiSkeleton variant="rounded" height={42} sx={{ borderRadius: '12px', mb: 2 }} />
          {cards(6, (i) => <MuiSkeleton key={i} variant="rounded" height={34} sx={{ borderRadius: '10px', mb: 1.2 }} />)}
        </div>

        <div className="space-y-4">
          <div className="card p-5 sm:p-6">
            <MuiSkeleton variant="rounded" width={110} height={16} sx={{ borderRadius: '8px' }} />
            <div className="mt-3 max-w-xl">
              <Skeleton height={34} />
            </div>
            <div className="mt-3 max-w-2xl">
              <Skeleton count={2} height={14} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards(4, (i) => (
              <div key={i} className="card p-4">
                <MuiSkeleton variant="circular" width={26} height={26} />
                <div className="mt-3">
                  <Skeleton width="65%" height={12} />
                </div>
                <div className="mt-2">
                  <Skeleton width="45%" height={26} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-xl space-y-2">
            <MuiSkeleton variant="rounded" width={96} height={14} sx={{ borderRadius: '8px' }} />
            <Skeleton height={34} />
            <Skeleton count={2} height={14} />
          </div>
          <MuiSkeleton variant="rounded" width={150} height={40} sx={{ borderRadius: '12px' }} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {cards(3, (i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
              <Skeleton width="55%" height={12} />
              <div className="mt-2">
                <Skeleton width="38%" height={24} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards(4, (i) => (
          <div key={i} className="card p-4">
            <Skeleton width="58%" height={12} />
            <div className="mt-3">
              <Skeleton width="42%" height={26} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <Skeleton width="42%" height={14} />
          <MuiSkeleton variant="rounded" height={288} sx={{ borderRadius: '12px', mt: 2 }} />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {cards(3, (i) => <MuiSkeleton key={i} variant="rounded" height={68} sx={{ borderRadius: '10px' }} />)}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <Skeleton width={96} height={14} />
            <Skeleton width={58} height={12} />
          </div>
          <div className="mt-4 space-y-3">
            {cards(4, (i) => <MuiSkeleton key={i} variant="rounded" height={64} sx={{ borderRadius: '10px' }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function BotsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-md space-y-2">
          <Skeleton width="45%" height={30} />
          <Skeleton width="90%" height={14} />
        </div>
        <MuiSkeleton variant="rounded" width={132} height={40} sx={{ borderRadius: '12px' }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards(4, (i) => (
          <div key={i} className="card p-4">
            <Skeleton width="58%" height={12} />
            <div className="mt-2">
              <Skeleton width="42%" height={26} />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '12px' }} />
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '12px' }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards(6, (i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full max-w-[70%] space-y-2">
                <Skeleton height={18} />
                <Skeleton width="85%" height={12} />
              </div>
              <MuiSkeleton variant="rounded" width={66} height={24} sx={{ borderRadius: '999px' }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MuiSkeleton variant="rounded" height={54} sx={{ borderRadius: '10px' }} />
              <MuiSkeleton variant="rounded" height={54} sx={{ borderRadius: '10px' }} />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton height={12} />
              <Skeleton height={12} width="78%" />
            </div>
            <div className="mt-4 flex gap-2">
              <MuiSkeleton variant="rounded" height={38} sx={{ borderRadius: '10px', flex: 1 }} />
              <MuiSkeleton variant="rounded" height={38} sx={{ borderRadius: '10px', flex: 1 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-xl space-y-2">
            <MuiSkeleton variant="rounded" width={86} height={14} sx={{ borderRadius: '8px' }} />
            <Skeleton width="70%" height={32} />
            <Skeleton width="95%" height={14} />
          </div>
          <div className="flex gap-2">
            <MuiSkeleton variant="rounded" width={176} height={40} sx={{ borderRadius: '12px' }} />
            <MuiSkeleton variant="rounded" width={144} height={40} sx={{ borderRadius: '12px' }} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards(3, (i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
              <Skeleton width="58%" height={12} />
              <div className="mt-2">
                <Skeleton width="40%" height={22} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards(4, (i) => <MuiSkeleton key={i} variant="rounded" height={120} sx={{ borderRadius: '16px' }} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cards(2, (i) => (
          <div key={i} className="card p-5">
            <Skeleton width="45%" height={14} />
            <MuiSkeleton variant="rounded" height={288} sx={{ borderRadius: '12px', mt: 2 }} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <Skeleton width="36%" height={14} />
          <div className="mt-3 space-y-2">
            {cards(6, (i) => <MuiSkeleton key={i} variant="rounded" height={52} sx={{ borderRadius: '10px' }} />)}
          </div>
        </div>
        <div className="card p-5">
          <Skeleton width="32%" height={14} />
          <MuiSkeleton variant="rounded" height={288} sx={{ borderRadius: '12px', mt: 2 }} />
        </div>
      </div>
    </div>
  )
}

function BillingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-xl space-y-2">
            <MuiSkeleton variant="rounded" width={72} height={14} sx={{ borderRadius: '8px' }} />
            <Skeleton width="78%" height={32} />
            <Skeleton width="96%" height={14} />
          </div>
          <MuiSkeleton variant="rounded" width={140} height={62} sx={{ borderRadius: '12px' }} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards(3, (i) => <MuiSkeleton key={i} variant="rounded" height={74} sx={{ borderRadius: '12px' }} />)}
        </div>
      </div>

      <MuiSkeleton variant="rounded" height={92} sx={{ borderRadius: '16px' }} />

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <Skeleton width={60} height={14} />
          <MuiSkeleton variant="rounded" width={132} height={34} sx={{ borderRadius: '12px' }} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '12px' }} />
          <MuiSkeleton variant="rounded" width={122} height={40} sx={{ borderRadius: '12px' }} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {cards(3, (i) => <MuiSkeleton key={i} variant="rounded" height={260} sx={{ borderRadius: '16px' }} />)}
        </div>
      </div>

      <div className="card p-5">
        <Skeleton width={124} height={14} />
        <Skeleton width="56%" height={12} />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {cards(3, (i) => <MuiSkeleton key={i} variant="rounded" height={156} sx={{ borderRadius: '16px' }} />)}
        </div>
      </div>
    </div>
  )
}

function BotDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton width={220} height={32} />
          <div className="flex gap-2">
            <MuiSkeleton variant="rounded" width={66} height={24} sx={{ borderRadius: '999px' }} />
            <MuiSkeleton variant="rounded" width={82} height={24} sx={{ borderRadius: '999px' }} />
          </div>
        </div>
        <div className="flex gap-2">
          <MuiSkeleton variant="rounded" width={112} height={40} sx={{ borderRadius: '12px' }} />
          <MuiSkeleton variant="rounded" width={100} height={40} sx={{ borderRadius: '12px' }} />
        </div>
      </div>

      <div className="card p-0">
        <div className="px-5 pt-5">
          <div className="flex gap-2">
            {cards(6, (i) => <MuiSkeleton key={i} variant="rounded" width={96} height={34} sx={{ borderRadius: '10px' }} />)}
          </div>
        </div>
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards(4, (i) => <MuiSkeleton key={i} variant="rounded" height={100} sx={{ borderRadius: '12px' }} />)}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {cards(2, (i) => <MuiSkeleton key={i} variant="rounded" height={220} sx={{ borderRadius: '16px' }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConversationsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-xl space-y-2">
            <MuiSkeleton variant="rounded" width={110} height={14} sx={{ borderRadius: '8px' }} />
            <Skeleton width="64%" height={32} />
            <Skeleton width="92%" height={14} />
          </div>
          <MuiSkeleton variant="rounded" width={220} height={40} sx={{ borderRadius: '12px' }} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards(3, (i) => <MuiSkeleton key={i} variant="rounded" height={74} sx={{ borderRadius: '12px' }} />)}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton width={110} height={24} />
          <Skeleton width={260} height={12} />
        </div>
        <MuiSkeleton variant="rounded" width={320} height={40} sx={{ borderRadius: '12px' }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-0 lg:col-span-1">
          <div className="max-h-[72vh] space-y-0.5 overflow-hidden p-2">
            {cards(8, (i) => <MuiSkeleton key={i} variant="rounded" height={72} sx={{ borderRadius: '10px' }} />)}
          </div>
        </div>
        <div className="card p-4 lg:col-span-2">
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '10px' }} />
          <div className="mt-4 space-y-3">
            {cards(6, (i) => <MuiSkeleton key={i} variant="rounded" height={56} sx={{ borderRadius: '14px' }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeadsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton width={90} height={30} />
          <Skeleton width={280} height={12} />
        </div>
        <MuiSkeleton variant="rounded" width={120} height={40} sx={{ borderRadius: '12px' }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards(4, (i) => <MuiSkeleton key={i} variant="rounded" height={96} sx={{ borderRadius: '16px' }} />)}
      </div>

      <div className="card p-4">
        <Skeleton width={130} height={12} />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '12px' }} />
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '12px' }} />
          <MuiSkeleton variant="rounded" height={40} sx={{ borderRadius: '12px' }} />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="space-y-1 p-2">
          <MuiSkeleton variant="rounded" height={42} sx={{ borderRadius: '8px' }} />
          {cards(7, (i) => <MuiSkeleton key={i} variant="rounded" height={56} sx={{ borderRadius: '8px' }} />)}
        </div>
      </div>
    </div>
  )
}

function LandingSkeleton() {
  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MuiSkeleton variant="rounded" width={36} height={36} sx={{ borderRadius: '10px' }} />
            <Skeleton width={90} height={16} />
          </div>
          <div className="hidden gap-2 lg:flex">
            {cards(5, (i) => <MuiSkeleton key={i} variant="rounded" width={76} height={34} sx={{ borderRadius: '10px' }} />)}
          </div>
          <div className="flex gap-2">
            <MuiSkeleton variant="rounded" width={86} height={34} sx={{ borderRadius: '10px' }} />
            <MuiSkeleton variant="rounded" width={108} height={34} sx={{ borderRadius: '10px' }} />
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-3">
            <MuiSkeleton variant="rounded" width={120} height={16} sx={{ borderRadius: '8px' }} />
            <Skeleton height={40} />
            <Skeleton height={40} width="88%" />
            <Skeleton count={2} height={14} />
            <div className="pt-2 flex gap-2">
              <MuiSkeleton variant="rounded" width={146} height={40} sx={{ borderRadius: '12px' }} />
              <MuiSkeleton variant="rounded" width={124} height={40} sx={{ borderRadius: '12px' }} />
            </div>
          </div>
          <MuiSkeleton variant="rounded" height={320} sx={{ borderRadius: '18px' }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards(3, (i) => <MuiSkeleton key={i} variant="rounded" height={180} sx={{ borderRadius: '16px' }} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {cards(4, (i) => <MuiSkeleton key={i} variant="rounded" height={210} sx={{ borderRadius: '16px' }} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cards(2, (i) => <MuiSkeleton key={i} variant="rounded" height={250} sx={{ borderRadius: '16px' }} />)}
      </div>
    </div>
  )
}

function GenericSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card p-5 sm:p-6">
        <MuiSkeleton variant="rounded" width={120} height={16} sx={{ borderRadius: '8px' }} />
        <div className="mt-3 max-w-lg">
          <Skeleton height={30} />
        </div>
        <div className="mt-3 max-w-2xl">
          <Skeleton count={2} height={14} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards(4, (i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
              <MuiSkeleton variant="text" width={92} height={16} />
              <Skeleton width="45%" height={24} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards(6, (i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full max-w-[70%]">
                <Skeleton height={18} />
              </div>
              <MuiSkeleton variant="rounded" width={64} height={24} sx={{ borderRadius: '999px' }} />
            </div>
            <div className="mt-2">
              <Skeleton width="80%" height={12} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MuiSkeleton variant="rounded" height={54} sx={{ borderRadius: '10px' }} />
              <MuiSkeleton variant="rounded" height={54} sx={{ borderRadius: '10px' }} />
            </div>
            <div className="mt-4 flex gap-2">
              <MuiSkeleton variant="rounded" height={38} sx={{ borderRadius: '10px', flex: 1 }} />
              <MuiSkeleton variant="rounded" height={38} sx={{ borderRadius: '10px', flex: 1 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Loader({ label = 'Loading...', mode = 'page', variant = 'generic' }) {
  const activeVariant = variant === 'generic' && mode === 'route' ? 'route' : variant

  const wrapperClass = activeVariant === 'route' ? 'min-h-screen bg-[var(--bg)] p-4 sm:p-6' : 'w-full'

  const renderSkeleton = () => {
    if (activeVariant === 'route') return <RouteSkeleton />
    if (activeVariant === 'dashboard') return <DashboardSkeleton />
    if (activeVariant === 'bots') return <BotsSkeleton />
    if (activeVariant === 'analytics') return <AnalyticsSkeleton />
    if (activeVariant === 'billing') return <BillingSkeleton />
    if (activeVariant === 'botDetail') return <BotDetailSkeleton />
    if (activeVariant === 'conversations') return <ConversationsSkeleton />
    if (activeVariant === 'leads') return <LeadsSkeleton />
    if (activeVariant === 'landing') return <LandingSkeleton />
    return <GenericSkeleton />
  }

  return (
    <SkeletonTheme baseColor="var(--bg-soft)" highlightColor="var(--bg-card)">
      <div className={wrapperClass} aria-busy="true" aria-live="polite">
        <span className="sr-only">{label}</span>
        {renderSkeleton()}
      </div>
    </SkeletonTheme>
  )
}
