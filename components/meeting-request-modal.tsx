'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { SectorBadge } from '@/components/sector-badge'
import { cn } from '@/lib/utils'
import { timeSlots, type Participant, type Appointment } from '@/lib/data'
import { getSlotAvailability, type SlotAvailabilityContext } from '@/lib/agenda-protection'
import { getEventSlotById } from '@/lib/meeting-slots'
import { fetchOccupancyForBlock } from '@/lib/supabase/meetings-repository'
import {
  getAvailableTablesForBlock,
  getNextAvailableTable,
  mergeAppointmentsForValidation,
  MEETING_MODALITY,
  PHYSICAL_TABLE_LIST,
} from '@/lib/physical-tables'
import { formatSlotTimeLines } from '@/lib/slot-time-display'
import { EVENT } from '@/lib/event-config'
import { platformThemedSurfaceClass } from '@/lib/platform-themed-surface'
import type { PlatformTheme } from '@/lib/platform-preferences'
import { X, Clock, Check, MapPin, Loader2 } from 'lucide-react'

export function MeetingRequestModal({
  participant,
  open,
  userAppointments,
  theme = 'light',
  onOpenChange,
  onConfirm,
}: {
  participant: Participant | null
  open: boolean
  userAppointments: Appointment[]
  theme?: PlatformTheme
  onOpenChange: (open: boolean) => void
  onConfirm: (args: { participant: Participant; slotId: string; message: string }) => void
}) {
  const [slotId, setSlotId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [blockOccupancy, setBlockOccupancy] = useState<Appointment[]>([])
  const [blockLoading, setBlockLoading] = useState(false)
  const [blockFetchKey, setBlockFetchKey] = useState(0)

  useEffect(() => {
    if (!open) {
      setSlotId(null)
      setMessage('')
      setBlockOccupancy([])
      setBlockLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !slotId) {
      setBlockOccupancy([])
      setBlockLoading(false)
      return
    }

    const slot = getEventSlotById(slotId)
    if (!slot) return

    let cancelled = false
    setBlockLoading(true)

    void fetchOccupancyForBlock(slot.dayId, slot.time)
      .then((data) => {
        if (!cancelled) setBlockOccupancy(data)
      })
      .catch(() => {
        if (!cancelled) setBlockOccupancy([])
      })
      .finally(() => {
        if (!cancelled) setBlockLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, slotId, blockFetchKey])

  const slotContext = useMemo<SlotAvailabilityContext>(
    () => ({ userAppointments, slotOccupancy: blockOccupancy }),
    [userAppointments, blockOccupancy],
  )

  const tablePool = useMemo(
    () => mergeAppointmentsForValidation(userAppointments, blockOccupancy),
    [userAppointments, blockOccupancy],
  )

  const assignedTable = useMemo(() => {
    if (!slotId || !participant || blockLoading) return null
    const availability = getSlotAvailability(slotContext, slotId, participant.id)
    if (!availability.available) return null
    return getNextAvailableTable(tablePool, slotId)
  }, [slotContext, tablePool, slotId, participant, blockLoading])

  const availableTables = useMemo(() => {
    if (!slotId || blockLoading) return []
    return getAvailableTablesForBlock(tablePool, slotId)
  }, [tablePool, slotId, blockLoading])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSlotId(null)
      setMessage('')
    }
    onOpenChange(next)
  }

  function selectSlot(nextSlotId: string) {
    setSlotId(nextSlotId)
    setBlockFetchKey((key) => key + 1)
  }

  function submit() {
    if (!participant || !slotId || !assignedTable || blockLoading) return
    onConfirm({ participant, slotId, message })
  }

  const slotsByDay = useMemo(() => {
    const groups = new Map<string, typeof timeSlots>()
    for (const slot of timeSlots) {
      const key = slot.dayLabel ?? slot.day
      const list = groups.get(key) ?? []
      list.push(slot)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={platformThemedSurfaceClass(
            theme,
            cn(
              'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
              'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-6 shadow-xl',
              'transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            ),
          )}
        >
          {participant && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-card-foreground">
                    Solicitar reunión presencial
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    con <span className="font-medium text-foreground">{participant.name}</span>
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SectorBadge sector={participant.sector} />
                <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
                  Modalidad: Presencial
                </span>
              </div>

              <div className="mt-5">
                <p className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="size-4 text-primary" aria-hidden="true" />
                  Selecciona un bloque disponible
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {EVENT.shortName} · {EVENT.dateRangeLabel}. Cada bloque tiene hasta 6 mesas
                  físicas (Mesa 01–06). Las solicitudes pendientes reservan mesa en ese horario.
                </p>
                <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                  {slotsByDay.map(([dayLabel, slots]) => (
                    <div key={dayLabel}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        {dayLabel}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {slots.map((slot) => {
                          const selected = slotId === slot.id
                          const { startLine, endLine } = formatSlotTimeLines(slot.time)
                          const availability = participant
                            ? getSlotAvailability(slotContext, slot.id, participant.id)
                            : { available: false, reason: null as const, message: undefined }
                          const disabled = !slot.available || !availability.available
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => selectSlot(slot.id)}
                              className={cn(
                                'flex min-h-11 min-w-[7.25rem] flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition-all sm:text-sm',
                                disabled &&
                                  'cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through',
                                !disabled &&
                                  !selected &&
                                  'border-border bg-background hover:border-primary/50 hover:bg-secondary',
                                selected && 'border-primary bg-primary text-primary-foreground',
                              )}
                            >
                              <span className="font-medium leading-snug">
                                <span className="block whitespace-nowrap">{startLine}</span>
                                {endLine ? (
                                  <span className="block whitespace-nowrap">{endLine}</span>
                                ) : null}
                              </span>
                              {!availability.available && availability.message && (
                                <span className="mt-0.5 text-[10px] leading-tight no-underline opacity-90">
                                  {availability.message}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {slotId && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-secondary/60 px-3.5 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <MapPin className="size-4.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Ubicación asignada · {MEETING_MODALITY}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {blockLoading ? (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Verificando mesas disponibles…
                        </span>
                      ) : assignedTable ? (
                        <>
                          {`📍 ${assignedTable}`}
                          <span className="mt-1 block break-words text-xs font-normal text-muted-foreground">
                            Mesas libres en este bloque ({availableTables.length}/{PHYSICAL_TABLE_LIST.length}):{' '}
                            {availableTables.join(', ')}
                          </span>
                        </>
                      ) : (
                        'Agotado / Sin mesas disponibles en este bloque'
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label
                  htmlFor="meeting-message"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Mensaje de propuesta
                </label>
                <textarea
                  id="meeting-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="Cuéntale brevemente qué te gustaría explorar en la reunión…"
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {message.length}/280
                </p>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Dialog.Close
                  render={
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Cancelar
                    </Button>
                  }
                />
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={!slotId || !assignedTable || blockLoading}
                  onClick={submit}
                >
                  <Check className="size-4" />
                  Enviar solicitud
                </Button>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
