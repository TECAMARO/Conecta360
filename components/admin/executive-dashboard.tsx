'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/ui/button'
import {
  buildExecutiveSnapshot,
  DEFAULT_EXECUTIVE_FILTERS,
  type ExecutiveFilters,
  type ExecutiveSnapshot,
} from '@/lib/admin/analytics'
import { EVENT_DAY_OPTIONS, MAX_MEETINGS_PER_ORGANIZATION, TABLE_OPTIONS } from '@/lib/admin/constants'
import { SECTORS } from '@/lib/event-config'
import { OFFER_TAG_OPTIONS, SEEKING_TAG_OPTIONS } from '@/lib/profile-tags'
import {
  fetchAdminEvaluations,
  fetchAdminMeetings,
  fetchAdminProfilesWithMetrics,
  fetchCurrentUserIsAdmin,
  type AdminProfileRow,
  type AdminMeetingRow,
} from '@/lib/supabase/admin-repository'
import type { AdminEvaluationRow } from '@/lib/admin/analytics'
import { supabase } from '@/src/lib/supabaseClient'
import { cn } from '@/lib/utils'
import {
  Activity,
  Building2,
  CalendarRange,
  Download,
  Loader2,
  Radio,
  Star,
  Target,
  Users,
} from 'lucide-react'

const SLOT_STATUS_CLASS: Record<string, string> = {
  available: 'bg-gray-100 text-gray-500 border-gray-200',
  scheduled: 'bg-amber-100 text-amber-900 border-amber-200',
  in_progress: 'bg-sky-100 text-sky-900 border-sky-200',
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon: typeof Activity
}) {
  return (
    <div className="rounded-2xl border border-[#dde8d8] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#5a6b62]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#1a3c34]">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#eef3ea] text-[#1a3c34]">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}) {
  return (
    <label className="block min-w-[10rem] flex-1 text-sm">
      <span className="mb-1 block text-xs font-medium text-[#5a6b62]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#dde8d8] bg-white px-3 py-2 text-sm text-[#1a3c34] outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/20"
      >
        <option value="all">Todos</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TagBarChart({
  title,
  data,
}: {
  title: string
  data: { label: string; count: number }[]
}) {
  const chartData = data.slice(0, 8).map((item) => ({
    name: item.label.length > 28 ? `${item.label.slice(0, 28)}…` : item.label,
    count: item.count,
  }))

  return (
    <div className="rounded-2xl border border-[#dde8d8] bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[#1a3c34]">{title}</h3>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este filtro.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8ac441" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function ExecutiveDashboard() {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])
  const [meetings, setMeetings] = useState<AdminMeetingRow[]>([])
  const [evaluations, setEvaluations] = useState<AdminEvaluationRow[]>([])
  const [filters, setFilters] = useState<ExecutiveFilters>(DEFAULT_EXECUTIVE_FILTERS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [profileRows, meetingRows, evaluationRows] = await Promise.all([
        fetchAdminProfilesWithMetrics(),
        fetchAdminMeetings(),
        fetchAdminEvaluations(),
      ])
      setProfiles(profileRows)
      setMeetings(meetingRows)
      setEvaluations(evaluationRows)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error al cargar datos.')
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
      .channel('admin_executive_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        void loadData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void loadData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => {
        void loadData(true)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [authorized, loadData])

  const snapshot: ExecutiveSnapshot = useMemo(
    () => buildExecutiveSnapshot(profiles, meetings, evaluations, filters),
    [profiles, meetings, evaluations, filters],
  )

  async function handleDownloadPdf() {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/admin/report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'No se pudo generar el PDF.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `conecta360-informe-ejecutivo-${Date.now()}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      setToast('PDF descargado correctamente.')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error al descargar PDF.')
    } finally {
      setPdfLoading(false)
      window.setTimeout(() => setToast(null), 4000)
    }
  }

  if (authorized === null || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5]">
        <div className="flex items-center gap-2 text-sm text-[#1a3c34]/70">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando dashboard ejecutivo…
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

  const { kpis } = snapshot
  const dayOptions = EVENT_DAY_OPTIONS.filter((d) => d.id !== 'all')

  return (
    <AdminShell
      title="Dashboard de Inteligencia y Control Operativo — Conecta360"
      subtitle="Rueda de Negocios · Semana Orinoquía Sostenible y Competitiva 2026"
      refreshing={refreshing}
      onRefresh={() => void loadData()}
      actions={
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-[#8ac441] text-[#1a3c34] hover:bg-[#7ab038]"
          disabled={pdfLoading}
          onClick={() => void handleDownloadPdf()}
        >
          {pdfLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          Descargar Entregable PDF Oficial
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dde8d8] bg-white px-4 py-3 shadow-sm">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
            'bg-emerald-100 text-emerald-800',
          )}
        >
          <Radio className="size-3.5 animate-pulse" aria-hidden="true" />
          Evento en vivo · Sincronización Realtime activa
        </span>
        <span className="text-xs text-muted-foreground">
          Actualizado:{' '}
          {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(snapshot.generatedAt),
          )}
        </span>
      </div>

      <section className="rounded-2xl border border-[#dde8d8] bg-white p-4 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1a3c34]">
          <CalendarRange className="size-4" aria-hidden="true" />
          Filtros globales
        </h2>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Día del evento"
            value={filters.day === 'all' ? 'all' : filters.day}
            onChange={(v) => setFilters((f) => ({ ...f, day: v }))}
            options={dayOptions.map((d) => ({ id: d.id, label: d.label }))}
          />
          <FilterSelect
            label="Mesa B2B"
            value={filters.table}
            onChange={(v) => setFilters((f) => ({ ...f, table: v }))}
            options={TABLE_OPTIONS.filter((t) => t.id !== 'all')}
          />
          <FilterSelect
            label="Sector económico"
            value={filters.sector}
            onChange={(v) => setFilters((f) => ({ ...f, sector: v }))}
            options={SECTORS.map((s) => ({ id: s, label: s }))}
          />
          <FilterSelect
            label="Qué Ofrece"
            value={filters.offerTag}
            onChange={(v) => setFilters((f) => ({ ...f, offerTag: v }))}
            options={OFFER_TAG_OPTIONS.map((t) => ({ id: t, label: t }))}
          />
          <FilterSelect
            label="Qué Busca"
            value={filters.seekTag}
            onChange={(v) => setFilters((f) => ({ ...f, seekTag: v }))}
            options={SEEKING_TAG_OPTIONS.map((t) => ({ id: t, label: t }))}
          />
          <label className="block min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium text-[#5a6b62]">Buscar empresa</span>
            <input
              type="search"
              value={filters.orgSearch}
              onChange={(e) => setFilters((f) => ({ ...f, orgSearch: e.target.value }))}
              placeholder="Nombre o correo…"
              className="w-full rounded-lg border border-[#dde8d8] bg-white px-3 py-2 text-sm outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/20"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Reuniones agendadas"
          value={`${kpis.scheduledTotal} / ${kpis.capacityMax}`}
          hint={`${kpis.pendingTotal} pendientes · ${kpis.cancelledTotal} canceladas`}
          icon={CalendarRange}
        />
        <KpiCard
          label="Completadas con éxito"
          value={String(kpis.completedSuccess)}
          hint="Con evaluación concretada o estado completada"
          icon={Target}
        />
        <KpiCard
          label="Organizaciones"
          value={`${kpis.registeredOrgs} / ${kpis.orgLimit}`}
          hint={`Promedio ${kpis.avgMeetingsPerOrg} citas/org (máx. ${MAX_MEETINGS_PER_ORGANIZATION})`}
          icon={Users}
        />
        <KpiCard
          label="Asistencia efectiva"
          value={`${kpis.attendanceRate}%`}
          hint="Sobre reuniones confirmadas ya finalizadas"
          icon={Activity}
        />
        <KpiCard
          label="Índice de vinculación"
          value={`${kpis.allianceIndex}%`}
          hint="Evaluaciones con expectativa alta o media"
          icon={Building2}
        />
        <KpiCard
          label="Eficiencia de agendamiento"
          value={`${kpis.schedulingEfficiency}%`}
          hint="Bloques horarios con al menos 1 cita / 60 bloques"
          icon={Activity}
        />
        <KpiCard
          label="Satisfacción promedio"
          value={`${kpis.satisfactionScore} ⭐`}
          hint="Escala 1–5 según expectativa de alianza"
          icon={Star}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <TagBarChart title="Sector económico" data={snapshot.sectorDistribution} />
        <TagBarChart title="Qué Ofrece" data={snapshot.offerDistribution} />
        <TagBarChart title="Qué Busca" data={snapshot.seekDistribution} />
      </section>

      <section className="rounded-2xl border border-[#dde8d8] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-[#1a3c34]">
          Mapeo de Mesas B2B en vivo
        </h2>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(
            [
              ['scheduled', 'Agendada'],
              ['in_progress', 'En curso'],
              ['completed', 'Completada'],
              ['available', 'Disponible'],
              ['cancelled', 'Cancelada'],
            ] as const
          ).map(([key, label]) => (
            <span
              key={key}
              className={cn('rounded-full border px-2 py-0.5', SLOT_STATUS_CLASS[key])}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="max-h-96 overflow-auto rounded-xl border border-[#eef3eb]">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#f8fbf8] text-[#1a3c34]/70">
              <tr>
                <th className="px-3 py-2">Día</th>
                <th className="px-3 py-2">Bloque</th>
                <th className="px-3 py-2">Mesa</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Organizaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3eb]">
              {snapshot.slotGrid.map((cell) => (
                <tr key={`${cell.slotId}-${cell.tableNumber}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{cell.dayLabel}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{cell.time}</td>
                  <td className="px-3 py-2">Mesa {String(cell.tableNumber).padStart(2, '0')}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 capitalize',
                        SLOT_STATUS_CLASS[cell.status],
                      )}
                    >
                      {cell.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {cell.organizations ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dde8d8] bg-white shadow-sm">
        <div className="border-b border-[#eef3eb] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#1a3c34]">
            Consolidado de actividad por empresa ({snapshot.profiles.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fbf8] text-xs uppercase tracking-wide text-[#1a3c34]/70">
              <tr>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Sector</th>
                <th className="px-5 py-3">Ofrece</th>
                <th className="px-5 py-3">Busca</th>
                <th className="px-5 py-3">Confirmadas</th>
                <th className="px-5 py-3">Pendientes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3eb]">
              {snapshot.profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-[#fafcfa]">
                  <td className="px-5 py-3 font-medium">{profile.organization_name ?? '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{profile.sector ?? '—'}</td>
                  <td className="max-w-[12rem] truncate px-5 py-3 text-muted-foreground">
                    {(profile.offers ?? []).slice(0, 2).join(' · ') || '—'}
                  </td>
                  <td className="max-w-[12rem] truncate px-5 py-3 text-muted-foreground">
                    {(profile.seeks ?? []).slice(0, 2).join(' · ') || '—'}
                  </td>
                  <td className="px-5 py-3">{profile.metrics.confirmed}</td>
                  <td className="px-5 py-3">{profile.metrics.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1a3c34] px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </AdminShell>
  )
}
