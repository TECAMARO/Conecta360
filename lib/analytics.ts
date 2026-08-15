import { track } from '@vercel/analytics'

type AnalyticsEventProps = Record<string, string | number | boolean | null | undefined>

/**
 * Wrapper seguro para eventos personalizados de Vercel Web Analytics.
 * No-op en servidor; nunca lanza errores hacia la UI.
 */
export function trackEvent(name: string, properties?: AnalyticsEventProps): void {
  if (typeof window === 'undefined') return

  try {
    const payload = properties
      ? Object.fromEntries(
          Object.entries(properties).filter(([, value]) => value !== undefined),
        )
      : undefined
    track(name, payload)
  } catch {
    /* analytics must not break user flows */
  }
}
