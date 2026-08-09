'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { participantById, type Appointment } from '@/lib/data'
import {
  ALLIANCE_OPTIONS,
  ATTENDANCE_OPTIONS,
  type AllianceExpectation,
  type MeetingAttendance,
  type MeetingEvaluationInput,
} from '@/lib/meeting-evaluation'
import { ClipboardCheck, X } from 'lucide-react'

export function MeetingEvaluationModal({
  appointment,
  open,
  onOpenChange,
  onSave,
}: {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (appointmentId: string, input: MeetingEvaluationInput) => void
}) {
  const [attendance, setAttendance] = useState<MeetingAttendance | null>(null)
  const [allianceExpectation, setAllianceExpectation] = useState<AllianceExpectation | null>(
    null,
  )
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open || !appointment) return
    const evaluation = appointment.evaluation
    setAttendance(evaluation?.attendance ?? null)
    setAllianceExpectation(evaluation?.allianceExpectation ?? null)
    setNotes(evaluation?.notes ?? '')
  }, [open, appointment])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAttendance(null)
      setAllianceExpectation(null)
      setNotes('')
    }
    onOpenChange(next)
  }

  function submit() {
    if (!appointment || !attendance) return
    if (attendance === 'concretada' && !allianceExpectation) return

    onSave(appointment.id, {
      attendance,
      allianceExpectation: attendance === 'concretada' ? allianceExpectation ?? undefined : undefined,
      notes,
    })
    handleOpenChange(false)
  }

  const participant = appointment ? participantById(appointment.participantId) : null
  const showAlliance = attendance === 'concretada'
  const canSave =
    Boolean(attendance) && (attendance !== 'concretada' || Boolean(allianceExpectation))

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl',
            'transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          )}
        >
          {appointment && participant && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-card-foreground">
                    Registrar resultado / Check-in
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    {participant.name} · {appointment.day}, {appointment.time}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-foreground">1. Asistencia</p>
                <div className="flex flex-col gap-2">
                  {ATTENDANCE_OPTIONS.map((option) => {
                    const selected = attendance === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAttendance(option.value)
                          if (option.value !== 'concretada') {
                            setAllianceExpectation(null)
                          }
                        }}
                        className={cn(
                          'rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-secondary/50',
                        )}
                      >
                        {option.icon} {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {showAlliance && (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    2. Expectativa de alianza / negocio
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALLIANCE_OPTIONS.map((option) => {
                      const selected = allianceExpectation === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAllianceExpectation(option.value)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background hover:border-primary/40 hover:bg-secondary/50',
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label
                  htmlFor="evaluation-notes"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  {showAlliance ? '3.' : '2.'} Siguientes pasos / notas privadas
                </label>
                <textarea
                  id="evaluation-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder='Ej: "Enviar propuesta técnica el lunes"'
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close
                  render={
                    <Button variant="outline" size="lg">
                      Cancelar
                    </Button>
                  }
                />
                <Button size="lg" disabled={!canSave} onClick={submit} className="gap-1.5">
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  Guardar evaluación
                </Button>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
