function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** SMTP del OTP admin (SMTP_*). No usar para correos de reuniones. */
export function isSmtpConfigured(): boolean {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))
}

/** SMTP de reuniones confirmadas/canceladas (SMTP_TRANSACTIONAL_*). */
export function isTransactionalSmtpConfigured(): boolean {
  if (
    env('SMTP_TRANSACTIONAL_HOST') &&
    env('SMTP_TRANSACTIONAL_USER') &&
    env('SMTP_TRANSACTIONAL_PASS')
  ) {
    return true
  }
  // Compatibilidad pre-migración: mismo SMTP que OTP
  return isSmtpConfigured()
}

export function getSmtpFromAddress(fallbackEmail: string): string {
  return env('SMTP_FROM') || env('SMTP_USER') || `Conecta360 <${fallbackEmail}>`
}

export function getTransactionalFromAddress(): string {
  const transactional = env('SMTP_TRANSACTIONAL_FROM')
  if (transactional) return transactional
  const user = env('SMTP_TRANSACTIONAL_USER')
  if (user) return `Conecta360 · Orinoquía 2026 <${user}>`
  return getSmtpFromAddress('noreply@conecta360.local')
}

export function getTransactionalReplyTo(): string | undefined {
  return env('SMTP_REPLY_TO') || env('SMTP_TRANSACTIONAL_USER') || env('SMTP_USER')
}

function createTransportFromEnv(prefix: '' | 'TRANSACTIONAL_' = '') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as typeof import('nodemailer')

  const hostKey = prefix ? 'SMTP_TRANSACTIONAL_HOST' : 'SMTP_HOST'
  const portKey = prefix ? 'SMTP_TRANSACTIONAL_PORT' : 'SMTP_PORT'
  const userKey = prefix ? 'SMTP_TRANSACTIONAL_USER' : 'SMTP_USER'
  const passKey = prefix ? 'SMTP_TRANSACTIONAL_PASS' : 'SMTP_PASS'

  const host = env(hostKey) || (prefix ? env('SMTP_HOST') : undefined)
  const user = env(userKey) || (prefix ? env('SMTP_USER') : undefined)
  const pass = env(passKey) || (prefix ? env('SMTP_PASS') : undefined)
  const port = Number(env(portKey) ?? (prefix ? env('SMTP_PORT') : undefined) ?? 587)

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })
}

/** Transporte OTP admin — solo SMTP_*. */
export function createSmtpTransport() {
  return createTransportFromEnv('')
}

/** Transporte reuniones — SMTP_TRANSACTIONAL_* (sin mezclar credenciales OTP). */
export function createTransactionalSmtpTransport() {
  return createTransportFromEnv('TRANSACTIONAL_')
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
