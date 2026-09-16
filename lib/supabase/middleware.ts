import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_2FA_COOKIE, isMasterAdminEmail } from '@/lib/admin-auth/constants'
import { isValidAdmin2faCookie } from '@/lib/admin-auth/otp-cookie'
import { ADMIN_SUPPORT_2FA_COOKIE } from '@/lib/admin-auth/support-constants'
import { isValidAdminSupport2faCookie } from '@/lib/admin-auth/support-otp-cookie'
import type { Database } from '@/lib/supabase/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isSupportRoute = pathname.startsWith('/admin/support')
  const isVerifySupportRoute = pathname.startsWith('/login/verify-admin-support')
  const isVerifyAdminRoute =
    pathname.startsWith('/login/verify-admin') && !isVerifySupportRoute

  if (!isAdminRoute && !isVerifyAdminRoute && !isVerifySupportRoute) {
    return supabaseResponse
  }

  if (!user?.email) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', isAdminRoute ? pathname : '/admin')
    return NextResponse.redirect(loginUrl)
  }

  const masterAdmin = isMasterAdminEmail(user.email)

  const adminTwoFaOk = await isValidAdmin2faCookie(
    request.cookies.get(ADMIN_2FA_COOKIE)?.value,
    user.id,
  )

  if (isVerifyAdminRoute) {
    if (!masterAdmin) {
      return new NextResponse(null, { status: 404 })
    }

    if (adminTwoFaOk) {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin'
      adminUrl.search = ''
      return NextResponse.redirect(adminUrl)
    }

    return supabaseResponse
  }

  if (isVerifySupportRoute) {
    if (!masterAdmin) {
      return new NextResponse(null, { status: 404 })
    }

    if (!adminTwoFaOk) {
      const verifyUrl = request.nextUrl.clone()
      verifyUrl.pathname = '/login/verify-admin'
      verifyUrl.searchParams.set('redirect', '/login/verify-admin-support')
      return NextResponse.redirect(verifyUrl)
    }

    const supportTwoFaOk = await isValidAdminSupport2faCookie(
      request.cookies.get(ADMIN_SUPPORT_2FA_COOKIE)?.value,
      user.id,
    )

    if (supportTwoFaOk) {
      const supportUrl = request.nextUrl.clone()
      supportUrl.pathname = '/admin/support'
      supportUrl.search = ''
      return NextResponse.redirect(supportUrl)
    }

    return supabaseResponse
  }

  // /admin/*
  if (!masterAdmin) {
    return new NextResponse(null, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return new NextResponse(null, { status: 404 })
  }

  if (!adminTwoFaOk) {
    const verifyUrl = request.nextUrl.clone()
    verifyUrl.pathname = '/login/verify-admin'
    verifyUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(verifyUrl)
  }

  if (isSupportRoute) {
    const supportTwoFaOk = await isValidAdminSupport2faCookie(
      request.cookies.get(ADMIN_SUPPORT_2FA_COOKIE)?.value,
      user.id,
    )

    if (!supportTwoFaOk) {
      const verifyUrl = request.nextUrl.clone()
      verifyUrl.pathname = '/login/verify-admin-support'
      verifyUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(verifyUrl)
    }
  }

  return supabaseResponse
}
