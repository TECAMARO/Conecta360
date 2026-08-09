import { DeviceMockup } from './device-mockup'
import { HowItWorksCircle } from './how-it-works-circle'
import { SectionDecor } from './section-decor'

export function PlatformSection() {
  return (
    <section id="como-funciona" className="relative overflow-hidden bg-[#f3f6f0]/80 px-6 lg:px-10 scroll-mt-20">
      <SectionDecor variant="platform" />

      <div className="relative grid gap-12 py-16 lg:grid-cols-2 lg:gap-10 lg:py-20">
        {/* Left — Quote + mockups */}
        <div>
          <blockquote className="text-balance text-xl font-medium leading-snug text-[#1a3c34] sm:text-2xl lg:text-[1.65rem]">
            «Es una plataforma diseñada para activar{' '}
            <span className="font-semibold text-[#8ac441]">oportunidades reales</span> a partir de{' '}
            <span className="font-semibold text-[#8ac441]">conexiones estratégicas</span>».
          </blockquote>

          <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-[#3d5249] sm:text-base">
            Conecta360 facilita ruedas de negocios y espacios de conexión inteligentes que generan
            alianzas,{' '}
            <strong className="font-semibold text-[#8ac441]">impulsan proyectos</strong> y
            transforman ideas en{' '}
            <strong className="font-semibold text-[#8ac441]">impacto</strong>.
          </p>

          <div className="mt-8">
            <DeviceMockup />
          </div>
        </div>

        {/* Right — How it works */}
        <HowItWorksCircle />
      </div>
    </section>
  )
}
