import { cn } from '@/lib/utils'

type DecorVariant = 'hero' | 'platform' | 'differentiator' | 'footer'

const dotPattern =
  'bg-[radial-gradient(circle,rgba(138,196,65,0.22)_1px,transparent_1px)] [background-size:14px_14px]'

export function SectionDecor({
  variant = 'hero',
  className,
}: {
  variant?: DecorVariant
  className?: string
}) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {/* Soft organic blobs */}
      {variant === 'hero' && (
        <>
          <div className="absolute -left-24 top-1/4 size-[480px] rounded-full bg-[#d4e8c8]/50 blur-3xl" />
          <div className="absolute -right-16 bottom-0 size-96 rounded-full bg-[#8ac441]/15 blur-3xl" />
          <div className="absolute left-1/3 top-0 size-64 rounded-full bg-[#e8f0e4]/80 blur-2xl" />
          {/* Wavy organic shape — bottom */}
          <svg
            className="absolute -bottom-px left-0 w-full text-[#e8f0e4]/70"
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,45 L1440,80 L0,80 Z" />
          </svg>
          {/* Dot corner — top right */}
          <div className={cn('absolute right-6 top-8 size-32 opacity-60 sm:size-40', dotPattern)} />
          {/* Dot corner — bottom left */}
          <div className={cn('absolute bottom-16 left-4 size-24 opacity-40 sm:size-32', dotPattern)} />
        </>
      )}

      {variant === 'platform' && (
        <>
          <div className="absolute -left-20 top-1/3 size-80 rounded-full bg-[#d4e8c8]/40 blur-3xl" />
          <div className="absolute -right-24 bottom-1/4 size-[420px] rounded-full bg-[#8ac441]/10 blur-3xl" />
          {/* Wavy divider top */}
          <svg
            className="absolute -top-px left-0 w-full text-[#eef3ea]/90"
            viewBox="0 0 1440 60"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,10 1440,35 L1440,0 L0,0 Z" />
          </svg>
          <div className={cn('absolute left-2 top-24 size-28 opacity-50', dotPattern)} />
          <div className={cn('absolute bottom-12 right-8 size-36 opacity-45', dotPattern)} />
        </>
      )}

      {variant === 'differentiator' && (
        <>
          <div className="absolute -right-32 top-0 size-96 rounded-full bg-[#d4e8c8]/35 blur-3xl" />
          <div className="absolute -left-16 bottom-0 size-72 rounded-full bg-[#8ac441]/12 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eef3ea]/60 blur-3xl" />
          <div className={cn('absolute right-4 top-8 size-32 opacity-40', dotPattern)} />
          <div className={cn('absolute bottom-20 left-6 size-28 opacity-35', dotPattern)} />
        </>
      )}

      {variant === 'footer' && (
        <>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8ac441]/30 to-transparent" />
          <div className={cn('absolute bottom-4 left-8 size-20 opacity-30', dotPattern)} />
        </>
      )}
    </div>
  )
}
