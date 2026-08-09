import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HeroPillarsCard } from './hero-pillars-card'
import { EventInfoCard } from './event-info-card'

export function HeroSection() {
  return (
    <section className="relative px-4 sm:px-6 lg:px-10">
      <div className="relative grid gap-10 py-10 lg:grid-cols-2 lg:items-start lg:gap-6 lg:py-16">
        {/* Left — Hero copy */}
        <div className="relative z-10">
          <h1 className="text-balance text-2xl font-bold leading-snug tracking-tight text-[#1a3c34] sm:text-3xl sm:leading-tight lg:text-[2rem] lg:leading-[1.2] xl:text-[2.15rem]">
            La plataforma oficial de la Rueda de Negocios de la Semana Orinoquía Sostenible y
            Competitiva 2026.
          </h1>

          <div className="mt-6 max-w-xl space-y-4 text-pretty text-base leading-relaxed text-[#3d5249] sm:text-lg">
            <p>
              Este será el espacio donde empresas, organizaciones, emprendimientos, instituciones e
              inversionistas podrán conectarse, identificar oportunidades y programar reuniones B2B
              durante el evento desde el 21 de septiembre y hasta el 26 de septiembre en horarios
              definidos.
            </p>
            <p>
              Para comenzar, completa tu proceso de registro y accede a una experiencia diseñada
              para facilitar conexiones estratégicas, optimizar tu agenda de reuniones y fortalecer
              la generación de alianzas con propósito.
            </p>
          </div>

          <p className="mt-5 max-w-xl text-pretty text-sm italic leading-relaxed text-slate-600 sm:text-[0.9375rem]">
            «Cada encuentro ha sido pensado para que aproveches al máximo tu participación y
            construyas relaciones que impulsen nuevos proyectos, negocios e iniciativas
            sostenibles.»
          </p>

          <div className="mt-8">
            <Link
              href="/participantes"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-11 bg-[#1a3c34] px-6 text-white hover:bg-[#234a40]',
              )}
            >
              Explorar participantes
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Right — Pillars card */}
        <div className="relative">
          <HeroPillarsCard />
        </div>
      </div>

      {/* Event info — Rueda de Negocios Orinoquía 2026 */}
      <div id="evento" className="relative scroll-mt-24 pb-0">
        <EventInfoCard />
      </div>
    </section>
  )
}
