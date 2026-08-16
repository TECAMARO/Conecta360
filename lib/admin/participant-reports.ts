import { SECTORS } from '@/lib/event-config'
import type { ProfileRow } from '@/lib/supabase/database.types'

export type ParticipantReportRow = {
  organizationName: string
  fullName: string
  email: string
  jobTitle: string
  country: string
  sector: string
  joinedAt: string | null
}

export function mapProfileToParticipantRow(profile: ProfileRow): ParticipantReportRow {
  return {
    organizationName: profile.organization_name?.trim() || 'Sin empresa',
    fullName: profile.full_name?.trim() || 'Sin nombre',
    email: profile.email?.trim() || '—',
    jobTitle: profile.job_title?.trim() || '—',
    country: profile.region?.trim() || '—',
    sector: profile.sector?.trim() || 'Sin sector',
    joinedAt: profile.created_at,
  }
}

export function getParticipantProfilesForReports(
  profiles: ProfileRow[],
): ParticipantReportRow[] {
  return profiles
    .filter((profile) => profile.role !== 'admin')
    .map(mapProfileToParticipantRow)
}

export function groupParticipantsBySector(
  participants: ParticipantReportRow[],
): { sector: string; participants: ParticipantReportRow[] }[] {
  const bySector = new Map<string, ParticipantReportRow[]>()

  for (const participant of participants) {
    const list = bySector.get(participant.sector) ?? []
    list.push(participant)
    bySector.set(participant.sector, list)
  }

  const sortParticipants = (rows: ParticipantReportRow[]) =>
    [...rows].sort((a, b) => {
      const org = a.organizationName.localeCompare(b.organizationName, 'es')
      if (org !== 0) return org
      return a.fullName.localeCompare(b.fullName, 'es')
    })

  const groups: { sector: string; participants: ParticipantReportRow[] }[] = []

  for (const sector of SECTORS) {
    groups.push({
      sector,
      participants: sortParticipants(bySector.get(sector) ?? []),
    })
    bySector.delete(sector)
  }

  const remaining = [...bySector.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  for (const [sector, rows] of remaining) {
    groups.push({ sector, participants: sortParticipants(rows) })
  }

  return groups
}

export function sortParticipantsForExcel(
  participants: ParticipantReportRow[],
): ParticipantReportRow[] {
  const sectorOrder = new Map<string, number>(
    SECTORS.map((sector, index) => [sector, index]),
  )

  return [...participants].sort((a, b) => {
    const sectorA = sectorOrder.get(a.sector) ?? Number.MAX_SAFE_INTEGER
    const sectorB = sectorOrder.get(b.sector) ?? Number.MAX_SAFE_INTEGER
    if (sectorA !== sectorB) return sectorA - sectorB
    const org = a.organizationName.localeCompare(b.organizationName, 'es')
    if (org !== 0) return org
    return a.fullName.localeCompare(b.fullName, 'es')
  })
}

export function formatParticipantJoinDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}
