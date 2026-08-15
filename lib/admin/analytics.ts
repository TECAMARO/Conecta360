import { parseAppointmentDateRange } from '@/lib/agenda-export'
import {
  MAX_MEETING_CAPACITY,
  MAX_MEETINGS_PER_ORGANIZATION,
  MAX_REGISTERED_ORGANIZATIONS,
  TOTAL_TIME_BLOCKS,
} from '@/lib/admin/constants'
import type { AdminMeetingRow, AdminProfileRow } from '@/lib/supabase/admin-repository'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'
import { eventTimeSlots } from '@/lib/event-config'
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

export type SlotGridCell = {
  slotId: string
  day: string
  dayLabel: string
  time: string
  tableNumber: number
  status: 'available' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  meetingId?: string
  organizations?: string
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
  schedulingEfficiency: number
  satisfactionScore: number
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

export function computeExecutiveKpis(
  meetings: AdminMeetingRow[],
  profiles: AdminProfileRow[],
  evaluations: AdminEvaluationRow[],
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

  const allianceScores = evaluations
    .map((ev) => allianceScore(ev.alliance_expectation))
    .filter((score): score is number => score !== null)

  const positiveAlliance = evaluations.filter(
    (ev) => ev.alliance_expectation === 'alta' || ev.alliance_expectation === 'media',
  ).length

  const allianceIndex =
    evaluations.length > 0 ? Math.round((positiveAlliance / evaluations.length) * 100) : 0

  const satisfactionScore =
    allianceScores.length > 0
      ? Math.round(
          (allianceScores.reduce((sum, score) => sum + score, 0) / allianceScores.length) * 10,
        ) / 10
      : 0

  const schedulingEfficiency = Math.round((occupiedBlocks.size / TOTAL_TIME_BLOCKS) * 100)

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
    allianceIndex,
    schedulingEfficiency,
    satisfactionScore,
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

export function buildSlotGrid(
  meetings: AdminMeetingRow[],
  filters: ExecutiveFilters,
  now = new Date(),
): SlotGridCell[] {
  const filteredSlots = eventTimeSlots.filter((slot) => {
    if (filters.day !== 'all' && slot.dayId !== filters.day) return false
    return true
  })

  const meetingByKey = new Map<string, AdminMeetingRow>()
  for (const meeting of meetings) {
    if (filters.table !== 'all' && meeting.table_number !== Number(filters.table)) continue
    meetingByKey.set(`${meeting.day}|${meeting.slot_time}|${meeting.table_number}`, meeting)
  }

  const cells: SlotGridCell[] = []
  for (const slot of filteredSlots) {
    for (let table = 1; table <= MAX_PHYSICAL_TABLES; table += 1) {
      if (filters.table !== 'all' && table !== Number(filters.table)) continue
      const meeting = meetingByKey.get(`${slot.dayId}|${slot.time}|${table}`)
      cells.push({
        slotId: slot.id,
        day: slot.dayId,
        dayLabel: slot.day,
        time: slot.time,
        tableNumber: table,
        status: cellStatus(meeting, now),
        meetingId: meeting?.id,
        organizations: meeting
          ? `${meeting.requesterOrganization} ↔ ${meeting.recipientOrganization}`
          : undefined,
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

  return {
    filters,
    profiles: filteredProfiles,
    meetings: filteredMeetings,
    evaluations,
    kpis: computeExecutiveKpis(filteredMeetings, filteredProfiles, evaluations),
    sectorDistribution: countSectors(filteredProfiles),
    offerDistribution: countTags(filteredProfiles, 'offers'),
    seekDistribution: countTags(filteredProfiles, 'seeks'),
    slotGrid: buildSlotGrid(filteredMeetings, filters),
    meetingLedger: buildMeetingLedger(filteredMeetings),
    generatedAt: new Date().toISOString(),
  }
}

export type ExecutiveSnapshot = ReturnType<typeof buildExecutiveSnapshot>
