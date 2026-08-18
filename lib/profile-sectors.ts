import { SECTORS } from '@/lib/event-config'

export const MAX_PROFILE_SECTORS = 3

/** Normaliza hasta 3 sectores; usa `sector` legacy si no hay arreglo. */
export function normalizeProfileSectors(
  sectors: string[] | null | undefined,
  legacySector?: string | null,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of sectors ?? []) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
    if (result.length >= MAX_PROFILE_SECTORS) break
  }

  if (result.length > 0) return result

  const legacy = legacySector?.trim()
  return legacy ? [legacy] : []
}

export function profileHasSector(profile: { sector?: string; sectors?: string[] | null }): boolean {
  return normalizeProfileSectors(profile.sectors, profile.sector).length > 0
}

export function syncProfileSectorFields(sectors: string[]): {
  sectors: string[]
  sector: string
} {
  const normalized = normalizeProfileSectors(sectors)
  return {
    sectors: normalized,
    sector: normalized[0] ?? '',
  }
}

export function toggleProfileSector(
  current: string[],
  sector: string,
  options?: { minSelection?: number },
): string[] {
  const minSelection = options?.minSelection ?? 1

  if (current.includes(sector)) {
    if (current.length <= minSelection) return current
    return current.filter((item) => item !== sector)
  }

  if (current.length >= MAX_PROFILE_SECTORS) return current
  return [...current, sector]
}

export function participantSectors(participant: {
  sectors?: string[] | null
  sector?: string | null
}): string[] {
  return normalizeProfileSectors(participant.sectors, participant.sector)
}

export function isKnownSector(value: string): boolean {
  return (SECTORS as readonly string[]).includes(value)
}
