'use client'

import { forwardRef } from 'react'
import {
  formatProcessTimestamp,
  type ActivityProcessEntry,
} from '@/lib/admin/activity-feed'
import { cn } from '@/lib/utils'
import { ClipboardList, Radio } from 'lucide-react'

const KIND_ACCENT: Record<ActivityProcessEntry['kind'], string> = {
  meeting_pending: 'border-amber-400 bg-amber-50/80',
  meeting_confirmed: 'border-emerald-400 bg-emerald-50/80',
  meeting_completed: 'border-sky-400 bg-sky-50/80',
  meeting_cancelled: 'border-red-300 bg-red-50/80',
  meeting_rejected: 'border-orange-300 bg-orange-50/80',
  evaluation: 'border-[#8ac441] bg-[#eef3ea]/90',
}

export function ExecutiveLatestProcessCard({
  entry,
  className,
}: {
  entry: ActivityProcessEntry
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[#dde8d8] bg-white shadow-sm',
        className,
      )}
    >
      <div className="h-1 bg-gradient-to-r from-[#8ac441] via-[#1a3c34] to-[#8ac441]" />
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8ac441]">
          Último proceso operativo
        </p>
        <h3 className="mt-2 text-base font-semibold text-[#1a3c34]">{entry.title}</h3>
        <p className="mt-2 text-sm font-medium text-[#1a3c34]">{entry.line1}</p>
        <p className="mt-1 text-sm text-[#5a6b62]">{entry.line2}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[#dde8d8] bg-[#f8fbf8] px-2 py-0.5 font-medium text-[#1a3c34]">
            {entry.statusLabel}
          </span>
          <span className="text-[#5a6b62]">{formatProcessTimestamp(entry.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

/** Tarjeta oculta solo para captura PNG → PDF (mismo diseño, fondo fijo). */
export const ExecutiveLatestProcessCapture = forwardRef<
  HTMLDivElement,
  { entry: ActivityProcessEntry }
>(function ExecutiveLatestProcessCapture({ entry }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 520,
        fontFamily: 'Inter, Arial, sans-serif',
        background: '#ffffff',
        border: '1px solid #dde8d8',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 4, background: 'linear-gradient(90deg, #8ac441, #1a3c34, #8ac441)' }} />
      <div style={{ padding: 20 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#8ac441',
          }}
        >
          Conecta360 · Visor rápido
        </p>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 11,
            color: '#5a6b62',
          }}
        >
          Último proceso operativo registrado
        </p>
        <h3 style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 700, color: '#1a3c34' }}>
          {entry.title}
        </h3>
        <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: '#1a3c34' }}>
          {entry.line1}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#5a6b62', lineHeight: 1.5 }}>
          {entry.line2}
        </p>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#1a3c34',
              border: '1px solid #dde8d8',
              background: '#f8fbf8',
              borderRadius: 999,
              padding: '3px 10px',
            }}
          >
            {entry.statusLabel}
          </span>
          <span style={{ fontSize: 11, color: '#5a6b62' }}>
            {formatProcessTimestamp(entry.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
})

type ExecutiveProcessFeedPanelProps = {
  entries: ActivityProcessEntry[]
  latestEntry: ActivityProcessEntry | null
}

export function ExecutiveProcessFeedPanel({
  entries,
  latestEntry,
}: ExecutiveProcessFeedPanelProps) {
  const preview = entries.slice(0, 12)

  return (
    <section className="rounded-2xl border border-[#1a3c34]/15 bg-gradient-to-br from-[#1a3c34] to-[#243d36] p-[1px] shadow-lg">
      <div className="rounded-[15px] bg-[#f8fbf8]">
        <div className="flex items-center justify-between border-b border-[#dde8d8] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#1a3c34] text-[#8ac441]">
              <ClipboardList className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1a3c34]">
                Visor rápido · Cuadro detallado
              </h2>
              <p className="text-xs text-[#5a6b62]">
                Procesos recientes de la Rueda de Negocios (actualización en vivo)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            <Radio className="size-3 animate-pulse" aria-hidden="true" />
            Live
          </span>
        </div>

        {latestEntry && (
          <div className="border-b border-[#dde8d8] bg-white px-5 py-4">
            <ExecutiveLatestProcessCard entry={latestEntry} />
          </div>
        )}

        <div className="max-h-80 overflow-y-auto px-5 py-4">
          {preview.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin procesos registrados para los filtros actuales.
            </p>
          ) : (
            <ul className="space-y-3">
              {preview.map((entry, index) => (
                <li
                  key={entry.id}
                  className={cn(
                    'rounded-xl border-l-4 bg-white p-3 shadow-sm',
                    KIND_ACCENT[entry.kind],
                    index === 0 && 'ring-1 ring-[#8ac441]/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#1a3c34]/70">
                        {entry.kind === 'evaluation' ? 'Evaluación' : 'Reunión'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1a3c34]">{entry.title}</p>
                      <p className="mt-1 truncate text-sm text-[#1a3c34]">{entry.line1}</p>
                      <p className="mt-0.5 text-xs text-[#5a6b62]">{entry.line2}</p>
                    </div>
                    <time
                      className="shrink-0 text-[10px] text-[#5a6b62]"
                      dateTime={entry.timestamp}
                    >
                      {formatProcessTimestamp(entry.timestamp)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
