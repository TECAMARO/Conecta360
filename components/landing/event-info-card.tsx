import { CalendarDays, Clock, Sun, Sunset } from 'lucide-react'
import { EVENT, MEETING_DURATION_MINUTES, eventDays, eventScheduleSummary } from '@/lib/event-config'

export function EventInfoCard() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#8ac441]/40 bg-gradient-to-br from-[#1a3c34] via-[#234a40] to-[#2d5a4e] shadow-lg">
      <div className="border-b border-white/10 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#8ac441]/20">
            <CalendarDays className="size-6 text-[#8ac441]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8ac441]">
              Rueda de Negocios · Evento oficial
            </p>
            <h2 className="mt-1 text-balance text-lg font-bold leading-snug text-white sm:text-xl">
              {EVENT.name}
            </h2>
            <p className="mt-2 text-sm text-white/85">
              Agendamiento habilitado del{' '}
              <strong className="font-semibold text-[#8ac441]">{EVENT.dateRangeLabel}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:items-start sm:gap-8 sm:px-8 sm:py-8">
        {/* Days */}
        <div className="min-h-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8ac441]">
            Días habilitados
          </p>
          <ul className="space-y-2">
            {eventDays.map((day) => (
              <li
                key={day.id}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white"
              >
                <CalendarDays className="size-4 shrink-0 text-[#8ac441]" aria-hidden="true" />
                {day.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Schedule blocks */}
        <div className="min-h-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8ac441]">
            Bloques de agendamiento
          </p>
          <ul className="space-y-3">
            {eventScheduleSummary.map((block) => (
              <li key={block.days} className="rounded-lg bg-white/10 p-3.5">
                <p className="text-sm font-semibold text-white">{block.days}</p>
                <p className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-white/80">
                  <Sun className="mt-0.5 size-3.5 shrink-0 text-[#8ac441]" aria-hidden="true" />
                  {block.morning}
                </p>
                <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-white/80">
                  <Sunset className="mt-0.5 size-3.5 shrink-0 text-[#8ac441]" aria-hidden="true" />
                  {block.afternoon}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-white/70">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            Cada reunión dura {MEETING_DURATION_MINUTES} minutos
          </p>
        </div>
      </div>
    </div>
  )
}
