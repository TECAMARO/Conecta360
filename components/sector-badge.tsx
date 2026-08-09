import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'

export function SectorBadge({
  sector,
  className,
  iconClassName,
}: {
  sector?: string | null
  className?: string
  iconClassName?: string
}) {
  if (!sector?.trim()) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-[#e8f0e4] px-2.5 py-1 text-xs font-medium text-[#1a3c34]',
        className,
      )}
    >
      <Building2
        className={cn('size-3.5 shrink-0 text-primary', iconClassName)}
        aria-hidden="true"
      />
      {sector}
    </span>
  )
}
