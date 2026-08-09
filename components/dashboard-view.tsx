'use client'

import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/category-badge'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { participantById, type Appointment, type Participant } from '@/lib/data'
import {
  Users,
  CalendarCheck,
  MessageSquareText,
  Sparkles,
  Clock,
  MapPin,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react'

export function DashboardView({
  appointments,
  unreadCount,
  userName,
  directoryParticipants,
  onExplore,
  onAgenda,
  onRequest,
  onViewProfile,
}: {
  appointments: Appointment[]
  unreadCount: number
  userName: string
  directoryParticipants: Participant[]
  onExplore: () => void
  onAgenda: () => void
  onRequest: (p: Participant) => void
  onViewProfile: (p: Participant) => void
}) {
  const confirmed = appointments.filter((a) => a.status === 'confirmada')
  const upcoming = [...confirmed].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 3)
  const confirmedCount = confirmed.length

  const others = directoryParticipants.filter((p) => !p.isCurrentUser)
  const recommended = others.slice(0, 4)

  const stats = [
    { label: 'Participantes activos', value: others.length, icon: Users },
    { label: 'Reuniones agendadas', value: confirmedCount, icon: CalendarCheck },
    { label: 'Reuniones confirmadas', value: confirmedCount, icon: Sparkles },
    { label: 'Mensajes sin leer', value: unreadCount, icon: MessageSquareText },
  ]

  return (
    <div>
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-[#234a40] p-6 text-primary-foreground sm:p-8">
        <p className="text-sm font-medium text-white/80">
          Hola, {userName || 'participante'}
        </p>
        <h1 className="mt-2 max-w-xl text-balance text-xl font-semibold leading-tight sm:text-2xl md:text-3xl">
          Bienvenido a tu espacio de conexiones estratégicas
        </h1>
        <p className="mt-2 max-w-xl text-pretty text-sm text-white/85">
          Encuentra a las personas adecuadas para generar alianzas significativas y transforma cada
          conexión en impacto real.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={onExplore}
            className="bg-white text-primary hover:bg-white/90"
          >
            Explorar participantes
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            onClick={onAgenda}
            className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            Ver mi agenda
          </Button>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon className="size-[18px]" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-card-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Próximas reuniones</h2>
            <button
              type="button"
              onClick={onAgenda}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver agenda completa
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No tienes reuniones confirmadas próximamente.
              </p>
            ) : (
              upcoming.map((appt) => {
                const p = participantById(appt.participantId)
                if (!p) return null
                return (
                  <div
                    key={appt.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-primary">
                        {p.acronym}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-card-foreground">{p.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-primary" aria-hidden="true" />
                            {appt.time}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            📍 {appt.table}
                          </span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-primary">
                            Presencial
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="w-fit shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
                      Confirmada
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Actores recomendados</h2>
            <button
              type="button"
              onClick={onExplore}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver más
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-3">
            {recommended.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Aún no hay organizaciones publicadas en el directorio.
              </p>
            ) : (
              recommended.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <ParticipantAvatar participant={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onViewProfile(p)}
                        className="truncate text-left text-sm font-medium text-card-foreground hover:text-primary hover:underline"
                      >
                        {p.name}
                      </button>
                      {p.role && (
                        <p className="truncate text-xs text-muted-foreground">{p.role}</p>
                      )}
                      <div className="mt-1">
                        <CategoryBadge category={p.category} />
                      </div>
                    </div>
                    <Button
                      size="default"
                      variant="outline"
                      className="min-h-11 min-w-11 shrink-0"
                      onClick={() => onRequest(p)}
                      aria-label={`Solicitar reunión con ${p.name}`}
                    >
                      <ArrowUpRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
