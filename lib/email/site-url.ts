/** URL documentada en .env.example cuando falta NEXT_PUBLIC_SITE_URL en desarrollo. */
const DOCUMENTED_PRODUCTION_SITE_URL = 'https://conecta360.amaro.agency'

function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function readEnvSiteUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  return value ? normalizeSiteUrl(value) : undefined
}

function readVercelSiteUrl(): string | undefined {
  const host = process.env.VERCEL_URL?.trim()
  if (!host || host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return undefined
  }
  return normalizeSiteUrl(`https://${host}`)
}

function isLocalHost(host: string): boolean {
  const normalized = host.toLowerCase()
  return (
    normalized.startsWith('localhost') ||
    normalized.startsWith('127.0.0.1') ||
    normalized.endsWith('.local')
  )
}

function readRequestSiteUrl(request?: Request): string | undefined {
  if (!request) return undefined

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host || isLocalHost(host)) return undefined

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return normalizeSiteUrl(`${proto}://${host}`)
}

/**
 * URL base para enlaces en correos y `redirectTo` de Supabase Auth.
 * Prioriza NEXT_PUBLIC_SITE_URL; evita localhost salvo que esté explícito en env.
 */
export function getEmailSiteUrl(request?: Request): string {
  const fromEnv = readEnvSiteUrl()
  if (fromEnv) return fromEnv

  const fromVercel = readVercelSiteUrl()
  if (fromVercel) return fromVercel

  const fromRequest = readRequestSiteUrl(request)
  if (fromRequest) return fromRequest

  return DOCUMENTED_PRODUCTION_SITE_URL
}

/** Alias histórico usado por plantillas y APIs de correo. */
export function resolveEmailOrigin(request?: Request): string {
  return getEmailSiteUrl(request)
}
