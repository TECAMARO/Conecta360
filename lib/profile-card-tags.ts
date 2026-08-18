export const MAX_PROFILE_CARD_TAGS = 5

/** Mantiene solo etiquetas válidas y dentro del límite de tarjeta. */
export function pruneProfileCardTags(
  allTags: string[],
  cardTags: string[] | null | undefined,
): string[] {
  const allowed = new Set(allTags)
  return (cardTags ?? []).filter((tag) => allowed.has(tag)).slice(0, MAX_PROFILE_CARD_TAGS)
}

function stableHash(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Mezcla determinista: misma semilla → mismo orden (estable en tarjeta y recargas). */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items]
  let state = stableHash(seed) || 1

  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    const j = state % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr
}

/** Hasta 5 etiquetas auto-seleccionadas cuando el usuario no marcó ninguna casilla. */
export function pickDefaultCardTags(allTags: string[], seed: string): string[] {
  if (allTags.length === 0) return []
  if (allTags.length <= MAX_PROFILE_CARD_TAGS) return [...allTags]
  return seededShuffle(allTags, seed).slice(0, MAX_PROFILE_CARD_TAGS)
}

/**
 * Etiquetas visibles en la tarjeta de Explorar Participantes.
 * Si hay checks marcados → esas (máx. 5).
 * Si no hay ninguno pero sí etiquetas en el perfil → hasta 5 auto-seleccionadas (estables por usuario).
 */
export function resolveProfileCardTags(
  allTags: string[],
  cardTags: string[] | null | undefined,
  seed?: string,
): string[] {
  const selected = pruneProfileCardTags(allTags, cardTags)
  if (selected.length > 0) return selected
  if (allTags.length === 0) return []
  if (seed) return pickDefaultCardTags(allTags, seed)
  return allTags.slice(0, MAX_PROFILE_CARD_TAGS)
}

export function toggleProfileCardTag(
  cardTags: string[] | null | undefined,
  tag: string,
  max = MAX_PROFILE_CARD_TAGS,
): string[] {
  const current = cardTags ?? []
  if (current.includes(tag)) {
    return current.filter((item) => item !== tag)
  }
  if (current.length >= max) return current
  return [...current, tag]
}
