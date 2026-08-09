import { supabase } from '@/src/lib/supabaseClient'
import type { Appointment } from '@/lib/data'
import type { MeetingEvaluation } from '@/lib/meeting-evaluation'
import { meetingRowToAppointment } from '@/lib/supabase/mappers'
import type { MeetingRow } from '@/lib/supabase/database.types'
import {
  ACTIVE_MEETING_DB_STATUSES,
  MEETING_DB_STATUS_PENDING,
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

/** Inserts a meeting request; assigns the first free Mesa 01–10 for the block. */
export async function insertMeetingRequest(payload: MeetingRequestPayload): Promise<MeetingRow> {
  const user = await requireAuthenticatedUser()
  assertMeetingRequestPayload(user.id, payload)

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
  const { appointments: userAppointments } = await fetchUserMeetings(user.id)

  const MAX_ATTEMPTS = 5
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tableNumber = await resolveTableForNewRequest(payload, userAppointments)

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
