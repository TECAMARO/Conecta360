import { supabase } from '@/src/lib/supabaseClient'
import { isMasterAdminEmail } from '@/lib/admin-auth/constants'
import { getAuthSession, setAuthSession, type AuthSession } from '@/lib/auth'
import {
  DELEGATE_CANNOT_REGISTER_MESSAGE,
  REGISTRATION_CREDENTIAL_IN_USE_MESSAGE,
  mapRegistrationSignUpError,
} from '@/lib/delegate-access/constants'
import { EMPTY_PROFILE, setUserProfile } from '@/lib/profile'
import { normalizeProfileSectors } from '@/lib/profile-sectors'
import { upsertMyProfile } from '@/lib/supabase/profiles-repository'
import { notifyRegistrationAuditEmail } from '@/lib/email/notify-registration-audit-email'

async function clearDelegateContextCookie(): Promise<void> {
  try {
    await fetch('/api/auth/delegate-logout', { method: 'POST' })
  } catch {
    /* ignore */
  }
}

async function tryDelegateLogin(email: string, password: string): Promise<AuthSession | null> {
  const res = await fetch('/api/auth/delegate-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  let data: {
    ok?: boolean
    error?: string
    access_token?: string
    refresh_token?: string
    ownerUserId?: string
    ownerEmail?: string
    delegateEmail?: string
  }

  try {
    data = (await res.json()) as typeof data
  } catch {
    throw new Error('No se pudo iniciar sesión (respuesta inválida del servidor).')
  }

  if (res.status === 401) return null

  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? 'No se pudo iniciar sesión.')
  }

  if (!data.access_token || !data.refresh_token || !data.ownerUserId) {
    throw new Error(data.error ?? 'No se pudo establecer la sesión delegada.')
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  const session: AuthSession = {
    email: data.delegateEmail ?? email,
    userId: data.ownerUserId,
    isDelegate: true,
    ownerEmail: data.ownerEmail,
    organization: undefined,
  }
  setAuthSession(session)
  return session
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error && data.user) {
    await clearDelegateContextCookie()
    const session: AuthSession = {
      email: data.user.email ?? email,
      userId: data.user.id,
      organization: data.user.user_metadata?.organization as string | undefined,
    }
    setAuthSession(session)
    return session
  }

  try {
    const delegateSession = await tryDelegateLogin(email, password)
    if (delegateSession) return delegateSession
  } catch (delegateErr) {
    throw delegateErr instanceof Error
      ? delegateErr
      : new Error('No se pudo iniciar sesión como delegado.')
  }

  throw new Error('Credenciales inválidas.')
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
  try {
    const checkRes = await fetch('/api/access/check-registration-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: args.email }),
    })
    if (checkRes.ok) {
      const checkData = (await checkRes.json()) as {
        available?: boolean
        message?: string
      }
      if (checkData.available === false) {
        throw new Error(checkData.message ?? REGISTRATION_CREDENTIAL_IN_USE_MESSAGE)
      }
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === REGISTRATION_CREDENTIAL_IN_USE_MESSAGE ||
        err.message === DELEGATE_CANNOT_REGISTER_MESSAGE)
    ) {
      throw err
    }
    /* Fallo técnico del pre-check: continuar con signUp (trigger SQL + Auth). */
  }

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

  if (error) {
    throw new Error(mapRegistrationSignUpError(error.message))
  }

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

  let isDelegate = false
  let delegateEmail: string | undefined
  let ownerEmail: string | undefined

  try {
    const res = await fetch('/api/auth/delegate-context')
    if (res.ok) {
      const ctx = (await res.json()) as {
        isDelegate?: boolean
        delegateEmail?: string
        ownerEmail?: string | null
      }
      isDelegate = Boolean(ctx.isDelegate)
      delegateEmail = ctx.delegateEmail
      ownerEmail = ctx.ownerEmail ?? undefined
    }
  } catch {
    const stored = getAuthSession()
    isDelegate = Boolean(stored?.isDelegate && stored.userId === user.id)
    delegateEmail = isDelegate ? stored?.email : undefined
    ownerEmail = isDelegate ? stored?.ownerEmail : undefined
  }

  const session: AuthSession = {
    email: isDelegate ? (delegateEmail ?? user.email ?? '') : (user.email ?? ''),
    userId: user.id,
    organization: isDelegate
      ? undefined
      : ((user.user_metadata?.organization as string | undefined) ?? undefined),
    isDelegate: isDelegate || undefined,
    ownerEmail: isDelegate ? ownerEmail : undefined,
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
  try {
    await clearDelegateContextCookie()
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut()
}
