'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SectorBadge } from '@/components/sector-badge'
import { Button } from '@/components/ui/button'
import { AgendaExportActions } from '@/components/agenda-export-actions'
import { AgendaPrintSheet } from '@/components/agenda-print-sheet'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { participantById, type Appointment, type Conversation, type Participant } from '@/lib/data'
import {
  filterConfirmed,
  filterCancelledMeetings,
  filterConflictHistory,
  filterPendingReceived,
  filterPendingSent,
  type AgendaNotification,
} from '@/lib/meetings'
import {
  buildEvaluationSummary,
  evaluationBadgeLabel,
  hasMeetingEvaluation,
  isMeetingSlotPast,
  type MeetingEvaluationInput,
} from '@/lib/meeting-evaluation'
import { MeetingEvaluationModal } from '@/components/meeting-evaluation-modal'
import { EVENT } from '@/lib/event-config'
import { OUTGOING_LIMIT_RECIPIENT_MESSAGE } from '@/lib/meeting-outgoing-limit'
import {
  CalendarDays,
  Clock,
  MapPin,
  CircleCheck,
  Mail,
  MessagesSquare,
  ArrowRight,
  AlertTriangle,
  X,
  Pin,
  ClipboardList,
  Pencil,
} from 'lucide-react'

const PRESENCIAL_BANNER_KEY = 'conecta360-agenda-presencial-banner-dismissed'

type Tab = 'reuniones' | 'solicitudes' | 'conversaciones'

function MeetingStatusBadge({ appointment }: { appointment: Appointment }) {
  const { status, direction } = appointment

  if (hasMeetingEvaluation(appointment) || status === 'completada') {
    const evaluated = appointment.evaluation?.attendance === 'concretada'
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          evaluated
            ? 'bg-[#e8f5e9] text-[#2e6b3e]'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {evaluationBadgeLabel(appointment)}
      </span>
    )
  }

  if (status === 'confirmada') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
        ✓ Confirmada
      </span>
    )
  }

  if (status === 'pendiente' && direction === 'received') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4fd] px-2.5 py-1 text-xs font-medium text-[#1e5a8a]">
        📩 Por Aceptar
      </span>
    )
  }

  if (status === 'pendiente' && direction === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0ecdd] px-2.5 py-1 text-xs font-medium text-[#7a5b17]">
        ⏳ Pendiente de Respuesta
      </span>
    )
  }

  if (status === 'rechazada') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        ✕ {direction === 'sent' ? 'Rechazada' : 'Rechazada por ti'}
      </span>
    )
  }

  if (status === 'cancelada_enviada') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        ↩ Cancelada
      </span>
    )
  }

  if (status === 'cancelada_admin') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
        🚫 Cancelada por una de las partes
      </span>
    )
  }

  if (status === 'anulada_por_cruce' || status === 'cancelada_conflicto') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        🚫 Anulada por cruce de horario
      </span>
    )
  }

  if (status === 'anulada_por_limite') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        ↩ No disponible
      </span>
    )
  }

  return null
}

function resolveAppointmentParticipant(appointment: Appointment): Participant {
  const cached = participantById(appointment.participantId)
  if (cached) return cached

  return {
    id: appointment.participantId,
    name: 'Organización participante',
    fullName: '',
    role: '',
    acronym: '?',
    category: 'conservacion',
    needs: [],
    location: 'Región Orinoquía, Colombia',
    offer: [],
    seeking: [],
    description: '',
    sector: '',
  }
}

function resolveConversationParticipant(conversation: Conversation): Participant | null {
  const fromRegistry = participantById(conversation.participantId)
  if (fromRegistry) return fromRegistry

  const stub = conversation.participant
  if (!stub) return null

  return {
    id: stub.id,
    name: stub.name,
    fullName: stub.fullName ?? '',
    role: stub.role ?? '',
    acronym: stub.acronym,
    avatarUrl: stub.avatarUrl ?? null,
    location: stub.location ?? 'Región Orinoquía, Colombia',
    sector: stub.sector ?? '',
    category: 'conservacion',
    needs: [],
    offer: [],
    seeking: [],
    description: '',
  }
}

function AppointmentCard({
  appointment,
  children,
  muted = false,
  onViewProfile,
}: {
  appointment: Appointment
  children?: React.ReactNode
  muted?: boolean
  onViewProfile?: (participant: Participant) => void
}) {
  const p = resolveAppointmentParticipant(appointment)

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        muted
          ? 'border-border/70 bg-muted/30 opacity-90'
          : 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ParticipantAvatar participant={p} size="md" className="rounded-xl" />
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold text-card-foreground">{p.name}</p>
              {onViewProfile && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => onViewProfile(p)}
                >
                  Ver Perfil
                </Button>
              )}
            </div>
            <div className="mt-1">
              <SectorBadge sector={p.sector} />
            </div>
          </div>
        </div>
        <MeetingStatusBadge appointment={appointment} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          {appointment.day}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          {appointment.time}
        </span>
      </div>

      {(appointment.status === 'confirmada' ||
        appointment.status === 'completada' ||
        appointment.table) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            <MapPin className="size-4" aria-hidden="true" />
            📍 {appointment.table}
          </span>
          <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
            Presencial
          </span>
        </div>
      )}

      {appointment.message && (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          {'“'}
          {appointment.message}
          {'”'}
        </p>
      )}

      {children}
    </div>
  )
}

function ConfirmedMeetingActions({
  appointment,
  onOpenConversation,
  onOpenEvaluation,
}: {
  appointment: Appointment
  onOpenConversation: (participantId: string, meetingId?: string) => void
  onOpenEvaluation: (appointment: Appointment) => void
}) {
  const evaluated = hasMeetingEvaluation(appointment)
  const isPast = isMeetingSlotPast(appointment)
  const summary = buildEvaluationSummary(appointment)
  const highlightCheckIn = !evaluated && (isPast || appointment.status === 'confirmada')

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => onOpenConversation(appointment.participantId, appointment.id)}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <MessagesSquare className="size-4" aria-hidden="true" />
        Iniciar conversación previa
      </button>

      {evaluated ? (
        <div className="rounded-xl border border-border/80 bg-muted/40 px-3 py-2.5">
          <p className="text-sm text-foreground">{summary}</p>
          {appointment.evaluation?.notes && (
            <p className="mt-1 text-xs text-muted-foreground">
              Notas: {appointment.evaluation.notes}
            </p>
          )}
          <button
            type="button"
            onClick={() => onOpenEvaluation(appointment)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar evaluación
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenEvaluation(appointment)}
          className={cn(
            'gap-1.5 font-medium',
            highlightCheckIn &&
              isPast &&
              'border-amber-400 bg-amber-50 text-amber-950 shadow-sm ring-2 ring-amber-200 hover:bg-amber-100',
            highlightCheckIn &&
              !isPast &&
              'border-primary/50 bg-secondary/70 text-primary hover:bg-secondary',
          )}
        >
          <ClipboardList className="size-4" aria-hidden="true" />
          📋 Registrar Resultado / Check-in
        </Button>
      )}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <CalendarDays className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function cancellationNotice(appointment: Appointment): string {
  if (appointment.status === 'cancelada_enviada') {
    return appointment.direction === 'sent'
      ? 'Cancelaste esta solicitud. El horario quedó disponible nuevamente.'
      : 'El solicitante canceló esta propuesta. El horario quedó disponible nuevamente.'
  }

  if (appointment.status === 'rechazada') {
    return appointment.direction === 'sent'
      ? 'Tu solicitud fue rechazada. El horario quedó disponible nuevamente.'
      : 'Rechazaste esta solicitud. El horario quedó disponible nuevamente.'
  }

  if (appointment.status === 'anulada_por_limite') {
    return appointment.direction === 'received'
      ? OUTGOING_LIMIT_RECIPIENT_MESSAGE
      : 'Esta solicitud fue anulada porque alcanzaste el límite de agendamientos confirmados.'
  }

  if (appointment.status === 'cancelada_admin') {
    const name =
      participantById(appointment.participantId)?.name ??
      'tu contraparte'
    return `Tu reunión con ${name} fue cancelada por una de las partes.`
  }

  return ''
}

function sortByRecentActivity(a: Appointment, b: Appointment): number {
  const aTime = new Date(a.respondedAt ?? a.createdAt).getTime()
  const bTime = new Date(b.respondedAt ?? b.createdAt).getTime()
  return bTime - aTime
}

export function AgendaView({
  appointments,
  conversations,
  notifications,
  defaultTab = 'reuniones',
  respondingMeetingId = null,
  onOpenConversation,
  onAccept,
  onReject,
  onCancelSent,
  onDismissNotification,
  onNotify,
  onSaveEvaluation,
  onViewProfile,
}: {
  appointments: Appointment[]
  conversations: Conversation[]
  notifications: AgendaNotification[]
  /** Pestaña inicial al abrir Mi Agenda (p. ej. Solicitudes si hay pendientes). */
  defaultTab?: Tab
  /** Disables accept/reject while awaiting Supabase confirmation. */
  respondingMeetingId?: string | null
  onOpenConversation: (participantId: string, meetingId?: string) => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onCancelSent: (id: string) => void
  onDismissNotification: (id: string) => void
  onNotify?: (message: string) => void
  onSaveEvaluation: (appointmentId: string, input: MeetingEvaluationInput) => void
  onViewProfile?: (participant: Participant) => void
}) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [evaluationTarget, setEvaluationTarget] = useState<Appointment | null>(null)
  const [evaluationOpen, setEvaluationOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(PRESENCIAL_BANNER_KEY) === '1') {
      setBannerDismissed(true)
    }
  }, [])

  function dismissPresencialBanner() {
    setBannerDismissed(true)
    localStorage.setItem(PRESENCIAL_BANNER_KEY, '1')
  }

  function openEvaluation(appointment: Appointment) {
    setEvaluationTarget(appointment)
    setEvaluationOpen(true)
  }

  function handleSaveEvaluation(appointmentId: string, input: MeetingEvaluationInput) {
    onSaveEvaluation(appointmentId, input)
    onNotify?.('Evaluación guardada correctamente.')
    setEvaluationOpen(false)
    setEvaluationTarget(null)
  }

  const confirmed = filterConfirmed(appointments).sort((a, b) => a.time.localeCompare(b.time))
  const cancelled = filterCancelledMeetings(appointments).sort(sortByRecentActivity)
  const received = filterPendingReceived(appointments)
  const sent = filterPendingSent(appointments)
  const conflictHistory = filterConflictHistory(appointments)

  const activeEvaluationAppointment = evaluationTarget
    ? appointments.find((appt) => appt.id === evaluationTarget.id) ?? evaluationTarget
    : null

  const tabs = [
    { id: 'reuniones' as const, label: 'Reuniones', icon: CalendarDays, count: confirmed.length },
    { id: 'solicitudes' as const, label: 'Solicitudes', icon: Mail, count: received.length + sent.length },
    { id: 'conversaciones' as const, label: 'Conversaciones previas', icon: MessagesSquare, count: 0 },
  ]

  return (
    <>
      <div className="print:hidden">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Mi Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reuniones agendadas para {EVENT.shortName} ({EVENT.dateRangeLabel}).
        </p>
      </header>

      {notifications.filter((n) => n.kind === 'alert').length > 0 && (
        <div className="mb-6 space-y-2" role="alert" aria-live="polite">
          {notifications
            .filter((n) => n.kind === 'alert')
            .map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="flex-1 leading-relaxed">{n.message}</p>
              <button
                type="button"
                onClick={() => onDismissNotification(n.id)}
                className="shrink-0 rounded-lg p-2 text-amber-700 hover:bg-amber-100 min-h-11 min-w-11 flex items-center justify-center"
                aria-label="Cerrar alerta"
              >
                <X className="size-4" />
              </button>
            </div>
            ))}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div
          className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:mx-0 lg:flex-1 lg:flex-wrap lg:overflow-visible"
          role="tablist"
          aria-label="Secciones de la agenda"
        >
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-normal text-left sm:whitespace-nowrap">{t.label}</span>
                {t.count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <AgendaExportActions appointments={appointments} onNotify={onNotify} />
      </div>

      {!bannerDismissed && (
        <div
          className="mb-6 flex items-start gap-3 rounded-xl border border-[#d4e8c8] bg-[#f3f9ef] px-4 py-3 text-sm leading-relaxed text-[#2d4a24]"
          role="note"
        >
          <Pin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="flex-1">
            📌 Recordatorio presencial: Por favor preséntate 5 minutos antes de la hora
            programada en la mesa asignada (Mesa 01 a 06) para garantizar el desarrollo puntual
            de los 20 minutos de tu sesión.
          </p>
          <button
            type="button"
            onClick={dismissPresencialBanner}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-[#4a6741] transition-colors hover:bg-[#e3f0db]"
            aria-label="Cerrar recordatorio presencial"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {tab === 'reuniones' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              Reuniones Confirmadas
            </h2>
            {confirmed.length === 0 ? (
              <EmptyState
                title="Aún no tienes reuniones confirmadas"
                description="Las solicitudes aceptadas aparecerán aquí automáticamente."
              />
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-8 sm:pl-6">
                {confirmed.map((appt) => (
                  <li key={appt.id} className="relative">
                    <span
                      className="absolute -left-[25px] top-4 flex size-4 items-center justify-center rounded-full bg-primary ring-4 ring-background sm:-left-[31px]"
                      aria-hidden="true"
                    />
                    <AppointmentCard appointment={appt}>
                      <ConfirmedMeetingActions
                        appointment={appt}
                        onOpenConversation={onOpenConversation}
                        onOpenEvaluation={openEvaluation}
                      />
                    </AppointmentCard>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              Reuniones Canceladas
            </h2>
            {cancelled.length === 0 ? (
              <EmptyState
                title="No tienes reuniones canceladas"
                description="Si rechazas una solicitud o te rechazan una propuesta, aparecerá aquí con el horario liberado."
              />
            ) : (
              <div className="space-y-3">
                {cancelled.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} muted>
                    <p className="mt-3 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      {cancellationNotice(appt)}
                    </p>
                  </AppointmentCard>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'solicitudes' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              Solicitudes Recibidas
            </h2>
            {received.length === 0 ? (
              <EmptyState
                title="No tienes solicitudes por revisar"
                description="Cuando alguien te proponga una reunión, podrás aceptarla o rechazarla aquí."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {received.map((appt) => {
                  const isResponding = respondingMeetingId === appt.id
                  return (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onViewProfile={onViewProfile}
                  >
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={isResponding || !!respondingMeetingId}
                        onClick={() => onAccept(appt.id)}
                      >
                        <CircleCheck className="size-4" aria-hidden="true" />
                        {isResponding ? 'Procesando…' : 'Aceptar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        disabled={isResponding || !!respondingMeetingId}
                        onClick={() => onReject(appt.id)}
                      >
                        {isResponding ? 'Procesando…' : 'Rechazar'}
                      </Button>
                    </div>
                  </AppointmentCard>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              Solicitudes Enviadas
            </h2>
            {sent.length === 0 ? (
              <EmptyState
                title="No has enviado solicitudes pendientes"
                description="Explora participantes y envía tu primera propuesta de reunión."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {sent.map((appt) => {
                  const isResponding = respondingMeetingId === appt.id
                  return (
                  <AppointmentCard key={appt.id} appointment={appt}>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isResponding || !!respondingMeetingId}
                        onClick={() => onCancelSent(appt.id)}
                      >
                        {isResponding ? 'Procesando…' : 'Cancelar solicitud'}
                      </Button>
                    </div>
                  </AppointmentCard>
                  )
                })}
              </div>
            )}
          </section>

          {conflictHistory.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Anuladas por cruce de horario
              </h2>
              <div className="space-y-3">
                {conflictHistory.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} muted />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'conversaciones' && (
        <div className="space-y-3">
          {conversations.length === 0 ? (
            <EmptyState
              title="Sin conversaciones previas"
              description="Inicia un chat desde una reunión confirmada o desde el directorio."
            />
          ) : (
            conversations.map((c) => {
              const p = resolveConversationParticipant(c)
              if (!p) return null
              const last = c.messages[c.messages.length - 1]
              return (
                <button
                  key={c.participantId}
                  type="button"
                  onClick={() => onOpenConversation(c.participantId, c.meetingId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md"
                >
                  <ParticipantAvatar participant={p} size="md" className="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-card-foreground">{p.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{last?.text}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              )
            })
          )}
        </div>
      )}
      </div>

      <MeetingEvaluationModal
        appointment={activeEvaluationAppointment}
        open={evaluationOpen}
        onOpenChange={(open) => {
          setEvaluationOpen(open)
          if (!open) setEvaluationTarget(null)
        }}
        onSave={handleSaveEvaluation}
      />

      <AgendaPrintSheet appointments={appointments} />
    </>
  )
}
