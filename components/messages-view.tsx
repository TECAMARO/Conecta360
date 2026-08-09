'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { participantById, type Conversation, type ConversationParticipant } from '@/lib/data'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { Send, MessagesSquare, ChevronLeft, Loader2 } from 'lucide-react'

function resolveParticipant(conversation: Conversation): ConversationParticipant | null {
  if (conversation.participant) return conversation.participant
  const fromRegistry = participantById(conversation.participantId)
  if (!fromRegistry) return null
  return {
    id: fromRegistry.id,
    name: fromRegistry.name,
    fullName: fromRegistry.fullName,
    role: fromRegistry.role,
    avatarUrl: fromRegistry.avatarUrl,
    acronym: fromRegistry.acronym,
    location: fromRegistry.location,
    sector: fromRegistry.sector,
  }
}

export function MessagesView({
  conversations,
  loading = false,
  activeParticipantId,
  onSend,
  onOpen,
}: {
  conversations: Conversation[]
  loading?: boolean
  activeParticipantId?: string | null
  onSend: (participantId: string, text: string) => Promise<boolean> | boolean
  onOpen: (participantId: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(
    activeParticipantId ?? conversations[0]?.participantId ?? null,
  )
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((c) => c.participantId === activeId) ?? null
  const activeParticipant = active ? resolveParticipant(active) : null
  const lastMessageId = active?.messages.at(-1)?.id

  useEffect(() => {
    if (loading || !active?.messages.length) return

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [loading, activeId, active?.messages.length, lastMessageId])

  useEffect(() => {
    if (activeParticipantId) {
      setActiveId(activeParticipantId)
      return
    }
    if (!activeId && conversations[0]) {
      setActiveId(conversations[0].participantId)
    }
    if (activeId && !conversations.some((c) => c.participantId === activeId)) {
      setActiveId(conversations[0]?.participantId ?? null)
    }
  }, [activeParticipantId, conversations, activeId])

  useEffect(() => {
    if (!activeId) return
    onOpen(activeId)
  }, [activeId])

  function selectConversation(id: string) {
    setActiveId(id)
    onOpen(id)
  }

  async function send() {
    const text = draft.trim()
    if (!text || !activeId || sending) return

    setSending(true)
    try {
      const ok = await onSend(activeId, text)
      if (ok) setDraft('')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Mensajes · Pre-conversaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cargando conversaciones habilitadas por reuniones confirmadas…
          </p>
        </header>
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-16">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Mensajes · Pre-conversaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Las pre-conversaciones se habilitan cuando confirmas una reunión con otra organización.
          </p>
        </header>
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <MessagesSquare className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">Sin conversaciones disponibles</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirma una reunión en Mi Agenda para iniciar una pre-conversación.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header
        className={cn(
          'mb-4 shrink-0 sm:mb-5',
          activeId ? 'hidden md:block' : 'block',
        )}
      >
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Mensajes · Pre-conversaciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alinea expectativas y llega mejor preparado a cada reunión confirmada.
        </p>
      </header>

      <div className="grid min-h-[min(50dvh,100%)] min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card md:min-h-[420px] md:grid-cols-[300px_1fr]">
        <div
          className={cn(
            'min-h-0 overflow-y-auto border-border md:border-r',
            activeId ? 'hidden md:block' : 'block',
          )}
        >
          <ul>
            {conversations.map((c) => {
              const p = resolveParticipant(c)
              if (!p) return null
              const last = c.messages[c.messages.length - 1]
              const isActive = c.participantId === activeId
              return (
                <li key={c.participantId}>
                  <button
                    type="button"
                    onClick={() => selectConversation(c.participantId)}
                    className={cn(
                      'flex w-full min-h-11 items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors',
                      isActive ? 'bg-secondary/70' : 'hover:bg-muted/60',
                    )}
                  >
                    <ParticipantAvatar
                      participant={{
                        acronym: p.acronym,
                        name: p.name,
                        avatarUrl: p.avatarUrl,
                      }}
                      size="sm"
                      className="rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">{p.name}</p>
                      {p.role && (
                        <p className="truncate text-[11px] text-muted-foreground">{p.role}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {last?.text ?? 'Sin mensajes aún · Toca para escribir'}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div
          className={cn(
            'flex min-h-0 flex-col overflow-hidden',
            activeId ? 'flex' : 'hidden md:flex',
          )}
        >
          {active && activeParticipant ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted md:hidden"
                  aria-label="Volver a conversaciones"
                >
                  <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">Atrás</span>
                </button>
                <ParticipantAvatar
                  participant={{
                    acronym: activeParticipant.acronym,
                    name: activeParticipant.name,
                    avatarUrl: activeParticipant.avatarUrl,
                  }}
                  size="sm"
                  className="rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {activeParticipant.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[activeParticipant.role, activeParticipant.location]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
                {active.messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Aún no hay mensajes. Escribe el primero para alinear expectativas antes de la
                    reunión.
                  </p>
                ) : (
                  active.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm',
                          m.fromMe
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-bl-sm bg-card text-foreground ring-1 ring-border',
                        )}
                      >
                        <p className="leading-relaxed">{m.text}</p>
                        <p
                          className={cn(
                            'mt-1 text-right text-[10px]',
                            m.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          {m.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} aria-hidden="true" className="h-px shrink-0" />
              </div>

              <div className="platform-safe-bottom flex shrink-0 items-center gap-2 border-t border-border bg-card p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="Escribe un mensaje…"
                  aria-label="Escribir mensaje"
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  aria-label="Enviar mensaje"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <MessagesSquare className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">Selecciona una conversación</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Elige una reunión confirmada para iniciar la pre-conversación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
