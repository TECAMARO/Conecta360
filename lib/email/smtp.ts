function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

export function isSmtpConfigured(): boolean {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))
}

export function getSmtpFromAddress(fallbackEmail: string): string {
  return env('SMTP_FROM') || env('SMTP_USER') || `Conecta360 <${fallbackEmail}>`
}

export function createSmtpTransport() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as typeof import('nodemailer')
  const port = Number(env('SMTP_PORT') ?? 587)
  return nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: {
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
    },
  })
}

export function isLocalDevWithoutSmtp(): boolean {
  return process.env.NODE_ENV !== 'production' && !isSmtpConfigured()
}

export function getPublicSiteUrl(fallback = 'http://localhost:3000'): string {
  return env('NEXT_PUBLIC_SITE_URL')?.replace(/\/$/, '') || fallback
}
