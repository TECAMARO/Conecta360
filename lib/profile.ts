import type { CategoryId } from '@/lib/data'
import type { Sector } from '@/lib/event-config'
import { normalizeOrganizationWebsite } from '@/lib/organization-website'
import {
  normalizeProfileSectors,
  profileHasSector,
} from '@/lib/profile-sectors'
import type { VerityStatus } from '@/lib/verity-status'

export const PROFILE_STORAGE_KEY = 'conecta360_profile'

export type UserProfile = {
  fullName: string
  role: string
  organization: string
  sector: Sector | string
  sectors: string[]
  location: string
  description: string
  offer: string[]
  seeking: string[]
  offerCardTags?: string[] | null
  seekingCardTags?: string[] | null
  isPublished: boolean
  photoUrl?: string | null
  websiteUrl?: string | null
  verityStatus?: VerityStatus
}

export const EMPTY_PROFILE: UserProfile = {
  fullName: '',
  role: '',
  organization: '',
  sector: '',
  sectors: [],
  location: '',
  description: '',
  offer: [],
  seeking: [],
  offerCardTags: null,
  seekingCardTags: null,
  isPublished: false,
  photoUrl: null,
  websiteUrl: null,
}

function isDataUrl(value: string): boolean {
  return value.startsWith('data:')
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function photoUrlForLocalStorage(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null
  if (isDataUrl(photoUrl)) return null
  return isHttpUrl(photoUrl) ? photoUrl : null
}

function profileForLocalStorage(profile: UserProfile): UserProfile {
  const sectors = normalizeProfileSectors(profile.sectors, profile.sector)
  return {
    ...profile,
    photoUrl: photoUrlForLocalStorage(profile.photoUrl),
    websiteUrl: normalizeOrganizationWebsite(profile.websiteUrl),
    sectors,
    sector: sectors[0] ?? '',
    offerCardTags: profile.offerCardTags ?? null,
    seekingCardTags: profile.seekingCardTags ?? null,
  }
}

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  const sectors = normalizeProfileSectors(
    Array.isArray(raw.sectors)
      ? raw.sectors.filter((x): x is string => typeof x === 'string')
      : null,
    typeof raw.sector === 'string' ? raw.sector : '',
  )

  return {
    ...EMPTY_PROFILE,
    fullName: typeof raw.fullName === 'string' ? raw.fullName : '',
    role: typeof raw.role === 'string' ? raw.role : '',
    organization: typeof raw.organization === 'string' ? raw.organization : '',
    sector: sectors[0] ?? '',
    sectors,
    location: typeof raw.location === 'string' ? raw.location : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    offer: Array.isArray(raw.offer) ? raw.offer.filter((x): x is string => typeof x === 'string') : [],
    seeking: Array.isArray(raw.seeking)
      ? raw.seeking.filter((x): x is string => typeof x === 'string')
      : [],
    isPublished: raw.isPublished === true,
    photoUrl: normalizePhotoUrl(raw.photoUrl),
    websiteUrl: normalizeOrganizationWebsite(
      typeof raw.websiteUrl === 'string' ? raw.websiteUrl : null,
    ),
    offerCardTags: Array.isArray(raw.offerCardTags)
      ? raw.offerCardTags.filter((x): x is string => typeof x === 'string')
      : null,
    seekingCardTags: Array.isArray(raw.seekingCardTags)
      ? raw.seekingCardTags.filter((x): x is string => typeof x === 'string')
      : null,
  }
}

function normalizePhotoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  if (isDataUrl(raw)) return null
  return raw
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) return null
  try {
    const profile = normalizeProfile(JSON.parse(raw) as Record<string, unknown>)
    const lightweight = profileForLocalStorage(profile)
    if (JSON.stringify(lightweight) !== raw) {
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(lightweight))
      } catch {
        /* ignore migration write errors */
      }
    }
    return profile
  } catch {
    return null
  }
}

export function setUserProfile(profile: UserProfile) {
  if (typeof window === 'undefined') return
  const lightweight = profileForLocalStorage(profile)
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(lightweight))
    return
  } catch {
    /* quota exceeded — retry without optional heavy fields */
  }

  try {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({ ...lightweight, photoUrl: null }),
    )
    console.warn(
      '[conecta360] Perfil guardado sin foto en caché local (cuota de almacenamiento).',
    )
  } catch (err) {
    console.warn('[conecta360] No se pudo guardar el perfil en localStorage.', err)
  }
}

export function getProfileOrDefault(): UserProfile {
  return getUserProfile() ?? { ...EMPTY_PROFILE }
}

export function profileInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function clearUserProfile() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PROFILE_STORAGE_KEY)
}

/** Fields validated before publishing to the directory. */
export type PublishProfileField =
  | 'fullName'
  | 'organization'
  | 'sector'
  | 'location'
  | 'description'
  | 'offer'
  | 'seeking'

const PUBLISH_FIELD_LABELS: Record<PublishProfileField, string> = {
  fullName: 'nombre completo',
  organization: 'empresa u organización',
  sector: 'sector económico / categoría',
  location: 'ubicación/país',
  description: 'resumen / descripción de la organización',
  offer: 'qué ofrece',
  seeking: 'qué busca',
}

export function getPublishProfileMissingFields(profile: UserProfile): PublishProfileField[] {
  const missing: PublishProfileField[] = []
  if (!profile.fullName.trim()) missing.push('fullName')
  if (!profile.organization.trim()) missing.push('organization')
  if (!profileHasSector(profile)) missing.push('sector')
  if (!profile.location.trim()) missing.push('location')
  if (!profile.description.trim()) missing.push('description')
  if (profile.offer.length === 0) missing.push('offer')
  if (profile.seeking.length === 0) missing.push('seeking')
  return missing
}

export function publishProfileValidationMessage(missing: PublishProfileField[]): string {
  if (missing.length === 0) return ''
  const labels = missing.map((field) => PUBLISH_FIELD_LABELS[field])
  return `Completa ${labels.join(', ')} antes de publicar.`
}

/** Minimum fields required before publishing to the directory. */
export function canPublishProfile(profile: UserProfile): boolean {
  return getPublishProfileMissingFields(profile).length === 0
}

/** Subtitle shown under the user name in the platform sidebar. */
export function profileSidebarSubtitle(profile: UserProfile): string {
  if (canPublishProfile(profile) || profile.isPublished) {
    const detail = [profile.role, profile.organization].filter(Boolean).join(' · ')
    return detail || 'Perfil completo'
  }
  return 'Completa tu perfil'
}

export function publishProfile(profile: UserProfile): UserProfile {
  return { ...profile, isPublished: true }
}

/** Map user sector label to a directory category for filtering. */
export function sectorToCategory(_sector: string): CategoryId {
  return 'innovacion-social'
}
