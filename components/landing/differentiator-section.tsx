import {
  User,
  Users,
  Target,
  Leaf,
  Lightbulb,
  Puzzle,
  DollarSign,
  Megaphone,
} from 'lucide-react'
import { SectionDecor } from './section-decor'

const differentiators = [
  {
    icon: User,
    text: 'Aquí, cada participante no solo crea un perfil. Define con claridad qué busca, qué ofrece y, sobre todo, qué espera lograr en el evento.',
  },
  {
    icon: Users,
    text: 'La plataforma organiza esa información para facilitar encuentros alineados, donde ambas partes tienen un propósito claro desde el inicio.',
  },
  {
    icon: Target,
    text: "No se trata de 'conectar por conectar'. Se trata de optimizar el tiempo, enfocar las conversaciones y generar oportunidades reales.",
  },
]

const activations = [
  { icon: Puzzle, label: 'Proyectos que necesitan', highlight: 'aliados' },
  { icon: DollarSign, label: 'Iniciativas que buscan', highlight: 'financiación' },
  { icon: Megaphone, label: 'Organizaciones que requieren', highlight: 'visibilidad' },
  {
    icon: Users,
    label: 'Relaciones que pueden convertirse en',
    highlight: 'colaboración',
  },
]

export function DifferentiatorSection() {
  return (
    <section className="relative overflow-hidden px-6 lg:px-10">
      {/* Subtle gradient + mesh background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#eef3ea] via-[#f5f7f2] to-[#e8f0e4]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(138,196,65,0.08)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(26,60,52,0.05)_0%,transparent_45%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle,rgba(138,196,65,0.12)_1px,transparent_1px)] [background-size:20px_20px] opacity-40"
        aria-hidden="true"
      />

      <SectionDecor variant="differentiator" />

      <div className="relative grid gap-12 py-16 lg:grid-cols-3 lg:gap-8 lg:py-20">
        {/* Column 1 — What makes it different */}
        <div className="rounded-2xl border border-[#dde8d8]/50 bg-white/60 p-6 shadow-sm backdrop-blur-sm sm:p-7">
          <h2 className="text-xl font-bold text-[#1a3c34] sm:text-2xl">
            ¿Qué hace diferente a Conecta360?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#3d5249] sm:text-base">
            Conecta360 no está diseñado para generar más reuniones.{' '}
            <span className="font-semibold text-[#8ac441]">
              Está diseñado para que cada conexión tenga sentido.
            </span>
          </p>

          <ul className="mt-6 space-y-5">
            {differentiators.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.text.slice(0, 30)} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f0e4]">
                    <Icon className="size-4 text-[#1a3c34]" aria-hidden="true" />
                  </div>
                  <p className="text-sm leading-relaxed text-[#3d5249]">{item.text}</p>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#1a3c34] p-5">
            <Leaf className="mt-0.5 size-5 shrink-0 text-[#8ac441]" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-white">
              Porque el verdadero valor no está en cuántas reuniones tienes,{' '}
              <span className="font-semibold text-[#8ac441]">
                sino en cuáles realmente avanzan.
              </span>
            </p>
          </div>
        </div>

        {/* Column 2 — Impact statement */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative flex size-48 items-center justify-center rounded-full bg-gradient-to-br from-[#8ac441]/20 via-[#e8f0e4] to-[#1a3c34]/10 sm:size-56">
            <div className="absolute inset-4 rounded-full border border-dashed border-[#8ac441]/40" />
            <div className="absolute inset-8 rounded-full border border-[#dde8d8]" />
            <Lightbulb className="size-10 text-[#1a3c34]" aria-hidden="true" />
          </div>
          <p className="mt-6 max-w-xs text-sm font-medium leading-relaxed text-[#1a3c34] sm:text-base">
            Conecta360 convierte la intención en conexión, y la conexión en impacto.
          </p>
        </div>

        {/* Column 3 — Activation */}
        <div className="relative">
          <h2 className="text-xl font-bold text-[#1a3c34] sm:text-2xl">
            Conecta360 permite activar:
          </h2>

          <ul className="relative mt-8 space-y-6">
            <div
              className="absolute left-[18px] top-4 bottom-4 w-px border-l border-dashed border-[#8ac441]/50"
              aria-hidden="true"
            />
            {activations.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.highlight} className="relative flex items-center gap-4">
                  <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1a3c34]">
                    <Icon className="size-4 text-white" aria-hidden="true" />
                  </div>
                  <p className="rounded-lg bg-white px-4 py-2.5 text-sm text-[#3d5249] shadow-md">
                    {item.label}{' '}
                    <span className="font-semibold text-[#8ac441]">{item.highlight}</span>
                  </p>
                </li>
              )
            })}
          </ul>

          {/* Decorative circles */}
          <div
            className="pointer-events-none absolute -bottom-8 -right-4 size-32 rounded-full bg-[#8ac441]/10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-4 right-8 size-20 rounded-full bg-[#1a3c34]/5"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  )
}
