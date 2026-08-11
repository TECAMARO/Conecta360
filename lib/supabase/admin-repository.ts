import { supabase } from '@/src/lib/supabaseClient'
import type { MeetingRow, ProfileRow } from '@/lib/supabase/database.types'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'
import { formatPhysicalTable } from '@/lib/physical-tables'

export type AdminUserMetrics = {
  confirmed: number
  pending: number
  cancelled: number
}

export type AdminProfileRow = ProfileRow & {
  metrics: AdminUserMetrics
}

export type AdminMeetingRow = MeetingRow & {
  requesterOrganization: string
  requesterName: string
  recipientOrganization: string
  recipientName: string
  tableLabel: string
  statusLabel: string
}

const CONFIRMED_STATUSES = new Set(['confirmada', 'confirmed', 'completada', 'completed'])
const PENDING_STATUSES = new Set(['pendiente', 'pending'])
const CANCELLED_STATUSES = new Set([
  'rechazada',
  'rejected',
  'cancelada_enviada',
  'cancelada_conflicto',
  'cancelada_admin',
  'cancelled',
  'canceled',
  'anulada_por_cruce',
  'anulada_por_limite',
])

function displayOrg(name: string | null | undefined, fallback: string): string {
  const trimmed = name?.trim()
  return trimmed || fallback
}

function meetingStatusLabel(status: string): string {
  const app = dbMeetingStatusToApp(status)
  const labels: Record<string, string> = {
    confirmada: 'Confirmada',
    pendiente: 'Pendiente',
    rechazada: 'Rechazada',
    cancelada_enviada: 'Cancelada (emisor)',
    cancelada_conflicto: 'Cancelada (conflicto)',
    cancelada_admin: 'Cancelada (admin)',
    anulada_por_cruce: 'Anulada por cruce',
    anulada_por_limite: 'Anulada por límite',
    completada: 'Completada',
  }
  return labels[app] ?? status
}

function computeMetricsForUser(userId: string, meetings: MeetingRow[]): AdminUserMetrics {
  const involved = meetings.filter(
    (m) => m.requester_id === userId || m.recipient_id === userId,
  )

  let confirmed = 0
  let pending = 0
  let cancelled = 0

  for (const meeting of involved) {
    const status = meeting.status.trim().toLowerCase()
    if (CONFIRMED_STATUSES.has(status)) confirmed += 1
    else if (PENDING_STATUSES.has(status)) pending += 1
    else if (CANCELLED_STATUSES.has(status)) cancelled += 1
  }

  return { confirmed, pending, cancelled }
}

export async function fetchCurrentUserIsAdmin(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return false
  return data.role === 'admin'
}

export async function fetchAdminProfilesWithMetrics(): Promise<AdminProfileRow[]> {
  const [{ data: profiles, error: profilesError }, { data: meetings, error: meetingsError }] =
    await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('meetings').select('*'),
    ])

  if (profilesError) throw new Error(profilesError.message)
  if (meetingsError) throw new Error(meetingsError.message)

  const meetingRows = (meetings ?? []) as MeetingRow[]

  return ((profiles ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    metrics: computeMetricsForUser(profile.id, meetingRows),
  }))
}

export async function fetchAdminMeetings(): Promise<AdminMeetingRow[]> {
  const [{ data: meetings, error: meetingsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('meetings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, organization_name, email'),
    ])

  if (meetingsError) throw new Error(meetingsError.message)
  if (profilesError) throw new Error(profilesError.message)

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name: p.full_name ?? '',
        org: p.organization_name ?? '',
        email: p.email ?? '',
      },
    ]),
  )

  return ((meetings ?? []) as MeetingRow[]).map((meeting) => {
    const requester = profileById.get(meeting.requester_id)
    const recipient = profileById.get(meeting.recipient_id)

    return {
      ...meeting,
      requesterOrganization: displayOrg(requester?.org, requester?.email ?? '—'),
      requesterName: displayOrg(requester?.name, 'Representante'),
      recipientOrganization: displayOrg(recipient?.org, recipient?.email ?? '—'),
      recipientName: displayOrg(recipient?.name, 'Representante'),
      tableLabel: `${formatPhysicalTable(meeting.table_number)} · ${meeting.day} ${meeting.slot_time}`,
      statusLabel: meetingStatusLabel(meeting.status),
    }
  })
}

export async function adminCancelMeeting(meetingId: string): Promise<MeetingRow> {
  const { data, error } = await supabase.rpc('admin_cancel_meeting', {
    p_meeting_id: meetingId,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No se pudo cancelar la reunión.')

  return data as MeetingRow
}

export type AdminMeetingFilter = 'all' | 'confirmada' | 'pendiente' | 'cancelada'

export function filterAdminMeetings(
  meetings: AdminMeetingRow[],
  filter: AdminMeetingFilter,
): AdminMeetingRow[] {
  if (filter === 'all') return meetings

  return meetings.filter((meeting) => {
    const status = meeting.status.trim().toLowerCase()
    if (filter === 'confirmada') {
      return CONFIRMED_STATUSES.has(status)
    }
    if (filter === 'pendiente') {
      return PENDING_STATUSES.has(status)
    }
    if (filter === 'cancelada') {
      return CANCELLED_STATUSES.has(status)
    }
    return true
  })
}

export function canAdminForceCancel(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return (
    PENDING_STATUSES.has(normalized) ||
    CONFIRMED_STATUSES.has(normalized)
  )
}
