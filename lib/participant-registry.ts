import type { Participant } from '@/lib/data'

let registry: Participant[] = []

export function setParticipantRegistry(next: Participant[]) {
  registry = next
}

export function mergeParticipantRegistry(next: Participant[]) {
  const byId = new Map(registry.map((p) => [p.id, p]))
  for (const p of next) byId.set(p.id, p)
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
