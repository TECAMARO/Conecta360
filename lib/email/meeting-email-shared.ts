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

export { getEmailSiteUrl, resolveEmailOrigin } from '@/lib/email/site-url'
