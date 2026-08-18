/** Normaliza entrada opcional de sitio web para guardar en perfil. */
export function normalizeOrganizationWebsite(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function hasOrganizationWebsite(value: string | null | undefined): value is string {
  return Boolean(normalizeOrganizationWebsite(value))
}

export function organizationWebsiteHref(value: string): string {
  return normalizeOrganizationWebsite(value) ?? value
}

export function organizationWebsiteLabel(value: string): string {
  const normalized = normalizeOrganizationWebsite(value)
  if (!normalized) return value.trim()

  try {
    const url = new URL(normalized)
    return url.hostname.replace(/^www\./i, '')
  } catch {
    return value.trim()
  }
}
