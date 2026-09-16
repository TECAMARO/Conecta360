'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupportUserCredential } from '@/lib/admin-support/fetch-support-credentials'
import { fetchCurrentUserIsAdmin } from '@/lib/supabase/admin-repository'
import { AdminShell } from '@/components/admin/admin-shell'
import { SupportPasswordField } from '@/components/admin/support-password-field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Building2, Loader2, RefreshCw, Search, ShieldAlert, UserRound } from 'lucide-react'

export function AdminSupportDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [users, setUsers] = useState<SupportUserCredential[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadCredentials = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/admin/support/credentials')
    const data = (await res.json()) as {
      error?: string
      users?: SupportUserCredential[]
    }

    if (!res.ok) {
      throw new Error(data.error ?? 'No se pudieron cargar las credenciales.')
    }

    setUsers(data.users ?? [])
  }, [])

  useEffect(() => {
    async function bootstrap() {
      const isAdmin = await fetchCurrentUserIsAdmin()
      setAuthorized(isAdmin)
      if (!isAdmin) {
        setLoading(false)
        return
      }

      try {
        await loadCredentials()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar Soporte.')
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [loadCredentials])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await loadCredentials()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar.')
    } finally {
      setRefreshing(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => {
      return (
        user.representativeName.toLowerCase().includes(q) ||
        user.organizationName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.delegates.some((delegate) => delegate.email.toLowerCase().includes(q))
      )
    })
  }, [users, query])

  if (authorized === null || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        Cargando Soporte…
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] px-6 text-center text-sm text-muted-foreground">
        No tienes acceso a esta sección.
      </div>
    )
  }

  return (
    <AdminShell
      title="Soporte · Credenciales"
      subtitle="Información delicada — acceso protegido con segundo OTP"
      refreshing={refreshing}
      onRefresh={() => void handleRefresh()}
    >
      <div className="rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-[#6b4f1d]">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Las contraseñas solo aparecen si fueron registradas en la bóveda cifrada al crear la
            cuenta o un acceso delegado. Cuentas anteriores pueden mostrar{' '}
            <strong>No disponible</strong>.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-[#dde8d8] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#1a3c34]">Participantes</h2>
            <p className="mt-1 text-sm text-[#5a6b62]">
              {filteredUsers.length} registro(s) · {users.length} total
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden="true" />
            Actualizar
          </Button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5a6b62]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar representante, empresa o correo…"
            className="w-full rounded-xl border border-[#dde8d8] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1a3c34] outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#dde8d8] text-xs uppercase tracking-wide text-[#5a6b62]">
                <th className="px-3 py-3 font-semibold">Representante</th>
                <th className="px-3 py-3 font-semibold">Empresa</th>
                <th className="px-3 py-3 font-semibold">Correo titular</th>
                <th className="px-3 py-3 font-semibold">Contraseña titular</th>
                <th className="px-3 py-3 font-semibold">Accesos delegados</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.profileId} className="border-b border-[#eef3ea] align-top">
                  <td className="px-3 py-4">
                    <span className="flex items-center gap-2 font-medium text-[#1a3c34]">
                      <UserRound className="size-4 text-[#8ac441]" aria-hidden="true" />
                      {user.representativeName}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <span className="flex items-center gap-2 text-[#3d5249]">
                      <Building2 className="size-4 text-[#8ac441]" aria-hidden="true" />
                      {user.organizationName}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-[#3d5249]">{user.email || '—'}</td>
                  <td className="px-3 py-4">
                    <SupportPasswordField
                      password={user.ownerPassword}
                      available={user.ownerPasswordAvailable}
                      label="contraseña titular"
                    />
                  </td>
                  <td className="px-3 py-4">
                    {user.delegates.length === 0 ? (
                      <span className="text-xs text-[#8a9a92]">Sin delegados</span>
                    ) : (
                      <ul className="space-y-3">
                        {user.delegates.map((delegate) => (
                          <li
                            key={delegate.id}
                            className="rounded-lg border border-[#dde8d8] bg-[#f8fbf8] px-3 py-2"
                          >
                            <p className="text-xs font-medium text-[#1a3c34]">{delegate.email}</p>
                            <div className="mt-1">
                              <SupportPasswordField
                                password={delegate.password}
                                available={delegate.passwordAvailable}
                                label="contraseña delegada"
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  )
}
