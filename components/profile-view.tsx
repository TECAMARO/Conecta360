'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StandardTagSelector } from '@/components/standard-tag-selector'
import { SectorBadges } from '@/components/sector-badge'
import { ParticipantCard } from '@/components/participant-card'
import { SectorSelect, profileInputClass } from '@/components/sector-select'
import { cn } from '@/lib/utils'
import { profileToParticipant } from '@/lib/directory'
import {
  EMPTY_PROFILE,
  getPublishProfileMissingFields,
  getUserProfile,
  publishProfile,
  publishProfileValidationMessage,
  profileInitials,
  setUserProfile,
  type PublishProfileField,
  type UserProfile,
} from '@/lib/profile'
import { isVerityBlocked } from '@/lib/verity-status'
import { normalizeOrganizationWebsite } from '@/lib/organization-website'
import { pruneProfileCardTags } from '@/lib/profile-card-tags'
import { normalizeProfileSectors, profileHasSector } from '@/lib/profile-sectors'
import { getAuthSession } from '@/lib/auth'
import {
  fetchMyProfile,
  getCurrentUserId,
  upsertMyProfile,
} from '@/lib/supabase/profiles-repository'
import { EVENT } from '@/lib/event-config'
import type { PlatformTheme } from '@/lib/platform-preferences'
import { OFFER_TAG_OPTIONS, SEEKING_TAG_OPTIONS } from '@/lib/profile-tags'
import {
  Pencil,
  Check,
  Building2,
  Briefcase,
  User,
  Camera,
  X,
  MapPin,
  Layers,
  Globe,
  Eye,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

function PublishFieldError({ show }: { show?: boolean }) {
  if (!show) return null
  return (
    <AlertTriangle
      className="size-4 shrink-0 text-red-600"
      aria-hidden="true"
      title="Campo requerido para publicar"
    />
  )
}

function ProfileAvatar({
  fullName,
  photoUrl,
  editing,
  onPhotoChange,
  onPhotoRemove,
}: {
  fullName: string
  photoUrl?: string | null
  editing: boolean
  onPhotoChange: (dataUrl: string) => void
  onPhotoRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = profileInitials(fullName || '?')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onPhotoChange(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="relative size-20 shrink-0">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-secondary shadow-sm">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-primary">{initials || '?'}</span>
        )}
      </div>

      {editing && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Subir foto de perfil"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex size-11 items-center justify-center rounded-full border-2 border-card bg-primary text-white shadow-md transition-colors hover:bg-[#234a40]"
            aria-label="Cambiar foto"
            title="Cambiar foto"
          >
            <Camera className="size-4" aria-hidden="true" />
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={onPhotoRemove}
              className="absolute -top-1 -right-1 flex size-9 items-center justify-center rounded-full border border-card bg-destructive/90 text-white shadow-sm hover:bg-destructive"
              aria-label="Eliminar foto"
              title="Eliminar foto"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function ProfileView({ theme = 'light' }: { theme?: PlatformTheme }) {
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishHint, setPublishHint] = useState<string | null>(null)
  const [publishMissingFields, setPublishMissingFields] = useState<PublishProfileField[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const id = (await getCurrentUserId()) ?? getAuthSession()?.userId ?? null
        setUserId(id)
        if (!id) {
          setProfile(EMPTY_PROFILE)
          return
        }
        const remote = await fetchMyProfile(id)
        if (remote) {
          setProfile(remote)
          setUserProfile(remote)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    function syncVerityFromSession() {
      const sessionProfile = getUserProfile()
      if (!sessionProfile) return
      setProfile((prev) =>
        prev.verityStatus === sessionProfile.verityStatus
          ? prev
          : { ...prev, verityStatus: sessionProfile.verityStatus },
      )
      if (isVerityBlocked(sessionProfile.verityStatus)) {
        setEditing(false)
      }
    }
    window.addEventListener('conecta360-verity-updated', syncVerityFromSession)
    return () => window.removeEventListener('conecta360-verity-updated', syncVerityFromSession)
  }, [])

  const profileLocked = isVerityBlocked(profile.verityStatus)

  const previewParticipant =
    profile.isPublished && !profileLocked && profileToParticipant(profile, userId ?? undefined)

  async function persist(next: UserProfile) {
    if (isVerityBlocked(next.verityStatus)) return
    const payload = {
      ...next,
      websiteUrl: normalizeOrganizationWebsite(next.websiteUrl),
    }
    setSaving(true)
    setError(null)
    try {
      const id = await upsertMyProfile(payload, getAuthSession()?.email)
      setUserId(id)
      setProfile(payload)
      setUserProfile(payload)
      window.dispatchEvent(new Event('conecta360-profile-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    try {
      await persist(profile)
      setEditing(false)
      setPublishHint('Cambios guardados. Publica tu perfil para aparecer en el directorio.')
    } catch {
      /* error shown in banner */
    }
  }

  async function handlePublish() {
    const missing = getPublishProfileMissingFields(profile)
    if (missing.length > 0) {
      setPublishMissingFields(missing)
      setPublishHint(publishProfileValidationMessage(missing))
      setEditing(true)
      return
    }
    try {
      const published = publishProfile(profile)
      await persist(published)
      setPublishMissingFields([])
      setEditing(false)
      setPublishHint('¡Perfil publicado! Ya aparece en Explorar Participantes.')
    } catch {
      /* error shown in banner */
    }
  }

  function clearPublishFieldError(field: PublishProfileField) {
    setPublishMissingFields((prev) => prev.filter((item) => item !== field))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando perfil…</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl min-w-0">
      <header className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Mi Perfil Estratégico
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Perfil para {EVENT.name}
            </p>
          </div>
          <Button
            variant={editing ? 'default' : 'outline'}
            size="lg"
            disabled={saving || profileLocked}
            className="w-full shrink-0 sm:w-auto"
            onClick={() => (editing ? void handleSaveDraft() : setEditing(true))}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : editing ? (
              <Check className="size-4" />
            ) : (
              <Pencil className="size-4" />
            )}
            {editing ? 'Guardar borrador' : 'Editar perfil'}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Visibilidad en el directorio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.isPublished
                ? 'Tu organización está visible en Explorar Participantes.'
                : 'Tu perfil es privado hasta que lo publiques en la red.'}
            </p>
          </div>
          <Button
            size="lg"
            className="w-full shrink-0 gap-2 sm:w-auto"
            disabled={saving || profileLocked}
            onClick={() => void handlePublish()}
          >
            <Globe className="size-4" aria-hidden="true" />
            <span className="hidden min-[380px]:inline">Guardar y Publicar Perfil en la Red</span>
            <span className="min-[380px]:hidden">Publicar en la Red</span>
          </Button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {publishHint && (
          <p
            className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              publishMissingFields.length > 0
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-[#8ac441]/30 bg-[#e8f0e4]/70 text-[#1a3c34]',
            )}
          >
            {publishHint}
          </p>
        )}
      </header>

      <div className="rounded-2xl border border-border bg-card">
        <div className="overflow-hidden rounded-t-2xl bg-gradient-to-r from-primary to-[#234a40] px-6 py-4">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              fullName={profile.fullName || profile.organization}
              photoUrl={profile.photoUrl}
              editing={editing}
              onPhotoChange={(dataUrl) => setProfile((p) => ({ ...p, photoUrl: dataUrl }))}
              onPhotoRemove={() => setProfile((p) => ({ ...p, photoUrl: null }))}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-balance text-xl font-semibold leading-snug text-white drop-shadow-sm">
                {profile.fullName || 'Tu nombre'}
              </h2>
              <p className="mt-0.5 text-sm text-emerald-50/90">
                {profile.organization || 'Tu organización'}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-50/80">
                <MapPin className="size-3.5" aria-hidden="true" />
                {profile.location || 'Ubicación/País'}
              </p>
              {editing && (
                <p className="mt-1 text-xs text-white/70">Toca el ícono de cámara para cambiar tu foto</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-6">
          <div className="space-y-5">
            <Field
              icon={User}
              label="Nombre completo"
              value={profile.fullName}
              editing={editing}
              hasError={publishMissingFields.includes('fullName')}
              onChange={(v) => {
                clearPublishFieldError('fullName')
                setProfile((p) => ({ ...p, fullName: v }))
              }}
            />
            <Field
              icon={Briefcase}
              label="Cargo"
              value={profile.role}
              editing={editing}
              onChange={(v) => setProfile((p) => ({ ...p, role: v }))}
            />
            <Field
              icon={Building2}
              label="Empresa u Organización"
              value={profile.organization}
              editing={editing}
              hasError={publishMissingFields.includes('organization')}
              onChange={(v) => {
                clearPublishFieldError('organization')
                setProfile((p) => ({ ...p, organization: v }))
              }}
            />
            <Field
              icon={MapPin}
              label="Ubicación/País"
              value={profile.location}
              editing={editing}
              placeholder="Ej. Colombia, Venezuela, Ecuador…"
              hasError={publishMissingFields.includes('location')}
              onChange={(v) => {
                clearPublishFieldError('location')
                setProfile((p) => ({ ...p, location: v }))
              }}
            />
            {editing ? (
              <SectorSelect
                multiple
                appearance="platform"
                theme={theme}
                value={normalizeProfileSectors(profile.sectors, profile.sector)}
                hasError={publishMissingFields.includes('sector')}
                autoCollapseOnInactivity="from-second"
                onChange={(sectors) => {
                  clearPublishFieldError('sector')
                  const normalized = normalizeProfileSectors(sectors)
                  setProfile((p) => ({
                    ...p,
                    sectors: normalized,
                    sector: normalized[0] ?? '',
                  }))
                }}
              />
            ) : (
              <div>
                <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Layers className="size-4 text-primary" aria-hidden="true" />
                  Sector Económico / Categoría
                  <PublishFieldError show={publishMissingFields.includes('sector')} />
                </p>
                <SectorBadges sectors={normalizeProfileSectors(profile.sectors, profile.sector)} />
                {!profileHasSector(profile) && (
                  <p className="mt-1 text-sm text-muted-foreground">Sin sector seleccionado</p>
                )}
              </div>
            )}

            <div>
              <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                Resumen / Descripción de la organización
                <PublishFieldError show={publishMissingFields.includes('description')} />
              </p>
              {editing ? (
                <textarea
                  value={profile.description}
                  onChange={(e) => {
                    clearPublishFieldError('description')
                    setProfile((p) => ({ ...p, description: e.target.value }))
                  }}
                  rows={4}
                  maxLength={600}
                  placeholder="Describe brevemente la misión, propuesta de valor y enfoque de tu organización…"
                  className={cn(
                    profileInputClass,
                    'resize-y border-input bg-background focus-visible:ring-ring/30',
                    publishMissingFields.includes('description') &&
                      'border-red-300 ring-1 ring-red-200 focus-visible:ring-red-200/60',
                  )}
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {profile.description || 'Aún no has agregado una descripción.'}
                </p>
              )}
            </div>
          </div>

          <StandardTagSelector
            label="Qué Ofrece"
            hint={
              <>
                Selecciona una o varias capacidades estandarizadas. Puedes añadir etiquetas
                personalizadas{' '}
                <span className="font-semibold">y opcional seleccionar cinco prioritarias.</span>
              </>
            }
            options={OFFER_TAG_OPTIONS}
            tags={profile.offer}
            cardTags={profile.offerCardTags}
            hasError={publishMissingFields.includes('offer')}
            onChange={(offer) => {
              clearPublishFieldError('offer')
              setProfile((p) => ({
                ...p,
                offer,
                offerCardTags:
                  p.offerCardTags == null
                    ? null
                    : pruneProfileCardTags(offer, p.offerCardTags),
              }))
            }}
            onCardTagsChange={(offerCardTags) =>
              setProfile((p) => ({ ...p, offerCardTags }))
            }
            disabled={!editing || profileLocked}
          />

          <StandardTagSelector
            label="Qué Busca"
            hint={
              <>
                Selecciona tus objetivos de networking. Puedes añadir etiquetas personalizadas{' '}
                <span className="font-semibold">y opcional seleccionar cinco prioritarias.</span>
              </>
            }
            options={SEEKING_TAG_OPTIONS}
            tags={profile.seeking}
            cardTags={profile.seekingCardTags}
            hasError={publishMissingFields.includes('seeking')}
            onChange={(seeking) => {
              clearPublishFieldError('seeking')
              setProfile((p) => ({
                ...p,
                seeking,
                seekingCardTags:
                  p.seekingCardTags == null
                    ? null
                    : pruneProfileCardTags(seeking, p.seekingCardTags),
              }))
            }}
            onCardTagsChange={(seekingCardTags) =>
              setProfile((p) => ({ ...p, seekingCardTags }))
            }
            disabled={!editing || profileLocked}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Globe className="size-4 text-primary" aria-hidden="true" />
            Página Web de la Organización
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcional. Visible solo cuando otra organización abre tu perfil completo en Explorar
            Participantes.
          </p>
        </div>
        {editing ? (
          <input
            type="url"
            inputMode="url"
            value={profile.websiteUrl ?? ''}
            disabled={profileLocked}
            placeholder="https://www.tuorganizacion.com"
            onChange={(e) => setProfile((p) => ({ ...p, websiteUrl: e.target.value }))}
            className={cn(profileInputClass, 'border-input bg-background focus-visible:ring-ring/30')}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {profile.websiteUrl?.trim()
              ? profile.websiteUrl
              : 'Sin página web registrada.'}
          </p>
        )}
      </div>

      {previewParticipant && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">
              Vista previa en Explorar Participantes
            </h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Así verán otras organizaciones tu tarjeta publicada en el directorio.
          </p>
          <ParticipantCard
            participant={previewParticipant}
            readOnly
            onViewProfile={() => undefined}
          />
        </section>
      )}
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
  editing,
  placeholder,
  hasError = false,
  onChange,
}: {
  icon: typeof User
  label: string
  value: string
  editing: boolean
  placeholder?: string
  hasError?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {label}
        <PublishFieldError show={hasError} />
      </p>
      {editing ? (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            profileInputClass,
            'border-input bg-background focus-visible:ring-ring/30',
            hasError && 'border-red-300 ring-1 ring-red-200 focus-visible:ring-red-200/60',
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{value || '—'}</p>
      )}
    </div>
  )
}
