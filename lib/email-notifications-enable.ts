const STORAGE_PREFIX = 'conecta360:email-notifications-enabled'
const DELEGATE_STORAGE_PREFIX = 'conecta360:delegate-email-notifications-enabled'

export const EMAIL_NOTIFICATIONS_ENABLED_EVENT = 'conecta360-email-notifications-enabled'

/** Tiempo visible de la insignia «Correo habilitado» antes del fade out. */
export const EMAIL_NOTIFICATIONS_BADGE_VISIBLE_MS = 10_000

/** Duración del degradado suave al ocultar la insignia. */
export const EMAIL_NOTIFICATIONS_BADGE_FADE_MS = 600

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

function delegateStorageKey(userId: string, delegateEmail: string): string {
  return `${DELEGATE_STORAGE_PREFIX}:${userId}:${delegateEmail.trim().toLowerCase()}`
}

function enabledAtKey(baseKey: string): string {
  return `${baseKey}:at`
}

export function isEmailNotificationsEnabled(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function isDelegateEmailNotificationsEnabled(
  userId: string | null | undefined,
  delegateEmail: string | null | undefined,
): boolean {
  if (!userId || !delegateEmail || typeof window === 'undefined') return false
  try {
    return localStorage.getItem(delegateStorageKey(userId, delegateEmail)) === '1'
  } catch {
    return false
  }
}

function getEnabledAt(baseKey: string): number | null {
  try {
    const raw = localStorage.getItem(enabledAtKey(baseKey))
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function getRemainingEmailBadgeVisibleMs(
  userId: string | null | undefined,
  options?: { delegateEmail?: string | null },
): number {
  if (!userId) return 0

  const baseKey = options?.delegateEmail
    ? delegateStorageKey(userId, options.delegateEmail)
    : storageKey(userId)

  const enabled = options?.delegateEmail
    ? isDelegateEmailNotificationsEnabled(userId, options.delegateEmail)
    : isEmailNotificationsEnabled(userId)

  if (!enabled) return 0

  const enabledAt = getEnabledAt(baseKey)
  if (!enabledAt) return 0
  return Math.max(0, EMAIL_NOTIFICATIONS_BADGE_VISIBLE_MS - (Date.now() - enabledAt))
}

export function shouldShowEmailNotificationsBadge(
  userId: string | null | undefined,
  options?: { delegateEmail?: string | null },
): boolean {
  return getRemainingEmailBadgeVisibleMs(userId, options) > 0
}

export function markEmailNotificationsEnabled(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = storageKey(userId)
    localStorage.setItem(key, '1')
    localStorage.setItem(enabledAtKey(key), String(Date.now()))
    window.dispatchEvent(new Event(EMAIL_NOTIFICATIONS_ENABLED_EVENT))
  } catch {
    /* ignore quota */
  }
}

export function markDelegateEmailNotificationsEnabled(
  userId: string,
  delegateEmail: string,
): void {
  if (typeof window === 'undefined') return
  try {
    const key = delegateStorageKey(userId, delegateEmail)
    localStorage.setItem(key, '1')
    localStorage.setItem(enabledAtKey(key), String(Date.now()))
    window.dispatchEvent(new Event(EMAIL_NOTIFICATIONS_ENABLED_EVENT))
  } catch {
    /* ignore quota */
  }
}

export function subscribeEmailNotificationsEnabled(
  userId: string | null | undefined,
  listener: () => void,
  options?: { delegateEmail?: string | null },
): () => void {
  if (typeof window === 'undefined') return () => {}

  const baseKey = options?.delegateEmail
    ? userId
      ? delegateStorageKey(userId, options.delegateEmail)
      : null
    : userId
      ? storageKey(userId)
      : null

  function onCustom() {
    listener()
  }

  function onStorage(event: StorageEvent) {
    if (!baseKey) return
    if (event.key === baseKey || event.key === enabledAtKey(baseKey)) listener()
  }

  window.addEventListener(EMAIL_NOTIFICATIONS_ENABLED_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EMAIL_NOTIFICATIONS_ENABLED_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
