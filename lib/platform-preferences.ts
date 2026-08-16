export type PlatformLogoVariant = 'primary' | 'alternate'
export type PlatformTheme = 'light' | 'dark'

export type PlatformPreferences = {
  logo: PlatformLogoVariant
  theme: PlatformTheme
}

const STORAGE_PREFIX = 'conecta360:platform-prefs'

const DEFAULT_PREFERENCES: PlatformPreferences = {
  logo: 'primary',
  theme: 'light',
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

export function loadPlatformPreferences(userId: string | null | undefined): PlatformPreferences {
  if (!userId || typeof window === 'undefined') return { ...DEFAULT_PREFERENCES }

  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<PlatformPreferences>
    return {
      logo: parsed.logo === 'alternate' ? 'alternate' : 'primary',
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function savePlatformPreferences(
  userId: string,
  patch: Partial<PlatformPreferences>,
): PlatformPreferences {
  const current = loadPlatformPreferences(userId)
  const next: PlatformPreferences = {
    logo: patch.logo ?? current.logo,
    theme: patch.theme ?? current.theme,
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next))
    } catch {
      /* ignore quota */
    }
  }

  return next
}

export function platformLogoSrc(variant: PlatformLogoVariant): string {
  return variant === 'alternate' ? '/logo2.png' : '/logo.png'
}

export const PLATFORM_PREFS_UPDATED_EVENT = 'conecta360-platform-prefs-updated'

export function notifyPlatformPreferencesUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PLATFORM_PREFS_UPDATED_EVENT))
}
