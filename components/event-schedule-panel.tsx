'use client'

import { useCallback, useRef, useState } from 'react'
import { CalendarDays, Clock, Sun, Sunset } from 'lucide-react'
import {
  EVENT,
  MEETING_DURATION_MINUTES,
  eventDays,
  getEventDayScheduleDisplay,
  getEventDayTimeSlots,
} from '@/lib/event-config'
import { formatSlotTimeDisplay } from '@/lib/slot-time-display'
import { cn } from '@/lib/utils'

export function EventSchedulePanel({ className }: { className?: string }) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const blockRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  const registerBlockRef = useCallback((dayId: string, node: HTMLLIElement | null) => {
    if (node) blockRefs.current.set(dayId, node)
    else blockRefs.current.delete(dayId)
  }, [])

  function focusDay(dayId: string) {
    setSelectedDayId(dayId)
    blockRefs.current.get(dayId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      <div className="border-b border-border bg-gradient-to-br from-primary via-primary to-primary/90 px-6 py-6 text-primary-foreground sm:px-8 sm:py-7">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/25">
            <CalendarDays className="size-6 text-accent" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Rueda de Negocios · Evento oficial
            </p>
            <h2 className="mt-1 text-balance text-lg font-bold leading-snug sm:text-xl">
              {EVENT.name}
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/90">
              Agendamiento habilitado del{' '}
              <strong className="font-semibold text-accent">{EVENT.dateRangeLabel}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:items-start sm:gap-8 sm:px-8 sm:py-8">
        <div className="min-h-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Días habilitados
          </p>
          <ul className="space-y-2" role="list">
            {eventDays.map((day) => {
              const selected = selectedDayId === day.id
              return (
                <li key={day.id}>
                  <button
                    type="button"
                    onClick={() => focusDay(day.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-foreground',
                    )}
                  >
                    <CalendarDays
                      className={cn('size-4 shrink-0', selected ? 'text-accent' : 'text-primary')}
                      aria-hidden="true"
                    />
                    {day.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="min-h-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Bloques de agendamiento
          </p>
          <ul className="max-h-[min(32rem,70vh)] space-y-3 overflow-y-auto pr-1" role="list">
            {eventDays.map((day) => {
              const schedule = getEventDayScheduleDisplay(day)
              const slots = getEventDayTimeSlots(day.id)
              const morningSlots = slots.filter((slot) => slot.period === 'mañana')
              const afternoonSlots = slots.filter((slot) => slot.period === 'tarde')
              const selected = selectedDayId === day.id

              return (
                <li
                  key={day.id}
                  ref={(node) => registerBlockRef(day.id, node)}
                  className={cn(
                    'scroll-mt-4 rounded-xl border p-3.5 transition-all',
                    selected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/25'
                      : 'border-border bg-muted/30',
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{day.label}</p>
                  <p className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Sun className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                    {schedule.morning}
                  </p>
                  {morningSlots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {morningSlots.map((slot) => (
                        <span
                          key={slot.id}
                          className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground"
                        >
                          {formatSlotTimeDisplay(slot.time)}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Sunset className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                    {schedule.afternoon}
                  </p>
                  {afternoonSlots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {afternoonSlots.map((slot) => (
                        <span
                          key={slot.id}
                          className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground"
                        >
                          {formatSlotTimeDisplay(slot.time)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            Cada reunión dura {MEETING_DURATION_MINUTES} minutos
          </p>
        </div>
      </div>
    </div>
  )
}
