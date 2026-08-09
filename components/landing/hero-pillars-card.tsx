import {
  Target,
  Users,
  Handshake,
  TrendingUp,
  CalendarDays,
  Network,
  type LucideIcon,
} from 'lucide-react'

type Pillar = {
  icon: LucideIcon
  keyword: string
  text: string
}

const pillars: Pillar[] = [
  {
    icon: Target,
    keyword: 'Encuentra',
    text: 'Oportunidades y proyectos de impacto',
  },
  {
    icon: Users,
    keyword: 'Conecta',
    text: 'Con organizaciones, empresas y aliados',
  },
  {
    icon: Handshake,
    keyword: 'Genera alianzas',
    text: 'Estratégicas que multiplican resultados',
  },
  {
    icon: TrendingUp,
    keyword: 'Transforma',
    text: 'Ideas en acciones que generan valor real',
  },
  {
    icon: CalendarDays,
    keyword: 'Participa',
    text: 'En ruedas de negocios para cerrar acuerdos',
  },
]

function PillarItem({ pillar }: { pillar: Pillar }) {
  const Icon = pillar.icon
  return (
    <div className="flex gap-3 rounded-xl border border-[#dde8d8]/80 bg-white/90 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0e4]">
        <Icon className="size-5 text-[#1a3c34]" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#1a3c34]">{pillar.keyword}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#5a6b62]">{pillar.text}</p>
      </div>
    </div>
  )
}

export function HeroPillarsCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#dde8d8]/80 bg-white shadow-lg ring-1 ring-black/5">
      {/* Visual header — networking composition */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#1a3c34] via-[#2d5a4e] to-[#3d6b55] sm:h-40">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 50%, rgba(138,196,65,0.5) 0%, transparent 45%), radial-gradient(circle at 75% 30%, rgba(255,255,255,0.12) 0%, transparent 40%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center gap-4 px-6">
          <div className="flex size-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm">
            <Users className="size-7 text-white/90" aria-hidden="true" />
          </div>
          <div className="h-px w-12 bg-[#8ac441]/60" aria-hidden="true" />
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-[#8ac441]/50 bg-[#8ac441]/20 backdrop-blur-sm">
            <Network className="size-8 text-white" aria-hidden="true" />
          </div>
          <div className="h-px w-12 bg-[#8ac441]/60" aria-hidden="true" />
          <div className="flex size-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm">
            <Handshake className="size-7 text-white/90" aria-hidden="true" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Hub message */}
      <div className="border-b border-[#dde8d8]/60 bg-[#f3f6f0] px-5 py-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8ac441]">
          Ruedas de negocios
        </p>
        <p className="mt-1 text-sm font-medium leading-snug text-[#1a3c34] sm:text-base">
          Conexiones con propósito que impulsan impacto real
        </p>
      </div>

      {/* Pillars grid */}
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-3 sm:p-5">
        {pillars.map((pillar) => (
          <PillarItem key={pillar.keyword} pillar={pillar} />
        ))}
      </div>
    </div>
  )
}
