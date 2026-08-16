'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/lib/data'
import {
  buildAgendaExportRows,
  buildAgendaExportRowsByIds,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadAgendaIcs,
} from '@/lib/agenda-export'
import {
  markMeetingsCalendarExported,
  readCalendarExportedMeetingIds,
} from '@/lib/agenda-calendar-export-state'
import { CalendarPlus, ChevronDown, FileDown } from 'lucide-react'

const DEDUPE_HINT = 'No se repetirán las demás reuniones confirmadas'

export function AgendaExportActions({
  appointments,
  userId,
  onNotify,
}: {
  appointments: Appointment[]
  userId: string | null
  onNotify?: (message: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [selectedManualIds, setSelectedManualIds] = useState<Set<string>>(new Set())
  const [exportedRevision, setExportedRevision] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const allRows = useMemo(() => buildAgendaExportRows(appointments), [appointments])
  const hasConfirmed = allRows.length > 0

  const exportedIds = useMemo(
    () => readCalendarExportedMeetingIds(userId),
    [userId, exportedRevision],
  )

  const pendingRows = useMemo(
    () => allRows.filter((row) => !exportedIds.has(row.id)),
    [allRows, exportedIds],
  )

  const showDedupeHint = exportedIds.size > 0 && pendingRows.length > 0

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
        setManualOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  useEffect(() => {
    if (!manualOpen) {
      setSelectedManualIds(new Set())
    }
  }, [manualOpen])

  function notify(message: string) {
    onNotify?.(message)
  }

  function markAutoExported(rows: { id: string }[]) {
    if (rows.length === 0) return
    markMeetingsCalendarExported(
      userId,
      rows.map((row) => row.id),
    )
    setExportedRevision((value) => value + 1)
  }

  function handlePdfDownload() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    window.print()
    notify(`PDF listo con ${allRows.length} reunión${allRows.length === 1 ? '' : 'es'} confirmada${allRows.length === 1 ? '' : 's'}.`)
  }

  function exportCalendarRows(
    rows: ReturnType<typeof buildAgendaExportRows>,
    options: { autoTrack?: boolean; label: string },
  ) {
    if (rows.length === 0) {
      notify(
        'No hay reuniones nuevas por exportar. Usa «Exportar manual» si deseas repetir alguna.',
      )
      return false
    }

    downloadAgendaIcs(rows)
    if (options.autoTrack) markAutoExported(rows)
    setMenuOpen(false)
    setManualOpen(false)
    notify(
      `${options.label}: ${rows.length} reunión${rows.length === 1 ? '' : 'es'} exportada${rows.length === 1 ? '' : 's'}.`,
    )
    return true
  }

  function handleAutoIcsDownload() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    exportCalendarRows(pendingRows, { autoTrack: true, label: 'Archivo .ics descargado' })
  }

  function handleAutoGoogleCalendar() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    if (pendingRows.length === 0) {
      notify(
        'No hay reuniones nuevas por exportar. Usa «Exportar manual» si deseas repetir alguna.',
      )
      return
    }
    if (pendingRows.length === 1) {
      const url = buildGoogleCalendarUrl(pendingRows[0])
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      markAutoExported(pendingRows)
      setMenuOpen(false)
      notify('Evento abierto en Google Calendar.')
      return
    }
    exportCalendarRows(pendingRows, { autoTrack: true, label: 'Google Calendar (.ics)' })
  }

  function handleAutoOutlookCalendar() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    if (pendingRows.length === 0) {
      notify(
        'No hay reuniones nuevas por exportar. Usa «Exportar manual» si deseas repetir alguna.',
      )
      return
    }
    if (pendingRows.length === 1) {
      const url = buildOutlookCalendarUrl(pendingRows[0])
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      markAutoExported(pendingRows)
      setMenuOpen(false)
      notify('Evento abierto en Outlook.')
      return
    }
    exportCalendarRows(pendingRows, { autoTrack: true, label: 'Outlook (.ics)' })
  }

  function toggleManualSelection(id: string) {
    setSelectedManualIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleManualExport(format: 'ics' | 'google' | 'outlook') {
    const rows = buildAgendaExportRowsByIds(appointments, [...selectedManualIds])
    if (rows.length === 0) {
      notify('Selecciona al menos una reunión confirmada.')
      return
    }

    if (format === 'ics') {
      downloadAgendaIcs(rows)
      setMenuOpen(false)
      setManualOpen(false)
      notify(`Exportación manual: ${rows.length} reunión${rows.length === 1 ? '' : 'es'} en .ics.`)
      return
    }

    if (rows.length === 1) {
      const url =
        format === 'google' ? buildGoogleCalendarUrl(rows[0]) : buildOutlookCalendarUrl(rows[0])
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      setMenuOpen(false)
      setManualOpen(false)
      notify(
        format === 'google'
          ? 'Reunión abierta en Google Calendar.'
          : 'Reunión abierta en Outlook.',
      )
      return
    }

    downloadAgendaIcs(rows)
    setMenuOpen(false)
    setManualOpen(false)
    notify(
      format === 'google'
        ? `Exportación manual: descarga el .ics con ${rows.length} reuniones e impórtalo en Google Calendar.`
        : `Exportación manual: descarga el .ics con ${rows.length} reuniones e impórtalo en Outlook.`,
    )
  }

  function formatMenuSubtitle(base: string) {
    const count =
      pendingRows.length > 0
        ? `${pendingRows.length} nueva${pendingRows.length === 1 ? '' : 's'} por exportar`
        : 'Sin reuniones nuevas'
    return `${base} · ${count}`
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <Button
        type="button"
        variant="outline"
        size="default"
        className="min-h-11 w-full gap-1.5 border-primary/30 bg-secondary/40 font-medium text-primary hover:bg-secondary sm:w-auto"
        disabled={!hasConfirmed}
        onClick={handlePdfDownload}
      >
        <FileDown className="size-4" aria-hidden="true" />
        📄 Descargar PDF
      </Button>

      <div ref={menuRef} className="relative">
        <Button
          type="button"
          variant="outline"
          size="default"
          className="min-h-11 w-full gap-1.5 border-primary/30 bg-secondary/40 font-medium text-primary hover:bg-secondary sm:w-auto"
          disabled={!hasConfirmed}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          📅 Exportar a Calendario
          <ChevronDown className={cn('size-3.5 transition-transform', menuOpen && 'rotate-180')} />
        </Button>

        {menuOpen && hasConfirmed && (
          <div
            className="absolute right-0 top-full z-40 mt-2 w-[min(calc(100vw-2rem),18rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:w-72"
            role="menu"
            aria-label="Opciones de calendario"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              onClick={handleAutoIcsDownload}
            >
              Descargar archivo .ics
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {formatMenuSubtitle('Reuniones confirmadas pendientes')}
              </span>
              {showDedupeHint && (
                <span className="mt-1 block text-[11px] font-medium text-primary">{DEDUPE_HINT}</span>
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full border-t border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              onClick={handleAutoGoogleCalendar}
            >
              Google Calendar
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {pendingRows.length === 1
                  ? 'Abrir reunión nueva en Google'
                  : formatMenuSubtitle('Importar .ics en Google')}
              </span>
              {showDedupeHint && (
                <span className="mt-1 block text-[11px] font-medium text-primary">{DEDUPE_HINT}</span>
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full border-t border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              onClick={handleAutoOutlookCalendar}
            >
              Outlook
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {pendingRows.length === 1
                  ? 'Abrir reunión nueva en Outlook'
                  : formatMenuSubtitle('Importar .ics en Outlook')}
              </span>
              {showDedupeHint && (
                <span className="mt-1 block text-[11px] font-medium text-primary">{DEDUPE_HINT}</span>
              )}
            </button>

            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                className="text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setManualOpen((open) => !open)}
              >
                Exportar manual
              </button>

              {manualOpen && (
                <div className="mt-3 space-y-3">
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                    {allRows.map((row) => (
                      <li key={row.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-muted/60">
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-primary"
                            checked={selectedManualIds.has(row.id)}
                            onChange={() => toggleManualSelection(row.id)}
                          />
                          <span>
                            <span className="block font-medium text-foreground">{row.counterpart}</span>
                            <span className="block">{row.dateTime}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      className="underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => handleManualExport('ics')}
                    >
                      .ics
                    </button>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      className="underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => handleManualExport('google')}
                    >
                      Google
                    </button>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      className="underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => handleManualExport('outlook')}
                    >
                      Outlook
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
