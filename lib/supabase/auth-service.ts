import { supabase } from '@/src/lib/supabaseClient'
import { isMasterAdminEmail } from '@/lib/admin-auth/constants'
import { setAuthSession, type AuthSession } from '@/lib/auth'
import { EMPTY_PROFILE, setUserProfile } from '@/lib/profile'
import { upsertMyProfile } from '@/lib/supabase/profiles-repository'

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

/** Tras login del Admin Maestro: emite OTP y prepara verificación 2FA. */
export async function initiateMasterAdminOtpFlow(): Promise<void> {
  const res = await fetch('/api/auth/admin-otp/send', { method: 'POST' })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error ?? 'No se pudo enviar el código de verificación.')
  }
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
  sector: string
}): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: args.fullName,
        organization: args.organization,
        role: args.role,
        sector: args.sector,
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
    sector: args.sector,
  }

  await upsertMyProfile(profile, args.email, { skipRemoteMerge: true })
  setUserProfile(profile)

  const session: AuthSession = {
    email: args.email,
    userId: user.id,
    organization: args.organization,
  }
  setAuthSession(session)
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
