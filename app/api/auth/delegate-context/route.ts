import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DELEGATE_SESSION_COOKIE } from '@/lib/delegate-access/constants'
import { parseDelegateSessionCookie } from '@/lib/delegate-access/delegate-cookie'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Devuelve contexto de sesión delegada (cookie httpOnly). */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ isDelegate: false })
    }

    const cookieStore = await cookies()
    const ctx = await parseDelegateSessionCookie(
      cookieStore.get(DELEGATE_SESSION_COOKIE)?.value,
    )

    if (!ctx || ctx.ownerUserId !== user.id) {
      return NextResponse.json({ isDelegate: false })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      isDelegate: true,
      delegateEmail: ctx.delegateEmail,
      ownerEmail: profile?.email ?? null,
      ownerUserId: ctx.ownerUserId,
    })
  } catch (err) {
    console.error('[auth/delegate-context]', err)
    return NextResponse.json({ isDelegate: false })
  }
}
