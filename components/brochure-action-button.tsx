'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasBrochure, previewBrochure, type CorporateBrochure } from '@/lib/corporate-brochure'
import { FileText } from 'lucide-react'

export function BrochureActionButton({
  brochure,
  className,
  size = 'default',
  showEmptyState = false,
  emptyStateClassName,
}: {
  brochure?: CorporateBrochure | null
  className?: string
  size?: 'default' | 'sm' | 'lg'
  showEmptyState?: boolean
  emptyStateClassName?: string
}) {
  if (!hasBrochure(brochure)) {
    if (!showEmptyState) return null
    return (
      <p
        className={cn(
          'rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground',
          emptyStateClassName,
        )}
      >
        Sin brochure PDF adjunto
      </p>
    )
  }

  return (
    <Button
      type="button"
      variant="default"
      size={size}
      className={cn('gap-1.5 font-semibold shadow-sm', className)}
      onClick={() => previewBrochure(brochure)}
    >
      <FileText className="size-4" aria-hidden="true" />
      📄 Ver / Descargar Brochure PDF
    </Button>
  )
}
