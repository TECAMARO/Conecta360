import { buildActivityProcessFeed, type ActivityProcessEntry } from '@/lib/admin/activity-feed'
import { parseAppointmentDateRange } from '@/lib/agenda-export'
import {
  MAX_MEETING_CAPACITY,
  MAX_MEETINGS_PER_ORGANIZATION,
  MAX_REGISTERED_ORGANIZATIONS,
  TOTAL_TIME_BLOCKS,
} from '@/lib/admin/constants'
import type { AdminMeetingRow, AdminProfileRow } from '@/lib/supabase/admin-repository'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'
import { eventTimeSlots, eventDays } from '@/lib/event-config'
import { MAX_PHYSICAL_TABLES } from '@/lib/physical-tables'

export type AdminEvaluationRow = {
  id: string
  meeting_id: string
  user_id: string
  attendance: string
  alliance_expectation: string | null
  notes: string | null
  evaluated_at: string
}

export type ExecutiveFilters = {
  day: string
  table: string
  sector: string
  offerTag: string
  seekTag: string
  orgSearch: string
}

export const DEFAULT_EXECUTIVE_FILTERS: ExecutiveFilters = {
  day: 'all',
  table: 'all',
  sector: 'all',
  offerTag: 'all',
  seekTag: 'all',
  orgSearch: '',
}

export type TagCount = { label: string; count: number }

export type SlotGridInteraction = {
  meetingId: string
  status: 'available' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  statusLabel: string
  organizations: string
  occurredAt: string
}

export type SlotGridCell = {
  slotId: string
  day: string
  dayLabel: string
  time: string
  tableNumber: number
  status: SlotGridInteraction['status']
  meetingId?: string
  organizations?: string
  /** Interacciones anteriores (sin la más reciente), ordenadas de más reciente a más antigua. */
  history?: SlotGridInteraction[]
}

export type MeetingLedgerRow = {
  id: string
  orgA: string
  orgB: string
  day: string
  time: string
  table: string
  status: string
}

export type SectorConcentrationRow = {
  label: string
  count: number
  percentage: number
}

export type DayOccupancyRow = {
  dayId: string
  label: string
  occupied: number
  total: number
  percentage: number
}

export type ExecutiveKpis = {
  scheduledTotal: number
  capacityMax: number
  completedSuccess: number
  cancelledTotal: number
  pendingTotal: number
  registeredOrgs: number
  orgLimit: number
  attendanceRate: number
  avgMeetingsPerOrg: number
  allianceIndex: number
  /** Ocupación de bloques horarios únicos (uso en dashboard). */
  schedulingEfficiency: number
  /** Reuniones ejecutadas vs. programadas (confirmadas). */
  executionEfficiencyRate: number
  /** Volumen de reuniones por sector comercial (% sobre participaciones sectoriales). */
  sectorMeetingConcentration: SectorConcentrationRow[]
  /** Empresas únicas registradas. */
  participationOrganizations: number
  /** Delegados / perfiles participantes. */
  participationDelegates: number
  /** Ocupación global de celdas día×bloque×mesa. */
  tableOccupancyRate: number
  /** Ocupación temporal por día del evento. */
  tableOccupancyByDay: DayOccupancyRow[]
  /** Promedio 1–5 solo de check-ins con reunión concretada + expectativa de alianza. */
  satisfactionScore: number | null
  /** CSAT del agendamiento: % expectativas alta o media en check-ins válidos. */
  schedulingCsat: number
  /** Check-ins registrados vía Mi Agenda (Registrar resultado). */
  checkInSubmitted: number
  /** Reuniones B2B ya finalizadas elegibles para check-in. */
  checkInEligible: number
  /** Porcentaje de respuesta al cuestionario post-reunión. */
  checkInResponseRate: number
  /** Evaluaciones que aportan al puntaje de satisfacción. */
  satisfactionResponses: number
}

const CONFIRMED = new Set(['confirmada', 'confirmed', 'completada', 'completed'])
const PENDING = new Set(['pendiente', 'pending'])
const CANCELLED = new Set([
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

function normalizeStatus(status: string): string {
  return dbMeetingStatusToApp(status.trim().toLowerCase())
}

function profileMatchesTags(
  profile: AdminProfileRow,
  offerTag: string,
  seekTag: string,
): boolean {
  if (offerTag !== 'all' && !(profile.offers ?? []).includes(offerTag)) return false
  if (seekTag !== 'all' && !(profile.seeks ?? []).includes(seekTag)) return false
  return true
}

function meetingInvolvesFilteredOrg(
  meeting: AdminMeetingRow,
  profilesById: Map<string, AdminProfileRow>,
  filters: ExecutiveFilters,
): boolean {
  const requester = profilesById.get(meeting.requester_id)
  const recipient = profilesById.get(meeting.recipient_id)
  if (!requester || !recipient) return true

  if (filters.sector !== 'all') {
    if (requester.sector !== filters.sector && recipient.sector !== filters.sector) {
      return false
    }
  }

  if (filters.offerTag !== 'all' || filters.seekTag !== 'all') {
    const requesterOk = profileMatchesTags(requester, filters.offerTag, filters.seekTag)
    const recipientOk = profileMatchesTags(recipient, filters.offerTag, filters.seekTag)
    if (!requesterOk && !recipientOk) return false
  }

  return true
}

export function filterMeetingsForExecutive(
  meetings: AdminMeetingRow[],
  profiles: AdminProfileRow[],
  filters: ExecutiveFilters,
): AdminMeetingRow[] {
  const profilesById = new Map(profiles.map((p) => [p.id, p]))

  return meetings.filter((meeting) => {
    if (filters.day !== 'all' && meeting.day !== filters.day) return false
    if (filters.table !== 'all' && meeting.table_number !== Number(filters.table)) return false
    return meetingInvolvesFilteredOrg(meeting, profilesById, filters)
  })
}

export function filterProfilesForExecutive(
  profiles: AdminProfileRow[],
  filters: ExecutiveFilters,
): AdminProfileRow[] {
  return profiles.filter((profile) => {
    if (profile.role === 'admin') return false
    if (filters.sector !== 'all' && profile.sector !== filters.sector) return false
    if (!profileMatchesTags(profile, filters.offerTag, filters.seekTag)) return false
    const q = filters.orgSearch.trim().toLowerCase()
    if (!q) return true
    return (
      (profile.organization_name ?? '').toLowerCase().includes(q) ||
      (profile.full_name ?? '').toLowerCase().includes(q) ||
      (profile.email ?? '').toLowerCase().includes(q)
    )
  })
}

function allianceScore(expectation: string | null | undefined): number | null {
  switch (expectation) {
    case 'alta':
      return 5
    case 'media':
      return 4
    case 'baja':
      return 2
    case 'sin_interes':
      return 1
    default:
      return null
  }
}

function isMeetingPastEnd(meeting: AdminMeetingRow, now: Date): boolean {
  const slot = eventTimeSlots.find((s) => s.dayId === meeting.day && s.time === meeting.slot_time)
  if (!slot) return false
  const range = parseAppointmentDateRange(slot.id, meeting.slot_time)
  return range ? range.end.getTime() < now.getTime() : false
}

/** Reuniones confirmadas/completadas cuyo bloque horario ya terminó (elegibles para check-in). */
export function isCheckInEligibleMeeting(meeting: AdminMeetingRow, now = new Date()): boolean {
  const status = normalizeStatus(meeting.status)
  if (!CONFIRMED.has(status) && status !== 'completada') return false
  return isMeetingPastEnd(meeting, now)
}

export function filterEvaluationsForMeetings(
  evaluations: AdminEvaluationRow[],
  meetingIds: Set<string>,
): AdminEvaluationRow[] {
  return evaluations.filter((ev) => meetingIds.has(ev.meeting_id))
}

export function computeCheckInSatisfactionMetrics(
  meetings: AdminMeetingRow[],
  evaluations: AdminEvaluationRow[],
  now = new Date(),
): Pick<
  ExecutiveKpis,
  | 'satisfactionScore'
  | 'checkInSubmitted'
  | 'checkInEligible'
  | 'checkInResponseRate'
  | 'satisfactionResponses'
  | 'allianceIndex'
> {
  const evalByMeeting = new Map<string, AdminEvaluationRow>()
  for (const ev of evaluations) {
    evalByMeeting.set(ev.meeting_id, ev)
  }

  const eligibleMeetings = meetings.filter((m) => isCheckInEligibleMeeting(m, now))
  const checkInEligible = eligibleMeetings.length
  const checkInSubmitted = eligibleMeetings.filter((m) => evalByMeeting.has(m.id)).length
  const checkInResponseRate =
    checkInEligible > 0 ? Math.round((checkInSubmitted / checkInEligible) * 100) : 0

  const scoredEvaluations = evaluations.filter(
    (ev) => ev.attendance === 'concretada' && allianceScore(ev.alliance_expectation) !== null,
  )
  const satisfactionResponses = scoredEvaluations.length
  const allianceScores = scoredEvaluations
    .map((ev) => allianceScore(ev.alliance_expectation))
    .filter((score): score is number => score !== null)

  const satisfactionScore =
    allianceScores.length > 0
      ? Math.round(
          (allianceScores.reduce((sum, score) => sum + score, 0) / allianceScores.length) * 10,
        ) / 10
      : null

  const allianceRated = evaluations.filter((ev) => allianceScore(ev.alliance_expectation) !== null)
  const positiveAlliance = allianceRated.filter(
    (ev) => ev.alliance_expectation === 'alta' || ev.alliance_expectation === 'media',
  ).length
  const allianceIndex =
    allianceRated.length > 0 ? Math.round((positiveAlliance / allianceRated.length) * 100) : 0

  return {
    satisfactionScore,
    checkInSubmitted,
    checkInEligible,
    checkInResponseRate,
    satisfactionResponses,
    allianceIndex,
  }
}

export function computeExecutiveKpis(
  meetings: AdminMeetingRow[],
  profiles: AdminProfileRow[],
  evaluations: AdminEvaluationRow[],
  slotGrid: SlotGridCell[] = [],
  now = new Date(),
): ExecutiveKpis {
  let scheduledTotal = 0
  let completedSuccess = 0
  let cancelledTotal = 0
  let pendingTotal = 0

  const occupiedBlocks = new Set<string>()
  const evalByMeeting = new Map<string, AdminEvaluationRow[]>()
  for (const ev of evaluations) {
    const list = evalByMeeting.get(ev.meeting_id) ?? []
    list.push(ev)
    evalByMeeting.set(ev.meeting_id, list)
  }

  for (const meeting of meetings) {
    const status = normalizeStatus(meeting.status)
    if (CONFIRMED.has(status)) {
      scheduledTotal += 1
      occupiedBlocks.add(`${meeting.day}|${meeting.slot_time}`)
    } else if (PENDING.has(status)) {
      pendingTotal += 1
      occupiedBlocks.add(`${meeting.day}|${meeting.slot_time}`)
    } else if (CANCELLED.has(status)) {
      cancelledTotal += 1
    }

    const evs = evalByMeeting.get(meeting.id) ?? []
    const hasConcretadaEval = evs.some((ev) => ev.attendance === 'concretada')
    if (status === 'completada' || hasConcretadaEval) {
      completedSuccess += 1
    }
  }

  const registeredOrgs = profiles.filter((p) => p.role !== 'admin').length
  const confirmedPerOrg = profiles.map((p) => p.metrics.confirmed)
  const avgMeetingsPerOrg =
    registeredOrgs > 0
      ? confirmedPerOrg.reduce((sum, n) => sum + n, 0) / registeredOrgs
      : 0

  const concretadaCount = evaluations.filter((ev) => ev.attendance === 'concretada').length
  const pastConfirmed = meetings.filter((m) => {
    const status = normalizeStatus(m.status)
    if (!CONFIRMED.has(status) && status !== 'completada') return false
    const slot = eventTimeSlots.find((s) => s.dayId === m.day && s.time === m.slot_time)
    if (!slot) return false
    const range = parseAppointmentDateRange(slot.id, m.slot_time)
    return range ? range.end.getTime() < now.getTime() : false
  }).length

  const attendanceRate =
    pastConfirmed > 0 ? Math.round((concretadaCount / pastConfirmed) * 100) : 0

  const checkInMetrics = computeCheckInSatisfactionMetrics(meetings, evaluations, now)

  const schedulingEfficiency = Math.round((occupiedBlocks.size / TOTAL_TIME_BLOCKS) * 100)
  const executionEfficiencyRate =
    scheduledTotal > 0 ? Math.round((completedSuccess / scheduledTotal) * 100) : 0
  const sectorMeetingConcentration = countMeetingVolumeBySector(meetings, profiles)
  const { tableOccupancyRate, tableOccupancyByDay } = computeTableOccupancyMetrics(slotGrid)
  const { participationOrganizations, participationDelegates } = countParticipationVolume(profiles)

  return {
    scheduledTotal,
    capacityMax: MAX_MEETING_CAPACITY,
    completedSuccess,
    cancelledTotal,
    pendingTotal,
    registeredOrgs,
    orgLimit: MAX_REGISTERED_ORGANIZATIONS,
    attendanceRate,
    avgMeetingsPerOrg: Math.round(avgMeetingsPerOrg * 10) / 10,
    allianceIndex: checkInMetrics.allianceIndex,
    schedulingEfficiency,
    executionEfficiencyRate,
    sectorMeetingConcentration,
    participationOrganizations,
    participationDelegates,
    tableOccupancyRate,
    tableOccupancyByDay,
    satisfactionScore: checkInMetrics.satisfactionScore,
    schedulingCsat: checkInMetrics.allianceIndex,
    checkInSubmitted: checkInMetrics.checkInSubmitted,
    checkInEligible: checkInMetrics.checkInEligible,
    checkInResponseRate: checkInMetrics.checkInResponseRate,
    satisfactionResponses: checkInMetrics.satisfactionResponses,
  }
}

export function countTags(profiles: AdminProfileRow[], field: 'offers' | 'seeks'): TagCount[] {
  const counts = new Map<string, number>()
  for (const profile of profiles) {
    for (const tag of profile[field] ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export function countSectors(profiles: AdminProfileRow[]): TagCount[] {
  const counts = new Map<string, number>()
  for (const profile of profiles) {
    const sector = profile.sector?.trim() || 'Sin sector'
    counts.set(sector, (counts.get(sector) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export function countMeetingVolumeBySector(
  meetings: AdminMeetingRow[],
  profiles: AdminProfileRow[],
): SectorConcentrationRow[] {
  const profilesById = new Map(profiles.map((p) => [p.id, p]))
  const counts = new Map<string, number>()
  let totalParticipations = 0

  for (const meeting of meetings) {
    const status = normalizeStatus(meeting.status)
    if (!CONFIRMED.has(status) && status !== 'completada') continue

    for (const profileId of [meeting.requester_id, meeting.recipient_id]) {
      const profile = profilesById.get(profileId)
      const sector = profile?.sector?.trim() || 'Sin sector'
      counts.set(sector, (counts.get(sector) ?? 0) + 1)
      totalParticipations += 1
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percentage:
        totalParticipations > 0 ? Math.round((count / totalParticipations) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function computeTableOccupancyMetrics(slotGrid: SlotGridCell[]): {
  tableOccupancyRate: number
  tableOccupancyByDay: DayOccupancyRow[]
} {
  const occupiedCells = slotGrid.filter((cell) => cell.status !== 'available').length
  const totalCells = slotGrid.length
  const tableOccupancyRate =
    totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0

  const byDay = new Map<string, DayOccupancyRow>()
  for (const cell of slotGrid) {
    const current = byDay.get(cell.day) ?? {
      dayId: cell.day,
      label: cell.dayLabel,
      occupied: 0,
      total: 0,
      percentage: 0,
    }
    current.total += 1
    if (cell.status !== 'available') current.occupied += 1
    byDay.set(cell.day, current)
  }

  const dayOrder = new Map(eventDays.map((day, index) => [day.id, index]))
  const tableOccupancyByDay = [...byDay.values()]
    .map((row) => ({
      ...row,
      percentage: row.total > 0 ? Math.round((row.occupied / row.total) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        (dayOrder.get(a.dayId) ?? Number.MAX_SAFE_INTEGER) -
        (dayOrder.get(b.dayId) ?? Number.MAX_SAFE_INTEGER),
    )

  return { tableOccupancyRate, tableOccupancyByDay }
}

function countParticipationVolume(profiles: AdminProfileRow[]): {
  participationOrganizations: number
  participationDelegates: number
} {
  const participants = profiles.filter((p) => p.role !== 'admin')
  const orgKeys = new Set<string>()
  for (const profile of participants) {
    const org = (profile.organization_name ?? '').trim().toLowerCase()
    if (org) orgKeys.add(org)
  }
  return {
    participationOrganizations: orgKeys.size,
    participationDelegates: participants.length,
  }
}

function cellStatus(
  meeting: AdminMeetingRow | undefined,
  now: Date,
): SlotGridCell['status'] {
  if (!meeting) return 'available'
  const status = normalizeStatus(meeting.status)
  if (CANCELLED.has(status)) return 'cancelled'
  if (PENDING.has(status) || CONFIRMED.has(status)) {
    const slot = eventTimeSlots.find(
      (s) => s.dayId === meeting.day && s.time === meeting.slot_time,
    )
    if (slot) {
      const range = parseAppointmentDateRange(slot.id, meeting.slot_time)
      if (range) {
        const nowMs = now.getTime()
        if (nowMs >= range.start.getTime() && nowMs <= range.end.getTime()) {
          return 'in_progress'
        }
        if (nowMs > range.end.getTime() && (CONFIRMED.has(status) || status === 'completada')) {
          return 'completed'
        }
      }
    }
    return 'scheduled'
  }
  if (status === 'completada') return 'completed'
  return 'available'
}

function meetingInteractionAt(meeting: AdminMeetingRow): number {
  const raw = meeting.created_at
  if (!raw) return 0
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : 0
}

function meetingToInteraction(
  meeting: AdminMeetingRow,
  now: Date,
): SlotGridInteraction {
  return {
    meetingId: meeting.id,
    status: cellStatus(meeting, now),
    statusLabel: meeting.statusLabel,
    organizations: `${meeting.requesterOrganization} ↔ ${meeting.recipientOrganization}`,
    occurredAt: meeting.created_at ?? now.toISOString(),
  }
}

export function buildSlotGrid(
  meetings: AdminMeetingRow[],
  filters: ExecutiveFilters,
  now = new Date(),
): SlotGridCell[] {
  const filteredSlots = eventTimeSlots.filter((slot) => {
    if (filters.day !== 'all' && slot.dayId !== filters.day) return false
    return true
  })

  const meetingsByKey = new Map<string, AdminMeetingRow[]>()
  for (const meeting of meetings) {
    if (filters.table !== 'all' && meeting.table_number !== Number(filters.table)) continue
    const key = `${meeting.day}|${meeting.slot_time}|${meeting.table_number}`
    const list = meetingsByKey.get(key) ?? []
    list.push(meeting)
    meetingsByKey.set(key, list)
  }

  for (const [key, list] of meetingsByKey.entries()) {
    list.sort((a, b) => meetingInteractionAt(b) - meetingInteractionAt(a))
    meetingsByKey.set(key, list)
  }

  const cells: SlotGridCell[] = []
  for (const slot of filteredSlots) {
    for (let table = 1; table <= MAX_PHYSICAL_TABLES; table += 1) {
      if (filters.table !== 'all' && table !== Number(filters.table)) continue
      const key = `${slot.dayId}|${slot.time}|${table}`
      const slotMeetings = meetingsByKey.get(key) ?? []
      const interactions = slotMeetings.map((meeting) => meetingToInteraction(meeting, now))
      const primary = interactions[0]
      const history = interactions.length > 1 ? interactions.slice(1) : undefined

      cells.push({
        slotId: slot.id,
        day: slot.dayId,
        dayLabel: slot.day,
        time: slot.time,
        tableNumber: table,
        status: primary?.status ?? 'available',
        meetingId: primary?.meetingId,
        organizations: primary?.organizations,
        history,
      })
    }
  }
  return cells
}

export function buildMeetingLedger(meetings: AdminMeetingRow[]): MeetingLedgerRow[] {
  return meetings
    .map((meeting) => ({
      id: meeting.id,
      orgA: meeting.requesterOrganization,
      orgB: meeting.recipientOrganization,
      day: meeting.day,
      time: meeting.slot_time,
      table: `Mesa ${String(meeting.table_number).padStart(2, '0')}`,
      status: meeting.statusLabel,
    }))
    .sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`))
}

export function buildExecutiveSnapshot(
  profiles: AdminProfileRow[],
  meetings: AdminMeetingRow[],
  evaluations: AdminEvaluationRow[],
  filters: ExecutiveFilters,
) {
  const filteredProfiles = filterProfilesForExecutive(profiles, filters)
  const filteredMeetings = filterMeetingsForExecutive(meetings, profiles, filters)
  const filteredMeetingIds = new Set(filteredMeetings.map((m) => m.id))
  const filteredEvaluations = filterEvaluationsForMeetings(evaluations, filteredMeetingIds)
  const meetingById = new Map(filteredMeetings.map((m) => [m.id, m]))
  const slotGrid = buildSlotGrid(filteredMeetings, filters)
  const activityFeed = buildActivityProcessFeed(
    filteredMeetings,
    filteredEvaluations,
    meetingById,
  )

  return {
    filters,
    profiles: filteredProfiles,
    meetings: filteredMeetings,
    evaluations: filteredEvaluations,
    kpis: computeExecutiveKpis(
      filteredMeetings,
      filteredProfiles,
      filteredEvaluations,
      slotGrid,
    ),
    sectorDistribution: countSectors(filteredProfiles),
    offerDistribution: countTags(filteredProfiles, 'offers'),
    seekDistribution: countTags(filteredProfiles, 'seeks'),
    slotGrid,
    meetingLedger: buildMeetingLedger(filteredMeetings),
    activityFeed,
    latestProcess: activityFeed[0] ?? null,
    generatedAt: new Date().toISOString(),
  }
}

export type { ActivityProcessEntry }

export type ExecutiveSnapshot = ReturnType<typeof buildExecutiveSnapshot>
