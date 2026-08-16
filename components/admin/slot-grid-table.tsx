'use client'

import { Fragment, useState } from 'react'
import type { SlotGridCell } from '@/lib/admin/analytics'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

const SLOT_STATUS_CLASS: Record<SlotGridCell['status'], string> = {
  scheduled: 'border-[#c5ddf5] bg-[#eef6fc] text-[#1b4a66]',
  in_progress: 'border-[#ffe08a] bg-[#fff8e6] text-[#7a5a00]',
  completed: 'border-[#b8dfc4] bg-[#eef8f0] text-[#1a5c34]',
  available: 'border-[#dde8d8] bg-[#fafcfa] text-[#5a6b62]',
  cancelled: 'border-[#f0c8c8] bg-[#fdf0f0] text-[#8b2e2e]',
}

const STATUS_LABEL: Record<SlotGridCell['status'], string> = {
  scheduled: 'Agendada',
  in_progress: 'En curso',
  completed: 'Completada',
  available: 'Disponible',
  cancelled: 'Cancelada',
}

function formatInteractionTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function InteractionStatusBadge({ status }: { status: SlotGridCell['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 capitalize',
        SLOT_STATUS_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function HistoryRow({ item }: { item: NonNullable<SlotGridCell['history']>[number] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#eef3eb] py-2 text-[11px] first:border-t-0">
      <InteractionStatusBadge status={item.status} />
      <span className="text-muted-foreground">{item.statusLabel}</span>
      <span className="text-[#1a3c34]">{item.organizations}</span>
      <span className="text-muted-foreground">{formatInteractionTime(item.occurredAt)}</span>
    </div>
  )
}

export function SlotGridTable({ cells }: { cells: SlotGridCell[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleCell(cellKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(cellKey)) next.delete(cellKey)
      else next.add(cellKey)
      return next
    })
  }

  return (
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
          {cells.map((cell) => {
            const cellKey = `${cell.slotId}-${cell.tableNumber}`
            const hasHistory = (cell.history?.length ?? 0) > 0
            const isExpanded = expanded.has(cellKey)

            return (
              <Fragment key={cellKey}>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {hasHistory ? (
                      <button
                        type="button"
                        onClick={() => toggleCell(cellKey)}
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left font-medium text-[#1a3c34] hover:bg-[#eef3ea]"
                        aria-expanded={isExpanded}
                        title="Ver interacciones anteriores en este bloque y mesa"
                      >
                        <ChevronDown
                          className={cn(
                            'size-3.5 shrink-0 transition-transform',
                            isExpanded && 'rotate-180',
                          )}
                          aria-hidden="true"
                        />
                        {cell.dayLabel}
                        <span className="rounded-full bg-[#eef3ea] px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          +{cell.history!.length}
                        </span>
                      </button>
                    ) : (
                      cell.dayLabel
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{cell.time}</td>
                  <td className="px-3 py-2">Mesa {String(cell.tableNumber).padStart(2, '0')}</td>
                  <td className="px-3 py-2">
                    <InteractionStatusBadge status={cell.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {cell.organizations ?? '—'}
                  </td>
                </tr>
                {hasHistory && isExpanded && (
                  <tr className="bg-[#fafcfa]">
                    <td colSpan={5} className="px-3 py-2 pl-8">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Interacciones anteriores · {cell.dayLabel} · Mesa{' '}
                        {String(cell.tableNumber).padStart(2, '0')}
                      </p>
                      {cell.history!.map((item) => (
                        <HistoryRow key={item.meetingId} item={item} />
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { SLOT_STATUS_CLASS, STATUS_LABEL }
