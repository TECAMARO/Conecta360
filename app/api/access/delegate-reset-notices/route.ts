import { NextResponse } from 'next/server'
import { decryptSupportPassword } from '@/lib/admin-support/credential-vault'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type NoticeRow = {
  id: string
  delegate_access_id: string
  delegate_email: string
  password_ciphertext: string
  password_iv: string
  password_tag: string
  created_at: string
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('delegate_password_reset_notices')
      .select(
        'id, delegate_access_id, delegate_email, password_ciphertext, password_iv, password_tag, created_at',
      )
      .eq('owner_profile_id', user.id)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notices = ((data ?? []) as NoticeRow[]).map((row) => {
      let password: string | null = null
      try {
        password = decryptSupportPassword({
          ciphertext: row.password_ciphertext,
          iv: row.password_iv,
          tag: row.password_tag,
        })
      } catch {
        password = null
      }

      return {
        id: row.id,
        delegateAccessId: row.delegate_access_id,
        delegateEmail: row.delegate_email,
        password,
        createdAt: row.created_at,
      }
    })

    return NextResponse.json({ notices })
  } catch (err) {
    console.error('[delegate-reset-notices GET]', err)
    return NextResponse.json({ error: 'Error al cargar avisos.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { noticeId?: string }
    const noticeId = body.noticeId?.trim()
    if (!noticeId) {
      return NextResponse.json({ error: 'ID de aviso requerido.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { error } = await supabase
      .from('delegate_password_reset_notices')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', noticeId)
      .eq('owner_profile_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[delegate-reset-notices PATCH]', err)
    return NextResponse.json({ error: 'Error al descartar aviso.' }, { status: 500 })
  }
}
