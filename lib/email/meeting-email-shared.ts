import type { ProfileRow } from '@/lib/supabase/database.types'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function displayOrg(profile: Pick<ProfileRow, 'organization_name' | 'full_name' | 'email'>): string {
  return (
    profile.organization_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email?.trim() ||
    'Organización participante'
  )
}

export function resolveEmailOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}
