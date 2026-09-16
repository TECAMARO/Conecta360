import type { User } from '@supabase/supabase-js'
import { normalizeDelegateEmail } from '@/lib/delegate-access/constants'
import type { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

type ServiceClient = ReturnType<typeof createServiceRoleSupabaseClient>

export async function findAuthUserByEmail(
  service: ServiceClient,
  email: string,
): Promise<User | null> {
  const normalized = normalizeDelegateEmail(email)
  if (!normalized) return null

  let page = 1
  const perPage = 1000

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    )
    if (match) return match

    if (data.users.length < perPage) break
    page += 1
  }

  return null
}
