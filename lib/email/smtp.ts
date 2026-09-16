function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** SMTP del OTP admin (SMTP_*). No usar para correos de reuniones. */
export function isSmtpConfigured(): boolean {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))
}

/** SMTP de reuniones confirmadas/canceladas — solo SMTP_TRANSACTIONAL_* (sin fallback admin). */
export function isTransactionalSmtpConfigured(): boolean {
  return Boolean(
    env('SMTP_TRANSACTIONAL_HOST') &&
      env('SMTP_TRANSACTIONAL_USER') &&
      env('SMTP_TRANSACTIONAL_PASS'),
  )
}

/**
 * Mensajes del panel Admin → Mensajes.
 * Usa la misma cuenta de notificaciones (SMTP_TRANSACTIONAL_* → conecta360.notificaciones@gmail.com).
 */
export function isAdminBroadcastSmtpConfigured(): boolean {
  return isTransactionalSmtpConfigured()
}

export function getSmtpFromAddress(fallbackEmail: string): string {
  return env('SMTP_FROM') || env('SMTP_USER') || `Conecta360 <${fallbackEmail}>`
}

/** Parsea "Nombre <email@dominio>" o devuelve solo la dirección autenticada. */
export function getTransactionalFromAddress(): string | { name: string; address: string } {
  const user = env('SMTP_TRANSACTIONAL_USER')
  const raw = env('SMTP_TRANSACTIONAL_FROM')

  if (raw) {
    const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
    if (match) {
      return { name: match[1].trim(), address: match[2].trim() }
    }
    if (raw.includes('@')) return raw
  }

  if (user) {
    return {
      name: 'Conecta360 · Orinoquia 2026',
      address: user,
    }
  }

  return getSmtpFromAddress('noreply@conecta360.local')
}

export function getTransactionalReplyTo(): string | undefined {
  return env('SMTP_REPLY_TO') || env('SMTP_TRANSACTIONAL_USER') || undefined
}

export function getAdminBroadcastFromAddress(): string | { name: string; address: string } {
  return getTransactionalFromAddress()
}

export function getAdminBroadcastReplyTo(): string | undefined {
  return getTransactionalReplyTo()
}

const DEFAULT_ADMIN_BROADCAST_BCC = 'direccion@amaro.agency'

function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase()
}

/** Dirección autenticada en SMTP transaccional (MAIL FROM). */
export function getTransactionalSmtpUser(): string {
  const user = env('SMTP_TRANSACTIONAL_USER')
  if (!user) {
    throw new Error('SMTP transaccional sin SMTP_TRANSACTIONAL_USER.')
  }
  return normalizeEmailAddress(user)
}

export function parseEmailAddressList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []

  const seen = new Set<string>()
  const addresses: string[] = []

  for (const part of raw.split(/[,;]+/)) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const match = trimmed.match(/<([^>]+)>/)
    const email = normalizeEmailAddress(match?.[1] ?? trimmed)
    if (!email.includes('@') || seen.has(email)) continue

    seen.add(email)
    addresses.push(email)
  }

  return addresses
}

export function getAdminBroadcastBccList(): string[] {
  const configured = parseEmailAddressList(env('ADMIN_BROADCAST_BCC'))
  if (configured.length > 0) return configured
  return [DEFAULT_ADMIN_BROADCAST_BCC]
}

export function getAdminBroadcastBcc(): string {
  return getAdminBroadcastBccList()[0] ?? DEFAULT_ADMIN_BROADCAST_BCC
}

/** Transporte OTP admin — solo SMTP_*. */
export function createSmtpTransport() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as typeof import('nodemailer')

  const host = env('SMTP_HOST')
  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS')
  const port = Number(env('SMTP_PORT') ?? 587)

  if (!host || !user || !pass) {
    throw new Error('SMTP admin (OTP) no configurado.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
  })
}

/** Transporte mensajes admin — misma cuenta SMTP_TRANSACTIONAL_* (notificaciones). */
export function createAdminBroadcastSmtpTransport() {
  return createTransactionalSmtpTransport()
}

/** Transporte reuniones — exclusivamente SMTP_TRANSACTIONAL_*. */
export function createTransactionalSmtpTransport() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as typeof import('nodemailer')

  const host = env('SMTP_TRANSACTIONAL_HOST')
  const user = env('SMTP_TRANSACTIONAL_USER')
  const pass = env('SMTP_TRANSACTIONAL_PASS')
  const port = Number(env('SMTP_TRANSACTIONAL_PORT') ?? 587)

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP transaccional no configurado. Define SMTP_TRANSACTIONAL_HOST, SMTP_TRANSACTIONAL_USER y SMTP_TRANSACTIONAL_PASS.',
    )
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
  })
}

export function isLocalDevWithoutSmtp(): boolean {
  return process.env.NODE_ENV !== 'production' && !isSmtpConfigured()
}

export function isLocalDevWithoutTransactionalSmtp(): boolean {
  return process.env.NODE_ENV !== 'production' && !isTransactionalSmtpConfigured()
}

export function getPublicSiteUrl(fallback = 'http://localhost:3000'): string {
  return env('NEXT_PUBLIC_SITE_URL')?.replace(/\/$/, '') || fallback
}
