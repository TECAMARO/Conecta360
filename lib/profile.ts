import type { CategoryId } from '@/lib/data'
import type { Sector } from '@/lib/event-config'
import type { CorporateBrochure } from '@/lib/corporate-brochure'

export const PROFILE_STORAGE_KEY = 'conecta360_profile'

export type UserProfile = {
  fullName: string
  role: string
  organization: string
  sector: Sector | string
  location: string
  description: string
  offer: string[]
  seeking: string[]
  isPublished: boolean
  photoUrl?: string | null
  brochure?: CorporateBrochure | null
}

export const EMPTY_PROFILE: UserProfile = {
  fullName: '',
  role: '',
  organization: '',
  sector: '',
  location: 'Región Orinoquía, Colombia',
  description: '',
  offer: [],
  seeking: [],
  isPublished: false,
  photoUrl: null,
  brochure: null,
}

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  return {
    ...EMPTY_PROFILE,
    fullName: typeof raw.fullName === 'string' ? raw.fullName : '',
    role: typeof raw.role === 'string' ? raw.role : '',
    organization: typeof raw.organization === 'string' ? raw.organization : '',
    sector: typeof raw.sector === 'string' ? raw.sector : '',
    location: typeof raw.location === 'string' ? raw.location : EMPTY_PROFILE.location,
    description: typeof raw.description === 'string' ? raw.description : '',
    offer: Array.isArray(raw.offer) ? raw.offer.filter((x): x is string => typeof x === 'string') : [],
    seeking: Array.isArray(raw.seeking)
      ? raw.seeking.filter((x): x is string => typeof x === 'string')
      : [],
    isPublished: raw.isPublished === true,
    photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : null,
    brochure: normalizeBrochure(raw.brochure),
  }
}

function normalizeBrochure(raw: unknown): CorporateBrochure | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const fileName = typeof record.fileName === 'string' ? record.fileName : null
  const fileSize = typeof record.fileSize === 'number' ? record.fileSize : null
  const uploadedAt = typeof record.uploadedAt === 'string' ? record.uploadedAt : null
  const brochureUrl =
    typeof record.brochureUrl === 'string'
      ? record.brochureUrl
      : typeof record.publicUrl === 'string'
        ? record.publicUrl
        : typeof record.dataUrl === 'string'
          ? record.dataUrl
          : null

  if (fileName && fileSize !== null && uploadedAt && brochureUrl) {
    return {
      fileName,
      fileSize,
      brochureUrl,
      uploadedAt,
      storagePath: typeof record.storagePath === 'string' ? record.storagePath : undefined,
      publicUrl: typeof record.publicUrl === 'string' ? record.publicUrl : brochureUrl,
      dataUrl: typeof record.dataUrl === 'string' ? record.dataUrl : brochureUrl,
    }
  }
  return null
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) return null
  try {
    return normalizeProfile(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    return null
  }
}

export function setUserProfile(profile: UserProfile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
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

/** Minimum fields required before publishing to the directory. */
export function canPublishProfile(profile: UserProfile): boolean {
  return (
    profile.fullName.trim().length > 0 &&
    profile.organization.trim().length > 0 &&
    profile.sector.trim().length > 0 &&
    profile.description.trim().length > 0 &&
    profile.offer.length > 0 &&
    profile.seeking.length > 0
  )
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
