import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const LOGO_WIDTH = 640
export const LOGO_HEIGHT = 188

/** Default classes for header / navbar logo rendering — no max-width caps. */
export const LOGO_IMAGE_CLASS = 'h-32 w-auto object-contain py-2 md:h-40'

const LOGO_PROPS = {
  src: '/logo.png',
  alt: 'Conecta360',
  width: LOGO_WIDTH,
  height: LOGO_HEIGHT,
} as const

/** Official brand logo — use in headers and navigation. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      {...LOGO_PROPS}
      className={cn(LOGO_IMAGE_CLASS, className)}
      sizes="(min-width: 768px) 550px, 440px"
      priority
    />
  )
}

/** Logo linked to home — single Link wrapper for all navigation headers. */
export function BrandLogoLink({
  className,
  href = '/',
  imageClassName,
}: {
  className?: string
  href?: string
  imageClassName?: string
}) {
  return (
    <Link
      href={href}
      aria-label="Conecta360 — inicio"
      className={cn('inline-flex shrink-0 items-center', className)}
    >
      <BrandLogo className={imageClassName} />
    </Link>
  )
}

/** Responsive height shared by paired header logos on the landing navbar. */
export const LANDING_LOGO_PAIR_CLASS =
  'h-10 w-auto max-w-[38vw] object-contain py-0.5 sm:h-14 sm:max-w-none md:h-20 lg:h-28 xl:h-32'

const LOGO2_PROPS = {
  src: '/logo2.png',
  alt: 'Semana Orinoquía Sostenible y Competitiva 2026',
  width: 480,
  height: 140,
} as const

/** Conecta360 + partner logos — landing navbar. */
export function BrandLogoPairLink({
  className,
  href = '/',
  imageClassName = LANDING_LOGO_PAIR_CLASS,
}: {
  className?: string
  href?: string
  imageClassName?: string
}) {
  return (
    <Link
      href={href}
      aria-label="Conecta360 — inicio"
      className={cn(
        'inline-flex min-w-0 max-w-[58%] items-center gap-1.5 sm:max-w-none sm:gap-2.5 md:gap-4',
        className,
      )}
    >
      <BrandLogo className={imageClassName} />
      <Image
        {...LOGO2_PROPS}
        className={cn(imageClassName, 'shrink-0')}
        sizes="(min-width: 1024px) 320px, 140px"
        priority
      />
    </Link>
  )
}

/**
 * @deprecated Use BrandLogo for decorative marks. Kept for the how-it-works diagram.
 */
export function LogoMark({
  className,
  tone = 'color',
}: {
  className?: string
  tone?: 'color' | 'onDark'
}) {
  const top = tone === 'onDark' ? '#8AC441' : '#1A3C34'
  const bottom = tone === 'onDark' ? '#A5D66A' : '#8AC441'
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Conecta360"
      fill="none"
    >
      <rect x="9" y="4" width="21" height="31" rx="10.5" stroke={top} strokeWidth="6" />
      <rect x="18" y="13" width="21" height="31" rx="10.5" stroke={bottom} strokeWidth="6" />
    </svg>
  )
}

/** @deprecated Use BrandLogoLink in headers. */
export function LogoWordmark({
  className,
  href = '/',
}: {
  className?: string
  tone?: 'color' | 'onDark'
  subtitle?: boolean
  href?: string
}) {
  return <BrandLogoLink className={className} href={href} />
}
