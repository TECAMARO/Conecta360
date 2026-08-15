import type { Participant } from '@/lib/data'

let registry: Participant[] = []

function mergeParticipantFields(existing: Participant, incoming: Participant): Participant {
  return {
    ...existing,
    ...incoming,
    avatarUrl: incoming.avatarUrl?.trim() ? incoming.avatarUrl : existing.avatarUrl ?? null,
    brochure: incoming.brochure ?? existing.brochure ?? null,
    description: incoming.description?.trim() ? incoming.description : existing.description,
    offer: incoming.offer.length > 0 ? incoming.offer : existing.offer,
    seeking: incoming.seeking.length > 0 ? incoming.seeking : existing.seeking,
    needs: incoming.needs.length > 0 ? incoming.needs : existing.needs,
    fullName: incoming.fullName?.trim() ? incoming.fullName : existing.fullName,
    role: incoming.role?.trim() ? incoming.role : existing.role,
    sector: incoming.sector?.trim() ? incoming.sector : existing.sector,
    location: incoming.location?.trim() ? incoming.location : existing.location,
    name:
      incoming.name?.trim() && incoming.name !== 'Organización participante'
        ? incoming.name
        : existing.name,
  }
}

export function setParticipantRegistry(next: Participant[]) {
  registry = next
}

export function mergeParticipantRegistry(next: Participant[]) {
  const byId = new Map(registry.map((p) => [p.id, p]))
  for (const p of next) {
    const existing = byId.get(p.id)
    byId.set(p.id, existing ? mergeParticipantFields(existing, p) : p)
  }
  registry = Array.from(byId.values())
}

export function participantById(id: string): Participant | undefined {
  return registry.find((p) => p.id === id)
}

export function getParticipantRegistry(): Participant[] {
  return registry
}

export function clearParticipantRegistry() {
  registry = []
}
