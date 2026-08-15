import { MASTER_ADMIN_EMAIL } from '@/lib/admin-auth/constants'
import {
  createSmtpTransport,
  getSmtpFromAddress,
  isLocalDevWithoutSmtp,
  isSmtpConfigured,
} from '@/lib/email/smtp'

export type SendAdminOtpResult = {
  sentTo: string
  /** Solo en desarrollo cuando SMTP no está configurado */
  devCode?: string
}

function smtpConfigured(): boolean {
  return isSmtpConfigured()
}

function buildTransport() {
  return createSmtpTransport()
}

/**
 * Envía correo explícito con código OTP de 4 dígitos (NO magic link).
 * Destinatario fijo: rdnv1amaro@gmail.com
 *
 * Configura en .env.local el mismo SMTP que Supabase → Authentication → SMTP:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
export async function sendAdminOtpEmail(code: string): Promise<SendAdminOtpResult> {
  const to = process.env.ADMIN_OTP_EMAIL_TO?.trim() || MASTER_ADMIN_EMAIL
  const subject = 'Conecta360 · Código de verificación administrativa'
  const text = [
    'Verificación de administrador — Conecta360',
    '',
    `Tu código de acceso al panel /admin es: ${code}`,
    '',
    'Este código expira en 10 minutos.',
    'No compartas este código con nadie.',
    '',
    'Si no solicitaste este acceso, ignora este correo.',
  ].join('\n')

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#f8f9fa">
      <div style="background:#fff;border:1px solid #dde8d8;border-radius:12px;padding:28px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8ac441">
          Conecta360 · Admin
        </p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#1a3c34">Código de verificación</h1>
        <p style="margin:0 0 20px;color:#5a6b62;line-height:1.6">
          Ingresa este código en la pantalla de verificación administrativa.
          <strong>No es un enlace</strong> — escribe los 4 dígitos manualmente.
        </p>
        <div style="text-align:center;margin:28px 0;padding:20px;background:#eef3ea;border-radius:10px">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a3c34">${code}</span>
        </div>
        <p style="margin:0;font-size:13px;color:#5a6b62">
          Válido por <strong>10 minutos</strong>. Destinatario: ${to}
        </p>
      </div>
    </div>
  `

  if (smtpConfigured()) {
    const from = getSmtpFromAddress(MASTER_ADMIN_EMAIL)

    const transport = buildTransport()
    await transport.sendMail({ from, to, subject, text, html })
    return { sentTo: to }
  }

  if (isLocalDevWithoutSmtp()) {
    console.warn(`[ADMIN OTP · DEV] Código ${code} para ${to} (SMTP no configurado)`)
    return { sentTo: to, devCode: code }
  }

  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(
    (key) => !process.env[key]?.trim(),
  )
  throw new Error(
    `SMTP no configurado (faltan: ${missing.join(', ')}). Añádelas en .env.local y reinicia el servidor (npm run dev). Usa los mismos valores de Supabase → Authentication → SMTP Settings.`,
  )
}
