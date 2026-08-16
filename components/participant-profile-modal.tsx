'use client'

import Link from 'next/link'
import { Dialog } from '@base-ui/react/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { SectorBadge } from '@/components/sector-badge'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { BrochureActionButton } from '@/components/brochure-action-button'
import { cn } from '@/lib/utils'
import type { Participant } from '@/lib/data'
import { platformThemedSurfaceClass } from '@/lib/platform-themed-surface'
import type { PlatformTheme } from '@/lib/platform-preferences'
import { X, MapPin, Handshake, Search, ArrowUpRight, LogIn, Briefcase, Building2, User } from 'lucide-react'

export function ParticipantProfileModal({
  participant,
  open,
  theme = 'light',
  onOpenChange,
  onRequest,
  readOnly = false,
  requestDisabled = false,
}: {
  participant: Participant | null
  open: boolean
  theme?: PlatformTheme
  onOpenChange: (open: boolean) => void
  onRequest?: (participant: Participant) => void
  readOnly?: boolean
  requestDisabled?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={platformThemedSurfaceClass(
            theme,
            cn(
              'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
              'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-xl',
              'transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            ),
          )}
        >
          {participant && (
            <>
              <div className="relative rounded-t-2xl bg-gradient-to-r from-[#1a3c34] to-[#234a40] px-6 py-4">
                <Dialog.Close
                  className="absolute right-3 top-3 z-20 flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-black/15 p-2 text-white transition-colors hover:bg-black/30"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </Dialog.Close>

                <div className="relative z-10 flex items-center gap-3 pr-10">
                  <ParticipantAvatar
                    participant={participant}
                    size="lg"
                    borderClassName="border-4 border-card shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="text-balance text-lg font-semibold leading-snug text-white drop-shadow-sm">
                      {participant.name}
                    </Dialog.Title>
                    {participant.fullName && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-50/90">
                        <User className="size-3.5 shrink-0 text-white/70" aria-hidden="true" />
                        {participant.fullName}
                      </p>
                    )}
                    {participant.role && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-50/90">
                        <Briefcase className="size-3.5 shrink-0 text-white/70" aria-hidden="true" />
                        {participant.role}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-50/80">
                      <MapPin className="size-3.5 shrink-0 text-white/70" aria-hidden="true" />
                      {participant.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SectorBadge sector={participant.sector} />
                  {participant.name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      <Building2 className="size-3" aria-hidden="true" />
                      {participant.name}
                    </span>
                  )}
                </div>

                <Dialog.Description className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {participant.description}
                </Dialog.Description>

                <BrochureActionButton
                  brochure={participant.brochure}
                  className="mt-4 w-full"
                  size="lg"
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <section className="rounded-xl border border-border bg-muted/50 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Handshake className="size-4" aria-hidden="true" />
                      Qué ofrece
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {participant.offer.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-xl border border-border bg-muted/50 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Search className="size-4" aria-hidden="true" />
                      Qué busca
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {participant.seeking.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                {readOnly ? (
                  <div className="mt-6 space-y-3">
                    <p className="rounded-lg bg-muted/60 px-4 py-3 text-center text-sm text-muted-foreground">
                      Inicia sesión para solicitar reuniones y conectar con esta organización.
                    </p>
                    <Link
                      href="/login?redirect=/plataforma"
                      className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                      onClick={() => onOpenChange(false)}
                    >
                      <LogIn className="size-4" />
                      Iniciar Sesión
                    </Link>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="mt-6 w-full"
                    disabled={requestDisabled}
                    onClick={() => {
                      onOpenChange(false)
                      onRequest?.(participant)
                    }}
                  >
                    Solicitar Reunión
                    <ArrowUpRight className="size-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
