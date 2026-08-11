import Image from 'next/image'
import { BrandLogo, LANDING_LOGO_PAIR_CLASS } from '@/components/logo'
import { cn } from '@/lib/utils'

const CONECTA360_AMARO_URL = 'https://amaro.agency/conecta360/'
const SEMANA_ORINOQUIA_URL = 'https://amaro.agency/semana-orinoquia-sostenible-360/'

const externalLinkClass =
  'inline-flex shrink-0 items-center rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a3c34]'

/** Logos enlazados a Amaro Agency — solo pantalla principal (/). */
export function LandingHomeBrandLinks({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex min-w-0 max-w-[58%] items-center gap-1.5 sm:max-w-none sm:gap-2.5 md:gap-4',
        className,
      )}
    >
      <a
        href={CONECTA360_AMARO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Conecta360 — Amaro Agency"
        className={externalLinkClass}
      >
        <BrandLogo className={LANDING_LOGO_PAIR_CLASS} />
      </a>
      <a
        href={SEMANA_ORINOQUIA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Semana Orinoquía Sostenible y Competitiva 2026 — Amaro Agency"
        className={externalLinkClass}
      >
        <Image
          src="/logo2.png"
          alt="Semana Orinoquía Sostenible y Competitiva 2026"
          width={480}
          height={140}
          className={cn(LANDING_LOGO_PAIR_CLASS, 'shrink-0')}
          sizes="(min-width: 1024px) 320px, 140px"
          priority
        />
      </a>
    </div>
  )
}
