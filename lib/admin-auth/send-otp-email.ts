import { MASTER_ADMIN_EMAIL } from '@/lib/admin-auth/constants'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Envía OTP al Admin Maestro vía Supabase Auth (SMTP del proyecto).
 * Destinatario fijo: rdnv1amaro@gmail.com
 */
export async function sendAdminOtpEmail(): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: MASTER_ADMIN_EMAIL,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    throw new Error(
      `No se pudo enviar el código a ${MASTER_ADMIN_EMAIL}: ${error.message}`,
    )
  }
}
