'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { SectorBadge } from '@/components/sector-badge'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { cn } from '@/lib/utils'
import type { Participant } from '@/lib/data'
import { MapPin, ArrowUpRight, Handshake, Search, LogIn, Briefcase } from 'lucide-react'

export function ParticipantCard({
  participant,
  onRequest,
  onViewProfile,
  readOnly = false,
  requestDisabled = false,
}: {
  participant: Participant
  onRequest?: (participant: Participant) => void
  onViewProfile: (participant: Participant) => void
  readOnly?: boolean
  /** Bloqueo silencioso cuando el usuario alcanzó el cupo de envíos confirmados. */
  requestDisabled?: boolean
}) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <ParticipantAvatar participant={participant} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-balance text-base font-semibold leading-snug text-card-foreground">
            {participant.name}
          </h3>
          {participant.fullName && participant.fullName !== participant.name && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{participant.fullName}</p>
          )}
          {participant.role && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Briefcase className="size-3 shrink-0" aria-hidden="true" />
              {participant.role}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {participant.location}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <SectorBadge sector={participant.sector} />
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {participant.description}
      </p>

      <div className="mt-4 grid gap-3 rounded-xl bg-muted/60 p-3">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Handshake className="size-3.5" aria-hidden="true" />
            Qué ofrece
          </p>
          <div className="flex flex-wrap gap-1.5">
            {participant.offer.map((item) => (
              <span
                key={item}
                className="rounded-md bg-card px-2 py-0.5 text-xs text-foreground ring-1 ring-border"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Search className="size-3.5" aria-hidden="true" />
            Qué busca
          </p>
          <div className="flex flex-wrap gap-1.5">
            {participant.seeking.map((item) => (
              <span
                key={item}
                className="rounded-md bg-card px-2 py-0.5 text-xs text-foreground ring-1 ring-border"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {participant.isCurrentUser ? (
          <span className="inline-flex w-full items-center justify-center rounded-lg border border-primary/25 bg-secondary px-3 py-2.5 text-center text-sm font-medium text-primary">
            Tu organización publicada
          </span>
        ) : readOnly ? (
          <>
            <Button
              variant="outline"
              className="min-h-11 h-auto w-full whitespace-normal px-3 py-2.5"
              onClick={() => onViewProfile(participant)}
            >
              Ver Perfil
            </Button>
            <Link
              href="/login?redirect=/plataforma"
              className={cn(buttonVariants(), 'min-h-11 h-auto w-full whitespace-normal px-3 py-2.5')}
            >
              <LogIn className="size-4 shrink-0" />
              Iniciar Sesión
            </Link>
          </>
        ) : (
          <>
            <Button
              className="min-h-11 h-auto w-full whitespace-normal px-3 py-2.5"
              disabled={requestDisabled}
              onClick={() => onRequest?.(participant)}
            >
              Solicitar Reunión
              <ArrowUpRight className="size-4 shrink-0" />
            </Button>
            <Button
              variant="outline"
              className="min-h-11 h-auto w-full whitespace-normal px-3 py-2.5"
              onClick={() => onViewProfile(participant)}
            >
              Ver Perfil
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
