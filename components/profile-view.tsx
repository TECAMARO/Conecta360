'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StandardTagSelector } from '@/components/standard-tag-selector'
import { SectorBadge } from '@/components/sector-badge'
import { ParticipantCard } from '@/components/participant-card'
import { DocumentCenterSection } from '@/components/document-center-section'
import { SectorSelect, profileInputClass } from '@/components/sector-select'
import { cn } from '@/lib/utils'
import { profileToParticipant } from '@/lib/directory'
import {
  canPublishProfile,
  EMPTY_PROFILE,
  publishProfile,
  profileInitials,
  setUserProfile,
  type UserProfile,
} from '@/lib/profile'
import { getAuthSession } from '@/lib/auth'
import {
  fetchMyProfile,
  getCurrentUserId,
  saveMyProfileBrochure,
  updateMyProfileBrochureUrl,
  upsertMyProfile,
} from '@/lib/supabase/profiles-repository'
import { deleteBrochure, storagePathFromPublicUrl, uploadBrochure } from '@/lib/supabase/brochures-repository'
import { EVENT } from '@/lib/event-config'
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
  Globe,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react'

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

export function ProfileView() {
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishHint, setPublishHint] = useState<string | null>(null)
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

  const previewParticipant =
    profile.isPublished && profileToParticipant(profile, userId ?? undefined)

  async function persist(next: UserProfile) {
    setSaving(true)
    setError(null)
    try {
      const id = await upsertMyProfile(next, getAuthSession()?.email)
      setUserId(id)
      setProfile(next)
      setUserProfile(next)
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
    if (!canPublishProfile(profile)) {
      setPublishHint(
        'Completa nombre, organización, sector, descripción, al menos una etiqueta en Qué Ofrece y Qué Busca antes de publicar.',
      )
      setEditing(true)
      return
    }
    try {
      const published = publishProfile(profile)
      await persist(published)
      setEditing(false)
      setPublishHint('¡Perfil publicado! Ya aparece en Explorar Participantes.')
    } catch {
      /* error shown in banner */
    }
  }

  async function handleBrochureUpload(file: File) {
    const uploaded = await uploadBrochure(file)
    const next = { ...profile, brochure: uploaded }
    const savedUserId = await saveMyProfileBrochure(
      uploaded.brochureUrl,
      next,
      getAuthSession()?.email,
    )
    setUserId(savedUserId)
    setProfile(next)
    setUserProfile(next)
    window.dispatchEvent(new Event('conecta360-profile-updated'))
    setPublishHint(`¡Brochure PDF "${uploaded.fileName}" subido y guardado correctamente!`)
  }

  async function handleBrochureRemove() {
    const path =
      profile.brochure?.storagePath ??
      (profile.brochure?.brochureUrl
        ? storagePathFromPublicUrl(profile.brochure.brochureUrl)
        : undefined)
    if (path) {
      try {
        await deleteBrochure(path)
      } catch {
        /* storage delete may fail if already removed */
      }
    }
    const next = { ...profile, brochure: null }
    await updateMyProfileBrochureUrl(null)
    setProfile(next)
    setUserProfile(next)
    window.dispatchEvent(new Event('conecta360-profile-updated'))
    setPublishHint('Brochure PDF eliminado del perfil.')
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
            disabled={saving}
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
            disabled={saving}
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
          <p className="rounded-xl border border-[#8ac441]/30 bg-[#e8f0e4]/70 px-4 py-3 text-sm text-[#1a3c34]">
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
                {profile.location || 'Ubicación'}
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
              onChange={(v) => setProfile((p) => ({ ...p, fullName: v }))}
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
              onChange={(v) => setProfile((p) => ({ ...p, organization: v }))}
            />
            <Field
              icon={MapPin}
              label="Ubicación"
              value={profile.location}
              editing={editing}
              onChange={(v) => setProfile((p) => ({ ...p, location: v }))}
            />
            {editing ? (
              <SectorSelect
                value={profile.sector}
                onChange={(sector) => setProfile((p) => ({ ...p, sector }))}
              />
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Sector Económico / Categoría
                </p>
                <SectorBadge sector={profile.sector} />
                {!profile.sector && (
                  <p className="mt-1 text-sm text-muted-foreground">Sin sector seleccionado</p>
                )}
              </div>
            )}

            <div>
              <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                Resumen / Descripción de la organización
              </p>
              {editing ? (
                <textarea
                  value={profile.description}
                  onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  maxLength={600}
                  placeholder="Describe brevemente la misión, propuesta de valor y enfoque de tu organización…"
                  className={cn(
                    profileInputClass,
                    'resize-y border-input bg-background focus-visible:ring-ring/30',
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
            hint="Selecciona una o varias capacidades estandarizadas. Puedes añadir etiquetas personalizadas."
            options={OFFER_TAG_OPTIONS}
            tags={profile.offer}
            onChange={(offer) => setProfile((p) => ({ ...p, offer }))}
            disabled={!editing}
          />

          <StandardTagSelector
            label="Qué Busca"
            hint="Selecciona tus objetivos de networking. Puedes añadir etiquetas personalizadas."
            options={SEEKING_TAG_OPTIONS}
            tags={profile.seeking}
            onChange={(seeking) => setProfile((p) => ({ ...p, seeking }))}
            disabled={!editing}
          />
        </div>
      </div>

      <div className="mt-6">
        <DocumentCenterSection
          brochure={profile.brochure}
          onUpload={handleBrochureUpload}
          onRemove={() => void handleBrochureRemove()}
        />
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
  onChange,
}: {
  icon: typeof User
  label: string
  value: string
  editing: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {label}
      </p>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(profileInputClass, 'border-input bg-background focus-visible:ring-ring/30')}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{value || '—'}</p>
      )}
    </div>
  )
}
