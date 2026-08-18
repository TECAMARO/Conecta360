import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
  normalizeDelegateEmail,
} from '@/lib/delegate-access/constants'
import { createDelegateAccessForOwner } from '@/lib/delegate-access/create-delegate-access'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import {
  clearDelegateSessionCookieOptions,
  parseDelegateSessionCookie,
} from '@/lib/delegate-access/delegate-cookie'
import { DELEGATE_SESSION_COOKIE } from '@/lib/delegate-access/constants'
import {
  hashDelegatePassword,
  isDelegatePasswordStrongEnough,
} from '@/lib/delegate-access/password'

export const runtime = 'nodejs'

type DelegateAccessRow = {
  id: string
  owner_profile_id: string
  email: string
  password_hash: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

function isOwnerSessionBlockedByDelegateCookie(
  userId: string,
  delegateCtx: Awaited<ReturnType<typeof parseDelegateSessionCookie>>,
): boolean {
  return Boolean(delegateCtx && delegateCtx.ownerUserId === userId)
}

function mapRpcCreateError(message: string): string {
  const upper = message.toUpperCase()
  if (
    upper.includes('EMAIL_NOT_AVAILABLE') ||
    upper.includes('DELEGATE_EMAIL_SAME_AS_OWNER')
  ) {
    return DELEGATE_EMAIL_UNAVAILABLE_MESSAGE
  }
  if (upper.includes('NOT_AUTHENTICATED')) {
    return 'No autorizado.'
  }
  if (upper.includes('CREATE_PROFILE_DELEGATED_ACCESS')) {
    return 'Falta ejecutar la función create_profile_delegated_access en Supabase (profile-delegated-access.sql).'
  }
  return message
}

/** Lista accesos delegados del titular autenticado. */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const delegateCtx = await parseDelegateSessionCookie(
      cookieStore.get(DELEGATE_SESSION_COOKIE)?.value,
    )
    if (isOwnerSessionBlockedByDelegateCookie(user.id, delegateCtx)) {
      return NextResponse.json({ error: 'Acción no permitida en sesión delegada.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('profile_delegated_access')
      .select('id, email, is_active, created_at, last_used_at')
      .eq('owner_profile_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ delegates: data ?? [] })
  } catch (err) {
    console.error('[access/delegates GET]', err)
    return NextResponse.json({ error: 'Error al cargar accesos.' }, { status: 500 })
  }
}

/** Crea un acceso delegado para el titular autenticado. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string }
    const email = body.email?.trim() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios.' }, { status: 400 })
    }

    if (!isDelegatePasswordStrongEnough(password)) {
      return NextResponse.json(
        { error: 'La contraseña delegada debe tener al menos 8 caracteres.' },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const delegateCtx = await parseDelegateSessionCookie(
      cookieStore.get(DELEGATE_SESSION_COOKIE)?.value,
    )
    if (isOwnerSessionBlockedByDelegateCookie(user.id, delegateCtx)) {
      return NextResponse.json({ error: 'Acción no permitida en sesión delegada.' }, { status: 403 })
    }

    const passwordHash = await hashDelegatePassword(password)

    let serviceClient
    try {
      serviceClient = createServiceRoleSupabaseClient()
    } catch (serviceErr) {
      console.warn('[access/delegates POST] service role unavailable:', serviceErr)
      const { data: rpcRow, error: rpcOnlyError } = await supabase.rpc(
        'create_profile_delegated_access',
        { p_email: email, p_password_hash: passwordHash },
      )

      if (rpcOnlyError || !rpcRow) {
        return NextResponse.json(
          {
            error: mapRpcCreateError(
              rpcOnlyError?.message ??
                'No se pudo crear el acceso. Ejecuta profile-delegated-access.sql en Supabase.',
            ),
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ ok: true, delegate: rpcRow })
    }

    const result = await createDelegateAccessForOwner({
      ownerUserId: user.id,
      ownerEmail: user.email ?? '',
      email,
      passwordHash,
      userClient: supabase,
      serviceClient,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ ok: true, delegate: result.delegate })
  } catch (err) {
    console.error('[access/delegates POST]', err)
    const message =
      err instanceof Error
        ? err.message
        : 'No se pudo crear el acceso delegado.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Revoca un acceso delegado (is_active = false). */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: string }
    const id = body.id?.trim()
    if (!id) {
      return NextResponse.json({ error: 'id requerido.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const delegateCtx = await parseDelegateSessionCookie(
      cookieStore.get(DELEGATE_SESSION_COOKIE)?.value,
    )
    if (isOwnerSessionBlockedByDelegateCookie(user.id, delegateCtx)) {
      return NextResponse.json({ error: 'Acción no permitida en sesión delegada.' }, { status: 403 })
    }

    const service = createServiceRoleSupabaseClient()
    const { data: row, error: fetchError } = await service
      .from('profile_delegated_access')
      .select('id, owner_profile_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!row || row.owner_profile_id !== user.id) {
      return NextResponse.json({ error: 'Acceso no encontrado.' }, { status: 404 })
    }

    const { error: updateError } = await service
      .from('profile_delegated_access')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[access/delegates DELETE]', err)
    return NextResponse.json({ error: 'No se pudo revocar el acceso.' }, { status: 500 })
  }
}

export type { DelegateAccessRow }
