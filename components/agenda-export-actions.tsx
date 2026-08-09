'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/lib/data'
import {
  buildAgendaExportRows,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadAgendaIcs,
} from '@/lib/agenda-export'
import { CalendarPlus, ChevronDown, FileDown } from 'lucide-react'

export function AgendaExportActions({
  appointments,
  onNotify,
}: {
  appointments: Appointment[]
  onNotify?: (message: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const rows = buildAgendaExportRows(appointments)
  const hasConfirmed = rows.length > 0

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  function notify(message: string) {
    onNotify?.(message)
  }

  function handlePdfDownload() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    window.print()
  }

  function handleIcsDownload() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    downloadAgendaIcs(rows)
    setMenuOpen(false)
    notify(`Archivo .ics descargado con ${rows.length} reunión${rows.length === 1 ? '' : 'es'} confirmada${rows.length === 1 ? '' : 's'}.`)
  }

  function handleGoogleCalendar() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    if (rows.length === 1) {
      const url = buildGoogleCalendarUrl(rows[0])
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      setMenuOpen(false)
      return
    }
    handleIcsDownload()
    notify('Descarga el archivo .ics e impórtalo en Google Calendar para agregar todas las reuniones.')
  }

  function handleOutlookCalendar() {
    if (!hasConfirmed) {
      notify('No hay reuniones confirmadas para exportar.')
      return
    }
    if (rows.length === 1) {
      const url = buildOutlookCalendarUrl(rows[0])
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      setMenuOpen(false)
      return
    }
    handleIcsDownload()
    notify('Descarga el archivo .ics e impórtalo en Outlook para agregar todas las reuniones.')
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
            className="absolute right-0 top-full z-40 mt-2 w-[min(calc(100vw-2rem),16rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:w-64"
            role="menu"
            aria-label="Opciones de calendario"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              onClick={handleIcsDownload}
            >
              Descargar archivo .ics
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Todas las reuniones confirmadas
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full border-t border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              onClick={handleGoogleCalendar}
            >
              Google Calendar
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {rows.length === 1 ? 'Abrir evento en Google' : 'Descarga .ics para importar'}
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full border-t border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
              onClick={handleOutlookCalendar}
            >
              Outlook
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {rows.length === 1 ? 'Abrir evento en Outlook' : 'Descarga .ics para importar'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
