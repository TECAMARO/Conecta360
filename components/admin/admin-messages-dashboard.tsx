'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ADMIN_BROADCAST_TEMPLATES,
  ORGANIZATION_PLACEHOLDER,
  buildBroadcastMessage,
  normalizeBroadcastExternalEmail,
  personalizeBroadcastText,
  type AdminBroadcastTemplateId,
} from '@/lib/admin/broadcast-message-templates'
import { fetchAdminProfilesWithMetrics, fetchCurrentUserIsAdmin, type AdminProfileRow } from '@/lib/supabase/admin-repository'
import { AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Building2, Loader2, Plus, Search, Send, UserPlus, X } from 'lucide-react'

type SpecialRecipient = {
  id: string
  email: string
  organizationName: string
}

function displayOrganization(profile: AdminProfileRow): string {
  return (
    profile.organization_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email?.trim() ||
    'Organización'
  )
}

export function AdminMessagesDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [specialRecipients, setSpecialRecipients] = useState<SpecialRecipient[]>([])
  const [specialEmail, setSpecialEmail] = useState('')
  const [specialOrganization, setSpecialOrganization] = useState('')
  const [specialError, setSpecialError] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<AdminBroadcastTemplateId>('general_1')
  const [customBody, setCustomBody] = useState(
    `Señores ${ORGANIZATION_PLACEHOLDER}:\n\nEscriba aquí su mensaje personalizado.\n\nAtentamente,\nEquipo Conecta360`,
  )
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )
  const customTextareaRef = useRef<HTMLTextAreaElement>(null)

  const participants = useMemo(
    () => profiles.filter((profile) => profile.role !== 'admin' && profile.email?.trim()),
    [profiles],
  )

  const filteredParticipants = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((profile) => {
      const org = displayOrganization(profile).toLowerCase()
      const email = profile.email?.toLowerCase() ?? ''
      const name = profile.full_name?.toLowerCase() ?? ''
      return org.includes(q) || email.includes(q) || name.includes(q)
    })
  }, [participants, query])

  const previewOrganization = filteredParticipants[0]
    ? displayOrganization(filteredParticipants[0])
    : 'Nombre de la Organización'

  const previewMessage = useMemo(() => {
    try {
      return buildBroadcastMessage({
        templateId,
        organizationName: previewOrganization,
        customBody,
      }).text
    } catch {
      return ''
    }
  }, [templateId, customBody, previewOrganization])

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchAdminProfilesWithMetrics()
      setProfiles(rows)
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudieron cargar los participantes.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function bootstrap() {
      const isAdmin = await fetchCurrentUserIsAdmin()
      setAuthorized(isAdmin)
      if (!isAdmin) return
      await loadProfiles()
    }
    void bootstrap()
  }, [loadProfiles])

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filteredParticipants.map((profile) => profile.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSpecialRecipients([])
    setSpecialEmail('')
    setSpecialOrganization('')
    setSpecialError(null)
  }

  const totalSelectedCount = selectedIds.size + specialRecipients.length

  function addSpecialRecipient() {
    setSpecialError(null)

    const email = normalizeBroadcastExternalEmail(specialEmail)
    if (!email) {
      setSpecialError('Ingresa un correo electrónico válido.')
      return
    }

    const organizationName = specialOrganization.trim()
    if (!organizationName) {
      setSpecialError('Indica el nombre de la organización para personalizar el mensaje.')
      return
    }

    const participantEmails = new Set(
      participants.map((profile) => profile.email?.trim().toLowerCase()).filter(Boolean),
    )
    if (participantEmails.has(email)) {
      setSpecialError('Este correo ya está registrado como participante. Selecciónalo en la lista.')
      return
    }

    if (specialRecipients.some((recipient) => recipient.email === email)) {
      setSpecialError('Este destinatario especial ya fue agregado.')
      return
    }

    setSpecialRecipients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        email,
        organizationName,
      },
    ])
    setSpecialEmail('')
    setSpecialOrganization('')
  }

  function removeSpecialRecipient(id: string) {
    setSpecialRecipients((prev) => prev.filter((recipient) => recipient.id !== id))
  }

  function insertOrganizationPlaceholder() {
    const textarea = customTextareaRef.current
    if (!textarea) {
      setCustomBody((prev) => `${prev}${prev.endsWith('\n') ? '' : '\n'}${ORGANIZATION_PLACEHOLDER}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next =
      customBody.slice(0, start) + ORGANIZATION_PLACEHOLDER + customBody.slice(end)
    setCustomBody(next)
    window.requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + ORGANIZATION_PLACEHOLDER.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  async function handleSend() {
    if (totalSelectedCount === 0) {
      setFeedback({ type: 'error', message: 'Selecciona al menos un destinatario.' })
      return
    }

    setSending(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/admin/broadcast-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          customBody: templateId === 'custom' ? customBody : undefined,
          profileIds: [...selectedIds],
          externalRecipients: specialRecipients.map((recipient) => ({
            email: recipient.email,
            organizationName: recipient.organizationName,
          })),
        }),
      })

      const data = (await res.json()) as {
        error?: string
        sentCount?: number
        failedCount?: number
        failures?: { email: string; error: string }[]
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudieron enviar los mensajes.')
      }

      if ((data.failedCount ?? 0) > 0) {
        const detail = data.failures?.[0]?.error ? ` ${data.failures[0].error}` : ''
        setFeedback({
          type: 'error',
          message: `Enviados: ${data.sentCount ?? 0}. Fallidos: ${data.failedCount ?? 0}.${detail}`,
        })
      } else {
        setFeedback({
          type: 'success',
          message: `Se enviaron ${data.sentCount ?? 0} correo(s) correctamente. Cada envío genera copia interna en direccion@amaro.agency.`,
        })
        clearSelection()
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudieron enviar los mensajes.',
      })
    } finally {
      setSending(false)
    }
  }

  if (authorized === null || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        Cargando mensajes…
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] px-6 text-center text-sm text-muted-foreground">
        No tienes acceso a esta sección.
      </div>
    )
  }

  return (
    <AdminShell
      title="Mensajes a participantes"
      subtitle="Comunicaciones por correo desde el panel de administración"
    >
      {feedback && (
        <p
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-[#8ac441]/40 bg-[#e8f0e4] text-[#1a3c34]'
              : 'border-red-200 bg-red-50 text-red-800',
          )}
        >
          {feedback.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-4 rounded-2xl border border-[#dde8d8] bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-[#1a3c34]">Tipo de mensaje</h2>
            <p className="mt-1 text-sm text-[#5a6b62]">
              El nombre de la organización se inserta automáticamente en cada correo.
            </p>
          </div>

          <div className="space-y-2">
            {(Object.entries(ADMIN_BROADCAST_TEMPLATES) as [Exclude<AdminBroadcastTemplateId, 'custom'>, typeof ADMIN_BROADCAST_TEMPLATES.general_1][]).map(
              ([id, template]) => (
                <label
                  key={id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                    templateId === id
                      ? 'border-[#8ac441] bg-[#e8f0e4]/60'
                      : 'border-[#dde8d8] hover:border-[#8ac441]/50',
                  )}
                >
                  <input
                    type="radio"
                    name="broadcast-template"
                    checked={templateId === id}
                    onChange={() => setTemplateId(id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#1a3c34]">{template.label}</span>
                    <span className="mt-1 block text-xs text-[#5a6b62]">{template.subject}</span>
                  </span>
                </label>
              ),
            )}

            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                templateId === 'custom'
                  ? 'border-[#8ac441] bg-[#e8f0e4]/60'
                  : 'border-[#dde8d8] hover:border-[#8ac441]/50',
              )}
            >
              <input
                type="radio"
                name="broadcast-template"
                checked={templateId === 'custom'}
                onChange={() => setTemplateId('custom')}
                className="mt-1"
              />
              <span className="w-full">
                <span className="block text-sm font-semibold text-[#1a3c34]">Mensaje personalizado</span>
                <span className="mt-1 block text-xs text-[#5a6b62]">
                  Usa {ORGANIZATION_PLACEHOLDER} o (NOMBRE DE LA ORGANIZACIÓN) para personalizar.
                </span>
              </span>
            </label>
          </div>

          {templateId === 'custom' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={insertOrganizationPlaceholder}>
                  Insertar {ORGANIZATION_PLACEHOLDER}
                </Button>
              </div>
              <textarea
                ref={customTextareaRef}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-[#dde8d8] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#1a3c34] outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25"
                placeholder={`Señores ${ORGANIZATION_PLACEHOLDER}:\n\nSu mensaje…`}
              />
            </div>
          )}

          <div className="rounded-xl border border-[#dde8d8] bg-[#f8fbf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8ac441]">Vista previa</p>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#3d5249]">
              {previewMessage || 'Completa el mensaje para ver la vista previa.'}
            </pre>
            <p className="mt-3 text-xs text-[#5a6b62]">
              Ejemplo con: {personalizeBroadcastText('{{ORGANIZACION}}', previewOrganization)}
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#dde8d8] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#1a3c34]">Destinatarios</h2>
              <p className="mt-1 text-sm text-[#5a6b62]">
                {totalSelectedCount} seleccionado(s) · {participants.length} participante(s)
                {specialRecipients.length > 0
                  ? ` · ${specialRecipients.length} especial(es)`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                Seleccionar filtrados
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-dashed border-[#8ac441]/50 bg-[#f8fbf8] p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-[#8ac441]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[#1a3c34]">Destinatario especial</h3>
            </div>
            <p className="text-xs leading-relaxed text-[#5a6b62]">
              Agrega un correo externo solo para este envío. No se guarda en la plataforma.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="email"
                value={specialEmail}
                onChange={(e) => {
                  setSpecialEmail(e.target.value)
                  setSpecialError(null)
                }}
                placeholder="correo@empresa.com"
                className="w-full rounded-xl border border-[#dde8d8] bg-white px-3 py-2.5 text-sm text-[#1a3c34] outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25"
              />
              <input
                type="text"
                value={specialOrganization}
                onChange={(e) => {
                  setSpecialOrganization(e.target.value)
                  setSpecialError(null)
                }}
                placeholder="Nombre de la organización"
                className="w-full rounded-xl border border-[#dde8d8] bg-white px-3 py-2.5 text-sm text-[#1a3c34] outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25"
              />
            </div>
            {specialError && <p className="text-xs text-red-700">{specialError}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addSpecialRecipient}
            >
              <Plus className="size-4" aria-hidden="true" />
              Agregar destinatario especial
            </Button>

            {specialRecipients.length > 0 && (
              <div className="space-y-2 pt-1">
                {specialRecipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#1a3c34]/20 bg-[#eef3ea] p-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#1a3c34]">
                        {recipient.organizationName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#5a6b62]">
                        {recipient.email}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSpecialRecipient(recipient.id)}
                      className="rounded-lg p-1 text-[#5a6b62] transition-colors hover:bg-white hover:text-[#1a3c34]"
                      aria-label={`Quitar ${recipient.email}`}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5a6b62]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar organización o correo…"
              className="w-full rounded-xl border border-[#dde8d8] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1a3c34] outline-none focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25"
            />
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filteredParticipants.map((profile) => {
              const org = displayOrganization(profile)
              const checked = selectedIds.has(profile.id)
              return (
                <label
                  key={profile.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                    checked ? 'border-[#1a3c34]/25 bg-[#eef3ea]' : 'border-[#dde8d8] hover:bg-[#f8fbf8]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelected(profile.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-[#1a3c34]">
                      <Building2 className="size-4 shrink-0 text-[#8ac441]" aria-hidden="true" />
                      {org}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#5a6b62]">{profile.email}</span>
                  </span>
                </label>
              )
            })}
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full gap-2 bg-[#1a3c34] text-white hover:bg-[#234a40]"
            disabled={sending || totalSelectedCount === 0}
            onClick={() => void handleSend()}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Enviar mensaje
          </Button>

          <p className="text-xs leading-relaxed text-[#5a6b62]">
            Cada envío sale desde conecta360.notificaciones@gmail.com y genera una copia interna en{' '}
            <strong>direccion@amaro.agency</strong> (sin mostrarse al destinatario).
          </p>
        </section>
      </div>
    </AdminShell>
  )
}
