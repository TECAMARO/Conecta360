import { supabase } from '@/src/lib/supabaseClient'
import type { Appointment, AppointmentStatus } from '@/lib/data'
import type { MeetingEvaluation } from '@/lib/meeting-evaluation'
import { meetingRowToAppointment } from '@/lib/supabase/mappers'
import type { MeetingRow } from '@/lib/supabase/database.types'
import {
  ACTIVE_MEETING_DB_STATUSES,
  MEETING_DB_STATUS_PENDING,
  PENDING_MEETING_DB_STATUSES,
  appMeetingStatusToDb,
} from '@/lib/supabase/meeting-status'
import { meetingDayAndTimeFromSlotId, slotIdFromMeetingDayAndTime } from '@/lib/meeting-slots'
import {
  MEETING_MODALITY,
  formatPhysicalTable,
  parsePhysicalTable,
  isSameMeetingBlock,
} from '@/lib/physical-tables'
import { canSendMeetingRequest } from '@/lib/agenda-protection'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'
import {
  isOutgoingSendBlocked,
  MAX_OUTGOING_CONFIRMED_MEETINGS,
  OUTGOING_LIMIT_SILENT_MESSAGE,
} from '@/lib/meeting-outgoing-limit'
import {
  applyTableCorrectionsLocally,
  filterLogisticallyActiveReservations,
  planPendingTableCorrections,
} from '@/lib/table-corrector'

async function requireAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')
  return data.user
}

export type MeetingRequestPayload = {
  recipientId: string
  day: string
  slotTime: string
  message?: string
}

function assertMeetingRequestPayload(requesterId: string, payload: MeetingRequestPayload): void {
  if (!requesterId?.trim()) {
    throw new Error('Sesión no válida. Vuelve a iniciar sesión.')
  }
  if (!payload.recipientId?.trim()) {
    throw new Error('Destinatario de la reunión no válido.')
  }
  if (!payload.day?.trim()) {
    throw new Error('Selecciona una fecha válida para la reunión.')
  }
  if (!payload.slotTime?.trim()) {
    throw new Error('Selecciona un bloque horario válido.')
  }
}

function occupancyRowToAppointment(row: {
  id: string
  day: string
  slot_time: string
  table_number: number
  status: string
  created_at?: string | null
  requester_id?: string
  recipient_id?: string
}): Appointment {
  const slotTime = row.slot_time
  return {
    id: row.id,
    participantId: row.recipient_id ?? '',
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    slotId: slotIdFromMeetingDayAndTime(row.day, slotTime),
    day: row.day,
    time: slotTime,
    table: formatPhysicalTable(row.table_number),
    tableNumber: row.table_number,
    modality: MEETING_MODALITY,
    status: dbMeetingStatusToApp(row.status),
    direction: 'sent',
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

function mapOccupancyRows(
  rows: {
    id: string
    day: string
    slot_time: string
    table_number: number
    status: string
    created_at?: string | null
  }[],
): Appointment[] {
  return filterLogisticallyActiveReservations(rows.map(occupancyRowToAppointment))
}

/** Runs server-side corrector; falls back to client-side patch for pending duplicates. */
export async function correctDuplicatePendingTables(): Promise<number> {
  const { data, error } = await supabase.rpc('correct_duplicate_pending_tables')
  if (!error && typeof data === 'number') return data

  const occupancy = await fetchAllActiveMeetingsRaw()
  const corrections = planPendingTableCorrections(occupancy)
  if (corrections.length === 0) return 0

  await Promise.all(
    corrections.map((correction) =>
      updateMeetingTableNumber(correction.meetingId, correction.toTable),
    ),
  )
  return corrections.length
}

export async function updateMeetingTableNumber(
  meetingId: string,
  tableNumber: number,
): Promise<void> {
  const { error } = await supabase
    .from('meetings')
    .update({ table_number: tableNumber })
    .eq('id', meetingId)
    .eq('status', MEETING_DB_STATUS_PENDING)

  if (error) throw new Error(error.message)
}

async function fetchAllActiveMeetingsRaw(): Promise<Appointment[]> {
  const { data, error } = await supabase.rpc('get_active_meeting_occupancy')

  if (!error && data) {
    return mapOccupancyRows(data)
  }

  const { data: rows, error: fallbackError } = await supabase
    .from('meetings')
    .select('id, day, slot_time, table_number, status, created_at, requester_id, recipient_id')
    .in('status', [...ACTIVE_MEETING_DB_STATUSES])

  if (fallbackError) throw new Error(fallbackError.message)
  return mapOccupancyRows(
    (rows ?? []) as Pick<
      MeetingRow,
      'id' | 'day' | 'slot_time' | 'table_number' | 'status' | 'created_at'
    >[],
  )
}

/** Loads every active meeting in the event for table allocation. */
export async function fetchAllActiveMeetings(): Promise<Appointment[]> {
  await correctDuplicatePendingTables()
  return fetchAllActiveMeetingsRaw()
}

/** Active meetings in one block — filters in app by slot (robust to day format). */
export async function fetchOccupancyForBlock(
  day: string,
  slotTime: string,
): Promise<Appointment[]> {
  const slotId = slotIdFromMeetingDayAndTime(day, slotTime)
  const all = await fetchAllActiveMeetings()
  return all.filter((appt) => isSameMeetingBlock(appt, slotId))
}

async function resolveTableForNewRequest(
  payload: MeetingRequestPayload,
  userAppointments: Appointment[],
): Promise<number> {
  const slotId = slotIdFromMeetingDayAndTime(payload.day, payload.slotTime)
  const blockOccupancy = await fetchOccupancyForBlock(payload.day, payload.slotTime)

  const validation = canSendMeetingRequest(
    { userAppointments, slotOccupancy: blockOccupancy },
    payload.recipientId.trim(),
    slotId,
  )
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const tableNumber = parsePhysicalTable(validation.table)
  if (!tableNumber) {
    throw new Error('No hay mesa disponible para este bloque horario.')
  }

  return tableNumber
}

/** Inserts a meeting request; assigns the first free Mesa 01–06 for the block. */
export async function insertMeetingRequest(payload: MeetingRequestPayload): Promise<MeetingRow> {
  const user = await requireAuthenticatedUser()
  assertMeetingRequestPayload(user.id, payload)

  const { appointments: userAppointments } = await fetchUserMeetings(user.id)
  if (isOutgoingSendBlocked(userAppointments)) {
    throw new Error(OUTGOING_LIMIT_SILENT_MESSAGE)
  }

  const proposal = payload.message?.trim() ?? ''

  const { data: rpcRow, error: rpcError } = await supabase.rpc(
    'insert_meeting_request_with_table',
    {
      p_recipient_id: payload.recipientId.trim(),
      p_day: payload.day.trim(),
      p_slot_time: payload.slotTime.trim(),
      p_proposal: proposal,
    },
  )

  if (!rpcError && rpcRow) {
    return rpcRow as MeetingRow
  }

  await correctDuplicatePendingTables()
  const { appointments: refreshedAppointments } = await fetchUserMeetings(user.id)

  const MAX_ATTEMPTS = 5
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tableNumber = await resolveTableForNewRequest(payload, refreshedAppointments)

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        requester_id: user.id,
        recipient_id: payload.recipientId.trim(),
        day: payload.day.trim(),
        slot_time: payload.slotTime.trim(),
        proposal,
        status: MEETING_DB_STATUS_PENDING,
        modality: MEETING_MODALITY,
        table_number: tableNumber,
      })
      .select('*')
      .single()

    if (!error) return data as MeetingRow

    if (error.code === '23505' && attempt < MAX_ATTEMPTS - 1) {
      await correctDuplicatePendingTables()
      continue
    }
    throw new Error(error.message)
  }

  throw new Error('No hay mesa disponible para este bloque horario.')
}

export async function fetchUserMeetings(
  userId: string,
): Promise<{ appointments: Appointment[]; evaluations: Map<string, MeetingEvaluation> }> {
  await correctDuplicatePendingTables()

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as MeetingRow[]
  const meetingIds = rows.map((row) => row.id)
  const evaluations = await fetchEvaluationsForMeetings(meetingIds)

  let appointments = rows.map((row) =>
    meetingRowToAppointment(row, userId, evaluations.get(row.id)),
  )

  const occupancy = await fetchAllActiveMeetingsRaw()
  const corrections = planPendingTableCorrections(occupancy)
  appointments = applyTableCorrectionsLocally(appointments, corrections)

  return { appointments, evaluations }
}

async function fetchEvaluationsForMeetings(
  meetingIds: string[],
): Promise<Map<string, MeetingEvaluation>> {
  const map = new Map<string, MeetingEvaluation>()
  if (meetingIds.length === 0) return map

  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .in('meeting_id', meetingIds)

  if (error || !data) return map

  for (const row of data) {
    map.set(row.meeting_id, {
      attendance: row.attendance as MeetingEvaluation['attendance'],
      allianceExpectation:
        (row.alliance_expectation as MeetingEvaluation['allianceExpectation']) ?? undefined,
      notes: row.notes ?? undefined,
      evaluatedAt: row.evaluated_at,
    })
  }

  return map
}

/** Active meetings in one slot — for table allocation across users. */
export async function fetchActiveMeetingsForSlot(slotId: string): Promise<Appointment[]> {
  const all = await fetchAllActiveMeetings()
  return all.filter((appt) => appt.slotId === slotId)
}

export async function updateMeeting(
  meetingId: string,
  patch: Partial<Pick<Appointment, 'status'>>,
): Promise<void> {
  const dbPatch: Partial<MeetingRow> = {}
  if (patch.status) dbPatch.status = appMeetingStatusToDb(patch.status)

  const { error } = await supabase.from('meetings').update(dbPatch).eq('id', meetingId)
  if (error) throw new Error(error.message)
}

export type MeetingStaleReason =
  | 'already_confirmed'
  | 'already_resolved'
  | 'cancelled_by_sender'

export type PendingMeetingUpdateResult =
  | { ok: true; id: string }
  | { ok: false; stale: true; staleReason?: MeetingStaleReason }
  | { ok: false; stale: false; error: string }

const CONFIRMED_DB_STATUSES = new Set(['confirmada', 'confirmed'])
const REJECTED_DB_STATUSES = new Set(['rechazada', 'rejected'])
const CANCELLED_SENT_DB_STATUSES = new Set([
  'cancelada_enviada',
  'cancelled',
  'canceled',
])

function isRpcNotDeployed(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? ''
  const msg = error.message ?? ''
  return (
    code === '42883' ||
    code === 'PGRST202' ||
    /function.*does not exist/i.test(msg) ||
    /could not find the function/i.test(msg)
  )
}

async function classifyMeetingStaleReason(
  meetingId: string,
): Promise<MeetingStaleReason> {
  const status = await fetchMeetingDbStatus(meetingId)
  if (!status) return 'already_resolved'

  if (isConfirmedDbStatus(status)) return 'already_confirmed'
  if (isCancelledSentDbStatus(status)) return 'cancelled_by_sender'
  return 'already_resolved'
}

async function staleMeetingResult(meetingId: string): Promise<PendingMeetingUpdateResult> {
  return {
    ok: false,
    stale: true,
    staleReason: await classifyMeetingStaleReason(meetingId),
  }
}

function isPendingDbStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return (
    PENDING_MEETING_DB_STATUSES.includes(status as (typeof PENDING_MEETING_DB_STATUSES)[number]) ||
    dbMeetingStatusToApp(status) === 'pendiente'
  )
}

function isConfirmedDbStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return CONFIRMED_DB_STATUSES.has(status) || dbMeetingStatusToApp(status) === 'confirmada'
}

function isCancelledSentDbStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return (
    CANCELLED_SENT_DB_STATUSES.has(status) ||
    dbMeetingStatusToApp(status) === 'cancelada_enviada'
  )
}

/** Reads authoritative status (RPC security definer, then direct SELECT fallback). */
export async function fetchMeetingDbStatus(meetingId: string): Promise<string | null> {
  const { data: rpcStatus, error: rpcError } = await supabase.rpc(
    'get_meeting_status_for_participant',
    { p_meeting_id: meetingId },
  )

  if (!rpcError && typeof rpcStatus === 'string') {
    return rpcStatus
  }

  const { data, error } = await supabase
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .maybeSingle()

  if (error || !data?.status) return null
  return data.status
}

async function runConfirmMutation(meetingId: string): Promise<string | null> {
  const { error } = await supabase.rpc('confirm_meeting_if_pending', {
    p_meeting_id: meetingId,
  })

  if (!error) return null
  if (!isRpcNotDeployed(error)) return error.message

  const { error: updateError } = await supabase
    .from('meetings')
    .update({ status: appMeetingStatusToDb('confirmada') })
    .eq('id', meetingId)
    .in('status', [...PENDING_MEETING_DB_STATUSES])

  if (updateError) return updateError.message
  return null
}

async function runCancelMutation(meetingId: string): Promise<string | null> {
  const { error } = await supabase.rpc('cancel_meeting_if_pending', {
    p_meeting_id: meetingId,
  })

  if (!error) return null
  if (!isRpcNotDeployed(error)) return error.message

  const { error: updateError } = await supabase
    .from('meetings')
    .update({ status: appMeetingStatusToDb('cancelada_enviada') })
    .eq('id', meetingId)
    .in('status', [...PENDING_MEETING_DB_STATUSES])

  if (updateError) return updateError.message
  return null
}

export async function verifyMeetingDbStatus(
  meetingId: string,
  expected: Extract<AppointmentStatus, 'confirmada' | 'rechazada' | 'cancelada_enviada'>,
): Promise<boolean> {
  const status = await fetchMeetingDbStatus(meetingId)
  if (!status) return false

  const appStatus = dbMeetingStatusToApp(status)
  if (appStatus === expected) return true

  if (expected === 'confirmada' && CONFIRMED_DB_STATUSES.has(status)) return true
  if (expected === 'rechazada' && REJECTED_DB_STATUSES.has(status)) return true
  if (expected === 'cancelada_enviada' && CANCELLED_SENT_DB_STATUSES.has(status)) {
    return true
  }

  return false
}

/**
 * Updates status only if the row is still pending (double lock with RLS + trigger).
 * Never throws on 0 rows — returns `{ ok: false, stale: true }` instead.
 */
export async function updateMeetingStatusIfPending(
  meetingId: string,
  status: Extract<AppointmentStatus, 'confirmada' | 'rechazada'>,
): Promise<PendingMeetingUpdateResult> {
  const dbStatus = appMeetingStatusToDb(status)

  const { data, error } = await supabase
    .from('meetings')
    .update({ status: dbStatus })
    .eq('id', meetingId)
    .in('status', [...PENDING_MEETING_DB_STATUSES])
    .select('id, status')

  if (error) {
    return { ok: false, stale: false, error: error.message }
  }

  if (!data || data.length === 0) {
    return staleMeetingResult(meetingId)
  }

  const verified = await verifyMeetingDbStatus(meetingId, status)
  if (!verified) {
    return staleMeetingResult(meetingId)
  }

  return { ok: true, id: data[0].id as string }
}

/** Confirm only if DB status transitions pendiente → confirmada. Ignores RPC payload. */
export async function confirmMeetingIfPending(
  meetingId: string,
): Promise<PendingMeetingUpdateResult> {
  const before = await fetchMeetingDbStatus(meetingId)

  if (before && isCancelledSentDbStatus(before)) {
    return { ok: false, stale: true, staleReason: 'cancelled_by_sender' }
  }
  if (before && isConfirmedDbStatus(before)) {
    return { ok: false, stale: true, staleReason: 'already_confirmed' }
  }
  if (before && !isPendingDbStatus(before)) {
    return { ok: false, stale: true, staleReason: 'already_resolved' }
  }

  const mutationError = await runConfirmMutation(meetingId)
  if (mutationError) {
    return { ok: false, stale: false, error: mutationError }
  }

  const after = await fetchMeetingDbStatus(meetingId)
  if (after && isConfirmedDbStatus(after)) {
    return { ok: true, id: meetingId }
  }
  if (after && isCancelledSentDbStatus(after)) {
    return { ok: false, stale: true, staleReason: 'cancelled_by_sender' }
  }

  return staleMeetingResult(meetingId)
}

/** Reject via RPC (preferred) or atomic UPDATE fallback. */
export async function rejectMeetingIfPending(
  meetingId: string,
): Promise<PendingMeetingUpdateResult> {
  const { data, error } = await supabase.rpc('reject_meeting_if_pending', {
    p_meeting_id: meetingId,
  })

  if (!error) {
    if (!data) return staleMeetingResult(meetingId)
    const row = data as MeetingRow
    const verified = await verifyMeetingDbStatus(meetingId, 'rechazada')
    if (!verified) return staleMeetingResult(meetingId)
    return { ok: true, id: row.id }
  }

  if (!isRpcNotDeployed(error)) {
    return { ok: false, stale: false, error: error.message }
  }

  return updateMeetingStatusIfPending(meetingId, 'rechazada')
}

/** Cancel sent request only if DB status transitions pendiente → cancelada_enviada. */
export async function cancelMeetingIfPending(
  meetingId: string,
): Promise<PendingMeetingUpdateResult> {
  const before = await fetchMeetingDbStatus(meetingId)

  if (before && isConfirmedDbStatus(before)) {
    return { ok: false, stale: true, staleReason: 'already_confirmed' }
  }
  if (before && isCancelledSentDbStatus(before)) {
    return { ok: true, id: meetingId }
  }
  if (before && !isPendingDbStatus(before)) {
    return { ok: false, stale: true, staleReason: 'already_resolved' }
  }

  const mutationError = await runCancelMutation(meetingId)
  if (mutationError) {
    return { ok: false, stale: false, error: mutationError }
  }

  const after = await fetchMeetingDbStatus(meetingId)
  if (after && isCancelledSentDbStatus(after)) {
    return { ok: true, id: meetingId }
  }
  if (after && isConfirmedDbStatus(after)) {
    return { ok: false, stale: true, staleReason: 'already_confirmed' }
  }

  return staleMeetingResult(meetingId)
}

/** Alias semántico para el handler de cancelación del emisor. */
export const cancelMeetingRequest = cancelMeetingIfPending

export async function updateMeetingsBatch(
  updates: { id: string; patch: Partial<Pick<Appointment, 'status'>> }[],
): Promise<void> {
  await Promise.all(updates.map(({ id, patch }) => updateMeeting(id, patch)))
}

export async function saveMeetingEvaluationToDb(
  meetingId: string,
  userId: string,
  evaluation: MeetingEvaluation,
): Promise<void> {
  const { error: evalError } = await supabase.from('evaluations').upsert(
    {
      meeting_id: meetingId,
      user_id: userId,
      attendance: evaluation.attendance,
      alliance_expectation: evaluation.allianceExpectation ?? null,
      notes: evaluation.notes ?? null,
      evaluated_at: evaluation.evaluatedAt,
    },
    { onConflict: 'meeting_id' },
  )

  if (evalError) throw new Error(evalError.message)

  const { error: meetingError } = await supabase
    .from('meetings')
    .update({ status: 'completada' })
    .eq('id', meetingId)

  if (meetingError) throw new Error(meetingError.message)
}

export async function cancelPendingInSlotExcept(
  slotId: string,
  exceptMeetingId: string,
): Promise<void> {
  const slotMeta = meetingDayAndTimeFromSlotId(slotId)
  if (!slotMeta) return

  const { error } = await supabase
    .from('meetings')
    .update({ status: 'anulada_por_cruce' })
    .eq('day', slotMeta.day)
    .eq('slot_time', slotMeta.timeSlot)
    .eq('status', MEETING_DB_STATUS_PENDING)
    .neq('id', exceptMeetingId)

  if (error) throw new Error(error.message)
}

/** Solicitudes enviadas confirmadas/completadas por un usuario (cupos de envío). */
export async function fetchOutgoingConfirmedCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('meetings')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .in('status', ['confirmada', 'completada', 'confirmed', 'completed'])

  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Anula solicitudes pendientes enviadas cuando el solicitante ya tiene
 * {@link MAX_OUTGOING_CONFIRMED_MEETINGS} reuniones confirmadas.
 */
export async function rebouncePendingSentOverLimit(requesterId: string): Promise<number> {
  const confirmed = await fetchOutgoingConfirmedCount(requesterId)
  if (confirmed < MAX_OUTGOING_CONFIRMED_MEETINGS) return 0

  const { data, error } = await supabase
    .from('meetings')
    .update({ status: 'anulada_por_limite' })
    .eq('requester_id', requesterId)
    .eq('status', MEETING_DB_STATUS_PENDING)
    .select('id')

  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
