import { supabase } from '@/src/lib/supabaseClient'
import { isMasterAdminEmail } from '@/lib/admin-auth/constants'
import { setAuthSession, type AuthSession } from '@/lib/auth'
import { EMPTY_PROFILE, setUserProfile } from '@/lib/profile'
import { normalizeProfileSectors } from '@/lib/profile-sectors'
import { upsertMyProfile } from '@/lib/supabase/profiles-repository'
import { notifyRegistrationAuditEmail } from '@/lib/email/notify-registration-audit-email'

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const user = data.user
  if (!user) throw new Error('No se pudo iniciar sesión.')

  const session: AuthSession = {
    email: user.email ?? email,
    userId: user.id,
    organization: user.user_metadata?.organization as string | undefined,
  }
  setAuthSession(session)
  return session
}

/** Tras login del Admin Maestro: emite OTP (SQL + correo SMTP) y prepara 2FA. */
export async function initiateMasterAdminOtpFlow(): Promise<{ devCode?: string }> {
  const res = await fetch('/api/auth/admin-otp/send', { method: 'POST' })
  const data = (await res.json()) as { error?: string; devCode?: string }
  if (!res.ok) {
    throw new Error(data.error ?? 'No se pudo enviar el código de verificación.')
  }
  if (data.devCode && typeof window !== 'undefined') {
    sessionStorage.setItem('conecta360_admin_otp_dev', data.devCode)
  }
  return { devCode: data.devCode }
}

export function requiresMasterAdminOtp(email: string): boolean {
  return isMasterAdminEmail(email)
}

export async function signUpWithEmail(args: {
  email: string
  password: string
  fullName: string
  role: string
  organization: string
  sectors: string[]
}): Promise<AuthSession> {
  const normalizedSectors = normalizeProfileSectors(args.sectors)
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: args.fullName,
        organization: args.organization,
        role: args.role,
        sector: normalizedSectors[0] ?? '',
        sectors: normalizedSectors,
      },
    },
  })

  if (error) throw new Error(error.message)

  const user = data.user
  if (!user) throw new Error('No se pudo crear la cuenta.')

  const profile = {
    ...EMPTY_PROFILE,
    fullName: args.fullName,
    role: args.role,
    organization: args.organization,
    sector: normalizedSectors[0] ?? '',
    sectors: normalizedSectors,
  }

  await upsertMyProfile(profile, args.email, { skipRemoteMerge: true })
  setUserProfile(profile)

  const session: AuthSession = {
    email: args.email,
    userId: user.id,
    organization: args.organization,
  }
  setAuthSession(session)
  notifyRegistrationAuditEmail()
  return session
}

export async function restoreSupabaseSession(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null

  const session: AuthSession = {
    email: user.email ?? '',
    userId: user.id,
    organization: (user.user_metadata?.organization as string | undefined) ?? undefined,
  }
  setAuthSession(session)
  return session
}

export async function signOutSupabase(): Promise<void> {
  try {
    await fetch('/api/auth/admin-otp/logout', { method: 'POST' })
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut()
}
