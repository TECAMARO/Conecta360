import { MASTER_ADMIN_EMAIL } from '@/lib/admin-auth/constants'

/**
 * Envía el OTP al Admin Maestro.
 * - Producción: RESEND_API_KEY + RESEND_FROM_EMAIL
 * - Desarrollo: registra en consola del servidor
 */
export async function sendAdminOtpEmail(code: string): Promise<void> {
  const to = MASTER_ADMIN_EMAIL
  const subject = 'Conecta360 · Código de verificación administrativa'
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a3c34;margin:0 0 12px">Verificación de administrador</h2>
      <p style="color:#5a6b62;line-height:1.5">
        Tu código de acceso al panel <strong>/admin</strong> es:
      </p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a3c34;margin:24px 0">${code}</p>
      <p style="color:#5a6b62;font-size:13px">Expira en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>
    </div>
  `

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'Conecta360 <onboarding@resend.dev>'

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`No se pudo enviar el correo OTP: ${body}`)
    }
    return
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[ADMIN OTP · DEV ONLY] Código para ${to}: ${code}`)
    return
  }

  throw new Error(
    'Servicio de correo no configurado. Define RESEND_API_KEY y RESEND_FROM_EMAIL.',
  )
}
