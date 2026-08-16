'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  LOGO_HEIGHT,
  LOGO_WIDTH,
  SIDEBAR_LOGO_IMAGE_CLASS,
  LOGO_IMAGE_CLASS,
} from '@/components/logo'
import { platformLogoSrc, type PlatformLogoVariant } from '@/lib/platform-preferences'

const LOGO2_WIDTH = 480
const LOGO2_HEIGHT = 140

export function PlatformLogoToggle({
  variant,
  onToggle,
  className,
  imageClassName,
  sidebar = false,
}: {
  variant: PlatformLogoVariant
  onToggle: () => void
  className?: string
  imageClassName?: string
  sidebar?: boolean
}) {
  const isAlternate = variant === 'alternate'
  const src = platformLogoSrc(variant)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        isAlternate
          ? 'Mostrar logo Conecta360'
          : 'Mostrar logo alternativo del evento'
      }
      title="Cambiar logo"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0',
        className,
      )}
    >
      <Image
        src={src}
        alt={isAlternate ? 'Semana Orinoquía 2026' : 'Conecta360'}
        width={isAlternate ? LOGO2_WIDTH : LOGO_WIDTH}
        height={isAlternate ? LOGO2_HEIGHT : LOGO_HEIGHT}
        className={cn(
          sidebar ? SIDEBAR_LOGO_IMAGE_CLASS : LOGO_IMAGE_CLASS,
          imageClassName,
        )}
        sizes={sidebar ? '288px' : '(min-width: 768px) 550px, 440px'}
        priority
      />
    </button>
  )
}
