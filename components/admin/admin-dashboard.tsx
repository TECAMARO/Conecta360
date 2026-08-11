'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  adminCancelMeeting,
  canAdminForceCancel,
  fetchAdminMeetings,
  fetchAdminProfilesWithMetrics,
  fetchCurrentUserIsAdmin,
  filterAdminMeetings,
  type AdminMeetingFilter,
  type AdminMeetingRow,
  type AdminProfileRow,
} from '@/lib/supabase/admin-repository'
import { supabase } from '@/src/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarClock,
  Loader2,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function MetricBadge({
  count,
  label,
  className,
}: {
  count: number
  label: string
  className: string
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        className,
      )}
      title={label}
    >
      {count}
    </span>
  )
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const normalized = status.trim().toLowerCase()
  const tone =
    normalized === 'confirmada' || normalized === 'confirmed' || normalized === 'completada'
      ? 'bg-emerald-100 text-emerald-800'
      : normalized === 'pendiente' || normalized === 'pending'
        ? 'bg-amber-100 text-amber-900'
        : normalized === 'cancelada_admin'
          ? 'bg-purple-100 text-purple-900'
          : 'bg-red-100 text-red-800'

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', tone)}>
      {label}
    </span>
  )
}

const MEETING_FILTERS: { id: AdminMeetingFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'cancelada', label: 'Canceladas' },
]

export function AdminDashboard() {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])
  const [meetings, setMeetings] = useState<AdminMeetingRow[]>([])
  const [meetingFilter, setMeetingFilter] = useState<AdminMeetingFilter>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  )
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant })
    window.setTimeout(() => setToast(null), 4000)
  }

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [profileRows, meetingRows] = await Promise.all([
        fetchAdminProfilesWithMetrics(),
        fetchAdminMeetings(),
      ])
      setProfiles(profileRows)
      setMeetings(meetingRows)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar datos.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    async function bootstrap() {
      const isAdmin = await fetchCurrentUserIsAdmin()
      setAuthorized(isAdmin)
      if (!isAdmin) return
      await loadData()
    }
    void bootstrap()
  }, [loadData])

  useEffect(() => {
    if (!authorized) return

    const channel = supabase
      .channel('admin_meetings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          void loadData(true)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          void loadData(true)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [authorized, loadData])

  async function handleAdminCancel(meeting: AdminMeetingRow) {
    const confirmed = window.confirm(
      `¿Cancelar administrativamente la reunión entre ${meeting.requesterOrganization} y ${meeting.recipientOrganization}?\n\nSe liberará la mesa/horario asignado.`,
    )
    if (!confirmed) return

    setCancellingId(meeting.id)
    try {
      await adminCancelMeeting(meeting.id)
      showToast('Reunión cancelada por administrador.')
      await loadData(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo cancelar la reunión.', 'error')
    } finally {
      setCancellingId(null)
    }
  }

  if (authorized === null || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5]">
        <div className="flex items-center gap-2 text-sm text-[#1a3c34]/70">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando consola de administración…
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] px-4">
        <p className="text-sm text-muted-foreground">No autorizado.</p>
      </div>
    )
  }

  const filteredMeetings = filterAdminMeetings(meetings, meetingFilter)

  return (
    <div className="min-h-dvh bg-[#f4f7f5]">
      <header className="border-b border-[#dde8d8] bg-[#1a3c34] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#8ac441]/20">
              <Shield className="size-5 text-[#8ac441]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Administración Conecta360
              </h1>
              <p className="text-sm text-white/70">Auditoría de usuarios y gestión de reuniones</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => void loadData()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden="true" />
              Actualizar
            </Button>
            <Link
              href="/plataforma"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/20 bg-transparent px-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a plataforma
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
        {/* Módulo A */}
        <section className="rounded-2xl border border-[#dde8d8] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#eef3eb] px-5 py-4">
            <Users className="size-5 text-[#1a3c34]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#1a3c34]">
              Auditoría de usuarios y métricas por empresa
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fbf8] text-xs uppercase tracking-wide text-[#1a3c34]/70">
                <tr>
                  <th className="px-5 py-3 font-semibold">Representante</th>
                  <th className="px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-5 py-3 font-semibold">Correo</th>
                  <th className="px-5 py-3 font-semibold">Registro</th>
                  <th className="px-5 py-3 font-semibold">Confirmadas</th>
                  <th className="px-5 py-3 font-semibold">Pendientes</th>
                  <th className="px-5 py-3 font-semibold">Cancel./Rech.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3eb]">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-[#fafcfa]">
                    <td className="px-5 py-3 font-medium text-[#1a3c34]">
                      {profile.full_name?.trim() || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-[#8ac441]" aria-hidden="true" />
                        {profile.organization_name?.trim() || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{profile.email ?? '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <MetricBadge
                        count={profile.metrics.confirmed}
                        label="Confirmadas"
                        className="bg-emerald-100 text-emerald-800"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <MetricBadge
                        count={profile.metrics.pending}
                        label="Pendientes"
                        className="bg-amber-100 text-amber-900"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <MetricBadge
                        count={profile.metrics.cancelled}
                        label="Canceladas/Rechazadas"
                        className="bg-red-100 text-red-800"
                      />
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                      No hay perfiles registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Módulo B */}
        <section className="rounded-2xl border border-[#dde8d8] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#eef3eb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-[#1a3c34]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#1a3c34]">
                Monitoreo y cancelación administrativa
              </h2>
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl border border-[#dde8d8] bg-[#f8fbf8] p-1">
              {MEETING_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMeetingFilter(item.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    meetingFilter === item.id
                      ? 'bg-[#1a3c34] text-white'
                      : 'text-[#1a3c34]/70 hover:text-[#1a3c34]',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fbf8] text-xs uppercase tracking-wide text-[#1a3c34]/70">
                <tr>
                  <th className="px-5 py-3 font-semibold">Solicitante</th>
                  <th className="px-5 py-3 font-semibold">Receptor</th>
                  <th className="px-5 py-3 font-semibold">Mesa / Horario</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3eb]">
                {filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-[#fafcfa]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1a3c34]">{meeting.requesterOrganization}</p>
                      <p className="text-xs text-muted-foreground">{meeting.requesterName}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1a3c34]">{meeting.recipientOrganization}</p>
                      <p className="text-xs text-muted-foreground">{meeting.recipientName}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-[#1a3c34]">
                      {meeting.tableLabel}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill label={meeting.statusLabel} status={meeting.status} />
                    </td>
                    <td className="px-5 py-3">
                      {canAdminForceCancel(meeting.status) ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                          disabled={cancellingId === meeting.id}
                          onClick={() => void handleAdminCancel(meeting)}
                        >
                          {cancellingId === meeting.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Ban className="size-3.5" aria-hidden="true" />
                          )}
                          Cancelar Reunión - Admin
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMeetings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                      No hay reuniones para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {toast && (
        <div
          aria-live="polite"
          className={cn(
            'fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg',
            toast.variant === 'success' ? 'bg-[#1a3c34] text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
