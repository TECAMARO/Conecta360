import {
  DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
  normalizeDelegateEmail,
} from '@/lib/delegate-access/constants'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Comprueba si el correo puede usarse como acceso delegado. */
export async function isDelegateEmailAvailable(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const normalized = normalizeDelegateEmail(email)
  if (!normalized) return false

  const { data: rpcAvailable, error: rpcError } = await supabase.rpc(
    'check_email_available_for_delegate',
    { p_email: email },
  )

  if (!rpcError && typeof rpcAvailable === 'boolean') {
    return rpcAvailable
  }

  const { data: delegated } = await supabase
    .from('profile_delegated_access')
    .select('id')
    .eq('email_normalized', normalized)
    .eq('is_active', true)
    .maybeSingle()

  return !delegated
}

export type CreateDelegateAccessResult =
  | { ok: true; delegate: Record<string, unknown> }
  | { ok: false; error: string; status: number }

/** Crea o reactiva un acceso delegado (RPC titular → fallback service role). */
export async function createDelegateAccessForOwner(args: {
  ownerUserId: string
  ownerEmail: string
  email: string
  passwordHash: string
  userClient: SupabaseClient
  serviceClient: SupabaseClient
}): Promise<CreateDelegateAccessResult> {
  const { ownerUserId, ownerEmail, email, passwordHash, userClient, serviceClient } = args
  const normalized = normalizeDelegateEmail(email)

  if (normalized === normalizeDelegateEmail(ownerEmail)) {
    return {
      ok: false,
      status: 409,
      error: DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
    }
  }

  const available = await isDelegateEmailAvailable(userClient, email)
  if (!available) {
    return {
      ok: false,
      status: 409,
      error: DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
    }
  }

  const { data: rpcRow, error: rpcError } = await userClient.rpc(
    'create_profile_delegated_access',
    {
      p_email: email,
      p_password_hash: passwordHash,
    },
  )

  if (!rpcError && rpcRow) {
    return { ok: true, delegate: rpcRow as Record<string, unknown> }
  }

  if (rpcError && !rpcError.message.includes('Could not find the function')) {
    console.warn('[createDelegateAccessForOwner] RPC:', rpcError.message)
  }

  const { data: existing } = await serviceClient
    .from('profile_delegated_access')
    .select('id, owner_profile_id, is_active')
    .eq('email_normalized', normalized)
    .maybeSingle()

  if (existing && existing.owner_profile_id !== ownerUserId) {
    return {
      ok: false,
      status: 409,
      error: DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
    }
  }

  if (existing && existing.owner_profile_id === ownerUserId) {
    const { data: reactivated, error: updateError } = await serviceClient
      .from('profile_delegated_access')
      .update({
        email,
        password_hash: passwordHash,
        is_active: true,
        created_by: ownerUserId,
      })
      .eq('id', existing.id)
      .select('id, email, is_active, created_at, last_used_at')
      .single()

    if (updateError) {
      return {
        ok: false,
        status: 500,
        error: mapDelegateInsertError(updateError.message),
      }
    }

    return { ok: true, delegate: reactivated as Record<string, unknown> }
  }

  const { data: inserted, error: insertError } = await serviceClient
    .from('profile_delegated_access')
    .insert({
      owner_profile_id: ownerUserId,
      email,
      password_hash: passwordHash,
      is_active: true,
      created_by: ownerUserId,
    })
    .select('id, email, is_active, created_at, last_used_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
      }
    }
    return {
      ok: false,
      status: 500,
      error: mapDelegateInsertError(insertError.message),
    }
  }

  return { ok: true, delegate: inserted as Record<string, unknown> }
}

function mapDelegateInsertError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('profile_delegated_access') && lower.includes('schema cache')) {
    return 'Falta ejecutar supabase/profile-delegated-access.sql en Supabase SQL Editor.'
  }
  if (lower.includes('invalid api key') || lower.includes('jwt')) {
    return 'Clave SUPABASE_SERVICE_ROLE_KEY inválida o incompleta en .env.local.'
  }
  if (lower.includes('delegate_email_same_as_owner')) {
    return DELEGATE_EMAIL_UNAVAILABLE_MESSAGE
  }
  return message
}
