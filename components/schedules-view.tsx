'use client'

import { Clock } from 'lucide-react'
import { EventSchedulePanel } from '@/components/event-schedule-panel'

export function SchedulesView() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Clock className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Horarios</h1>
          <p className="text-sm text-muted-foreground">
            Días y bloques oficiales de agendamiento del evento
          </p>
        </div>
      </div>

      <EventSchedulePanel />
    </div>
  )
}
