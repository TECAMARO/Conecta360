import Image from 'next/image'
import { Users, Target, Handshake, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SectionDecor } from './section-decor'

const values: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: 'Conexiones con propósito' },
  { icon: Target, label: 'Oportunidades reales' },
  { icon: Handshake, label: 'Alianzas que generan valor' },
  { icon: Leaf, label: 'Impacto que trasciende' },
]

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[#dde8d8]/80 bg-[#e8f0e4]/80">
      <SectionDecor variant="footer" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="flex flex-col items-center gap-8 text-center lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto] lg:items-center lg:gap-10 lg:text-left">
          {/* Left — tagline */}
          <p className="max-w-xl text-sm leading-relaxed text-[#1a3c34] sm:text-base">
            <strong className="font-bold">Conecta. Colabora. Genera impacto.</strong>{' '}
            Conecta360 es más que una plataforma, es el punto de encuentro para transformar
            conexiones en oportunidades reales.
          </p>

          {/* Center — pillars */}
          <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:max-w-none lg:justify-items-start">
            {values.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon className="size-4 text-[#1a3c34]" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium text-[#1a3c34] sm:text-sm">{label}</span>
              </div>
            ))}
          </div>

          {/* Right — partner logo */}
          <div className="flex w-full justify-center lg:justify-end">
            <Image
              src="/logo3.png"
              alt="Semana Orinoquía Sostenible y Competitiva 2026"
              width={352}
              height={120}
              className="h-auto w-32 object-contain sm:w-36 lg:w-44"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
