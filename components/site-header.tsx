import type { ReactNode } from 'react'
import { BrandLogoLink } from '@/components/logo'
import { cn } from '@/lib/utils'

/**
 * Global site header — use on all public pages and auth shells.
 * Pass `actions` for the right-side slot (login buttons, etc.).
 */
export function SiteHeader({
  className,
  actions,
  brand,
  sticky = false,
}: {
  className?: string
  actions?: ReactNode
  brand?: ReactNode
  sticky?: boolean
}) {
  return (
    <header
      className={cn(
        'relative flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-10',
        sticky && 'sticky top-0 z-50 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center">{brand ?? <BrandLogoLink />}</div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">{actions}</div>
      ) : null}
    </header>
  )
}
