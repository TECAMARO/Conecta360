import {
  Users,
  UserCircle,
  Search,
  Calendar,
  ClipboardList,
  MessageCircle,
  Leaf,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark } from '@/components/logo'

type Step = {
  num: string
  title: string
  description: string
  icon: LucideIcon
  position: string
}

const steps: Step[] = [
  {
    num: '01',
    title: 'Generar conexiones con intención y propósito.',
    description:
      'Encuentra a las personas adecuadas para generar alianzas significativas.',
    icon: Users,
    position: 'top-0 left-1/2 -translate-x-1/2 -translate-y-2',
  },
  {
    num: '02',
    title: 'Crear y gestionar su perfil estratégico.',
    description:
      'Diseña tu perfil, comunica tu propósito y lo que estás buscando o puedes ofrecer.',
    icon: UserCircle,
    position: 'top-[18%] right-0 translate-x-2',
  },
  {
    num: '03',
    title: 'Identificar actores clave y oportunidades de conexión.',
    description:
      'Explora participantes y descubre organizaciones, proyectos e iniciativas alineadas a tus objetivos.',
    icon: Search,
    position: 'bottom-[18%] right-0 translate-x-2',
  },
  {
    num: '04',
    title: 'Agendar reuniones de manera estructurada.',
    description:
      'Solicita y confirma reuniones de negocios de forma ágil y organizada.',
    icon: Calendar,
    position: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-2',
  },
  {
    num: '05',
    title: 'Organizar su agenda con enfoque en resultados.',
    description:
      'Visualiza tu agenda personalizada y optimiza tu tiempo para maximizar el impacto.',
    icon: ClipboardList,
    position: 'bottom-[18%] left-0 -translate-x-2',
  },
  {
    num: '06',
    title: 'Facilitar conversaciones previas a los encuentros.',
    description:
      'Inicia conversaciones, alinea expectativas y llega a tus reuniones mejor preparado.',
    icon: MessageCircle,
    position: 'top-[18%] left-0 -translate-x-2',
  },
]

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon
  return (
    <div className="w-44 rounded-xl border border-[#dde8d8]/80 bg-white p-3 shadow-lg sm:w-52 sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#1a3c34] text-[10px] font-bold text-white">
          {step.num}
        </span>
        <Icon className="size-4 text-[#8ac441]" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold leading-snug text-[#1a3c34]">{step.title}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#5a6b62]">{step.description}</p>
    </div>
  )
}

export function HowItWorksCircle() {
  return (
    <section className="relative">
      <div className="mb-8 flex items-start gap-2">
        <Leaf className="mt-1 size-5 shrink-0 text-[#8ac441]" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-bold text-[#1a3c34] sm:text-2xl">
            Cómo funciona Conecta360
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#3d5249] sm:text-base">
            La plataforma permite organizar de manera{' '}
            <strong className="font-semibold text-[#1a3c34]">
              clara, estratégica y eficiente
            </strong>{' '}
            los espacios de conexión dentro de un evento, proyecto o iniciativa.
          </p>
        </div>
      </div>

      {/* Desktop: radial layout */}
      <div className="relative mx-auto hidden min-h-[520px] max-w-2xl md:block">
        {/* Dashed connector lines */}
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 400 520"
          aria-hidden="true"
        >
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180
            const cx = 200
            const cy = 260
            const r = 55
            const x2 = cx + Math.cos(rad) * 130
            const y2 = cy + Math.sin(rad) * 130
            const x1 = cx + Math.cos(rad) * r
            const y1 = cy + Math.sin(rad) * r
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#8ac441"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                opacity="0.6"
              />
            )
          })}
        </svg>

        {/* Center logo */}
        <div className="absolute left-1/2 top-1/2 z-10 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-[#e8f0e4]">
          <LogoMark className="size-14" />
        </div>

        {steps.map((step) => (
          <div key={step.num} className={`absolute ${step.position}`}>
            <StepCard step={step} />
          </div>
        ))}
      </div>

      {/* Mobile: stacked cards */}
      <div className="grid gap-4 md:hidden">
        {steps.map((step) => (
          <StepCard key={step.num} step={step} />
        ))}
      </div>
    </section>
  )
}
