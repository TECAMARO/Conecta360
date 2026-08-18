export type VerityStatus = 'blue' | 'green' | 'red'

export const DEFAULT_VERITY_STATUS: VerityStatus = 'blue'

/** Mensaje genérico (no revela el bloqueo Verity al usuario). */
export const VERITY_BLOCKED_SILENT_MESSAGE =
  'No puedes enviar más solicitudes de reunión en este momento.'

export function normalizeVerityStatus(value: string | null | undefined): VerityStatus {
  if (value === 'green' || value === 'red') return value
  return 'blue'
}

export function isVerityBlocked(status: VerityStatus | undefined | null): boolean {
  return status === 'red'
}
