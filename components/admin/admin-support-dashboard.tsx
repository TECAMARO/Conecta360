'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupportUserCredential } from '@/lib/admin-support/fetch-support-credentials'
import { fetchCurrentUserIsAdmin } from '@/lib/supabase/admin-repository'
import { AdminShell } from '@/components/admin/admin-shell'
import { SupportPasswordField } from '@/components/admin/support-password-field'
import { SupportRegisterPasswordButton } from '@/components/admin/support-register-password-button'
import { SupportSendResetButton } from '@/components/admin/support-send-reset-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Building2,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserRound,
} from 'lucide-react'

function filterSupportUsers(users: SupportUserCredential[], query: string) {
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
}

type SupportCredentialsTableProps = {
  users: SupportUserCredential[]
  onRefresh: () => void
  onNotice: (message: string) => void
}

function SupportCredentialsTable({ users, onRefresh, onNotice }: SupportCredentialsTableProps) {
  if (users.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-[#8a9a92]">No hay registros en esta sección.</p>
    )
  }

  return (
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
          {users.map((user) => (
            <tr key={user.profileId} className="border-b border-[#eef3ea] align-top">
              <td className="px-3 py-4">
                <span className="flex items-center gap-2 font-medium text-[#1a3c34]">
                  {user.isAdmin ? (
                    <Shield className="size-4 text-amber-600" aria-hidden="true" />
                  ) : (
                    <UserRound className="size-4 text-[#8ac441]" aria-hidden="true" />
                  )}
                  {user.representativeName}
                  {user.isAdmin && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Admin
                    </span>
                  )}
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
                  registerAction={
                    !user.ownerPasswordAvailable ? (
                      <SupportRegisterPasswordButton
                        profileId={user.profileId}
                        credentialKind="owner"
                        onSaved={() => void onRefresh()}
                      />
                    ) : null
                  }
                />
                {user.email && (
                  <SupportSendResetButton
                    profileId={user.profileId}
                    credentialKind="owner"
                    onSent={(message) => {
                      onNotice(message)
                      void onRefresh()
                    }}
                  />
                )}
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
                            registerAction={
                              !delegate.passwordAvailable ? (
                                <SupportRegisterPasswordButton
                                  profileId={user.profileId}
                                  credentialKind="delegate"
                                  delegateAccessId={delegate.id}
                                  onSaved={() => void onRefresh()}
                                />
                              ) : null
                            }
                          />
                          <SupportSendResetButton
                            profileId={user.profileId}
                            credentialKind="delegate"
                            delegateAccessId={delegate.id}
                            onSent={(message) => {
                              onNotice(message)
                              void onRefresh()
                            }}
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
  )
}

export function AdminSupportDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [admins, setAdmins] = useState<SupportUserCredential[]>([])
  const [participants, setParticipants] = useState<SupportUserCredential[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadCredentials = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/admin/support/credentials')
    const data = (await res.json()) as {
      error?: string
      admins?: SupportUserCredential[]
      participants?: SupportUserCredential[]
    }

    if (!res.ok) {
      throw new Error(data.error ?? 'No se pudieron cargar las credenciales.')
    }

    setAdmins(data.admins ?? [])
    setParticipants(data.participants ?? [])
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

  const filteredAdmins = useMemo(
    () => filterSupportUsers(admins, query),
    [admins, query],
  )
  const filteredParticipants = useMemo(
    () => filterSupportUsers(participants, query),
    [participants, query],
  )
  const totalCount = admins.length + participants.length
  const filteredCount = filteredAdmins.length + filteredParticipants.length

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
            Supabase guarda contraseñas con hash irreversible: <strong>no se pueden extraer</strong>{' '}
            de la base de datos. La bóveda se llena al registrarse, al iniciar sesión, o si registras
            manualmente una contraseña conocida con el botón <strong>Registrar contraseña</strong>.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      )}

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

      <section className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#1a3c34]">Administradores</h2>
            <p className="mt-1 text-sm text-[#5a6b62]">
              {filteredAdmins.length} registro(s) · {admins.length} total
            </p>
            <p className="mt-2 text-xs text-[#6b4f1d]">
              Cuentas con rol admin — <strong>no ocupan cupo</strong> en la plataforma. Úsalas para
              probar restablecimiento y bóveda; luego puedes quitarlas de esta vista.
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

        <SupportCredentialsTable
          users={filteredAdmins}
          onRefresh={handleRefresh}
          onNotice={setNotice}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-[#dde8d8] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#1a3c34]">Participantes</h2>
            <p className="mt-1 text-sm text-[#5a6b62]">
              {filteredParticipants.length} registro(s) · {participants.length} total ·{' '}
              {filteredCount} filtrados de {totalCount}
            </p>
          </div>
        </div>

        <SupportCredentialsTable
          users={filteredParticipants}
          onRefresh={handleRefresh}
          onNotice={setNotice}
        />
      </section>
    </AdminShell>
  )
}
