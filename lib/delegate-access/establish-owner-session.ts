import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type VerifyOtpParams = {
  email?: string
  token?: string
  token_hash?: string
  type: 'email' | 'magiclink'
}

type GoTrueAuthResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  user?: Session['user']
  error?: string
  error_description?: string
  msg?: string
}

function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  return { url, anonKey }
}

function sessionFromGoTrueResponse(payload: GoTrueAuthResponse): Session | null {
  if (!payload.access_token || !payload.user) return null
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? '',
    expires_in: payload.expires_in ?? 3600,
    token_type: payload.token_type ?? 'bearer',
    user: payload.user,
  }
}

async function tryVerifyViaGoTrueHttp(body: Record<string, string>): Promise<Session | null> {
  const { url, anonKey } = getSupabaseAuthConfig()

  const res = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  })

  const payload = (await res.json()) as GoTrueAuthResponse
  if (!res.ok) {
    return null
  }

  return sessionFromGoTrueResponse(payload)
}

function createEphemeralAnonClient() {
  const { url, anonKey } = getSupabaseAuthConfig()

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function tryVerifyOtp(
  client: SupabaseClient,
  params: VerifyOtpParams,
): Promise<Session | null> {
  const { data, error } = await client.auth.verifyOtp(params)
  if (error || !data.session) {
    return null
  }
  return data.session
}

/**
 * Emite sesión Supabase del titular tras validar credenciales delegadas.
 * Usa admin.generateLink + verifyOtp con varios métodos compatibles con GoTrue.
 */
export async function establishOwnerSessionForDelegate(args: {
  serviceClient: SupabaseClient
  ownerUserId: string
}): Promise<{ session: Session; ownerEmail: string }> {
  const { serviceClient, ownerUserId } = args

  const { data: ownerAuth, error: ownerAuthError } =
    await serviceClient.auth.admin.getUserById(ownerUserId)

  const ownerEmail = ownerAuth?.user?.email?.trim()
  if (ownerAuthError || !ownerEmail) {
    throw new Error(
      ownerAuthError?.message ?? 'No se encontró el correo del titular en Supabase Auth.',
    )
  }

  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail,
  })

  if (linkError) {
    throw new Error(linkError.message)
  }

  const props = linkData?.properties
  const hashedToken = props?.hashed_token?.trim()
  const emailOtp = props?.email_otp?.trim()

  if (!hashedToken && !emailOtp) {
    throw new Error('Supabase no devolvió token para iniciar sesión del titular.')
  }

  const anonClient = createEphemeralAnonClient()
  const verifyClients = [anonClient, serviceClient]

  if (hashedToken) {
    const hashAttempts: VerifyOtpParams[] = [
      { email: ownerEmail, token_hash: hashedToken, type: 'email' },
      { token_hash: hashedToken, type: 'email' },
      { email: ownerEmail, token_hash: hashedToken, type: 'magiclink' },
      { token_hash: hashedToken, type: 'magiclink' },
    ]

    for (const client of verifyClients) {
      for (const params of hashAttempts) {
        const session = await tryVerifyOtp(client, params)
        if (session?.access_token) {
          return { session, ownerEmail }
        }
      }
    }

    const httpHashAttempts: Record<string, string>[] = [
      { email: ownerEmail, token_hash: hashedToken, type: 'email' },
      { token_hash: hashedToken, type: 'email' },
      { email: ownerEmail, token_hash: hashedToken, type: 'magiclink' },
      { token_hash: hashedToken, type: 'magiclink' },
    ]

    for (const body of httpHashAttempts) {
      const session = await tryVerifyViaGoTrueHttp(body)
      if (session?.access_token) {
        return { session, ownerEmail }
      }
    }
  }

  if (emailOtp) {
    const otpParams: VerifyOtpParams = {
      email: ownerEmail,
      token: emailOtp,
      type: 'email',
    }

    for (const client of verifyClients) {
      const session = await tryVerifyOtp(client, otpParams)
      if (session?.access_token) {
        return { session, ownerEmail }
      }
    }

    const session = await tryVerifyViaGoTrueHttp({
      email: ownerEmail,
      token: emailOtp,
      type: 'email',
    })
    if (session?.access_token) {
      return { session, ownerEmail }
    }
  }

  throw new Error(
    'No se pudo establecer la sesión del titular. Revisa la configuración de Auth en Supabase.',
  )
}
