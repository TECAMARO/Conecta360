import type { Participant } from '@/lib/data'
import { SECTORS, type Sector } from '@/lib/event-config'
import { participantSectors } from '@/lib/profile-sectors'

export const ALL_SECTORS_FILTER = 'todas' as const
export type SectorFilterValue = typeof ALL_SECTORS_FILTER | Sector

/** Shown horizontally beside "Todas" before opening advanced picker. */
export const FEATURED_SECTORS: Sector[] = [
  'Biodiversidad y conservación',
  'Energías renovables',
  'Sostenibilidad',
  'Proyectos Sostenibles',
  'Agroindustria',
  'Tecnología e innovación',
]

export { SECTORS as DIRECTORY_SECTORS }

export function participantMatchesSectorFilter(
  participant: Participant,
  filter: SectorFilterValue,
): boolean {
  if (filter === ALL_SECTORS_FILTER) return true

  const sector = filter.toLowerCase()
  if (participantSectors(participant).some((item) => item.toLowerCase() === sector)) return true

  const corpus = [
    ...participantSectors(participant),
    participant.description,
    ...participant.offer,
    ...participant.seeking,
  ]
    .join(' ')
    .toLowerCase()

  if (corpus.includes(sector)) return true

  const tokens = sector
    .split(/[/,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3)

  return tokens.some((token) => corpus.includes(token))
}

export function filterParticipantsByQuery(
  list: Participant[],
  query: string,
  sectorFilter: SectorFilterValue,
): Participant[] {
  const q = query.trim().toLowerCase()
  return list.filter((p) => {
    const matchSector = participantMatchesSectorFilter(p, sectorFilter)
    if (!matchSector) return false
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (participantSectors(p).some((sector) => sector.toLowerCase().includes(q)) ?? false) ||
      p.offer.some((o) => o.toLowerCase().includes(q)) ||
      p.seeking.some((s) => s.toLowerCase().includes(q))
    )
  })
}
