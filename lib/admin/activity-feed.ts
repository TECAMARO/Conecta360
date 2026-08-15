import type { AdminMeetingRow } from '@/lib/supabase/admin-repository'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'

type EvaluationFeedInput = {
  id: string
  meeting_id: string
  attendance: string
  alliance_expectation: string | null
  evaluated_at: string
}

export type ActivityProcessKind =
  | 'meeting_pending'
  | 'meeting_confirmed'
  | 'meeting_completed'
  | 'meeting_cancelled'
  | 'meeting_rejected'
  | 'evaluation'

export type ActivityProcessEntry = {
  id: string
  kind: ActivityProcessKind
  title: string
  line1: string
  line2: string
  statusLabel: string
  timestamp: string
  orgA: string
  orgB: string
  day: string
  time: string
  table: string
}

function meetingKind(status: string): ActivityProcessKind {
  const app = dbMeetingStatusToApp(status.trim().toLowerCase())
  if (app === 'pendiente') return 'meeting_pending'
  if (app === 'confirmada') return 'meeting_confirmed'
  if (app === 'completada') return 'meeting_completed'
  if (app === 'rechazada') return 'meeting_rejected'
  return 'meeting_cancelled'
}

function meetingTitle(kind: ActivityProcessKind): string {
  switch (kind) {
    case 'meeting_pending':
      return 'Solicitud de reunión registrada'
    case 'meeting_confirmed':
      return 'Cita confirmada en plataforma'
    case 'meeting_completed':
      return 'Reunión marcada como completada'
    case 'meeting_rejected':
      return 'Solicitud rechazada por contraparte'
    case 'meeting_cancelled':
      return 'Reunión cancelada o anulada'
    default:
      return 'Actividad de reunión'
  }
}

function evaluationTitle(attendance: string): string {
  if (attendance === 'concretada') return 'Evaluación: reunión concretada'
  if (attendance === 'no_concretada') return 'Evaluación: reunión no concretada'
  return 'Evaluación post-reunión registrada'
}

export function buildActivityProcessFeed(
  meetings: AdminMeetingRow[],
  evaluations: EvaluationFeedInput[],
  meetingById: Map<string, AdminMeetingRow>,
): ActivityProcessEntry[] {
  const entries: ActivityProcessEntry[] = []

  for (const meeting of meetings) {
    const kind = meetingKind(meeting.status)
    entries.push({
      id: `meeting-${meeting.id}`,
      kind,
      title: meetingTitle(kind),
      line1: `${meeting.requesterOrganization} ↔ ${meeting.recipientOrganization}`,
      line2: `${meeting.day} · ${meeting.slot_time} · ${meeting.tableLabel}`,
      statusLabel: meeting.statusLabel,
      timestamp: meeting.created_at ?? new Date(0).toISOString(),
      orgA: meeting.requesterOrganization,
      orgB: meeting.recipientOrganization,
      day: meeting.day,
      time: meeting.slot_time,
      table: meeting.tableLabel,
    })
  }

  for (const evaluation of evaluations) {
    const meeting = meetingById.get(evaluation.meeting_id)
    if (!meeting) continue
    entries.push({
      id: `evaluation-${evaluation.id}`,
      kind: 'evaluation',
      title: evaluationTitle(evaluation.attendance),
      line1: `${meeting.requesterOrganization} ↔ ${meeting.recipientOrganization}`,
      line2: `Expectativa de alianza: ${evaluation.alliance_expectation ?? '—'} · ${meeting.tableLabel}`,
      statusLabel: evaluation.attendance,
      timestamp: evaluation.evaluated_at,
      orgA: meeting.requesterOrganization,
      orgB: meeting.recipientOrganization,
      day: meeting.day,
      time: meeting.slot_time,
      table: meeting.tableLabel,
    })
  }

  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

export function formatProcessTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
