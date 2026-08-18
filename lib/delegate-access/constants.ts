export const DELEGATE_SESSION_COOKIE = 'conecta360_delegate_ctx'

export type DelegateSessionPayload = {
  ownerUserId: string
  delegateEmail: string
  delegateAccessId: string
}

export function normalizeDelegateEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Mensaje genérico cuando el correo no está disponible (titular, delegado u otro). */
export const DELEGATE_EMAIL_UNAVAILABLE_MESSAGE =
  'Este correo no está disponible. Elige otro correo electrónico.'

export const DELEGATE_EMAIL_AVAILABLE_MESSAGE = 'Correo disponible. Puedes continuar.'

export const REGISTRATION_CREDENTIAL_IN_USE_MESSAGE =
  'Esta credencial ya está en uso. Inicia sesión o utiliza otro correo.'

export const DELEGATE_CANNOT_REGISTER_MESSAGE = 'Delegados no pueden crearse una cuenta'

/** Normaliza errores de signUp (trigger SQL / Auth) a mensajes de registro. */
export function mapRegistrationSignUpError(message: string): string {
  const lower = message.toLowerCase()
  if (
    lower.includes('database error saving new user') ||
    lower.includes('credential_in_use')
  ) {
    return DELEGATE_CANNOT_REGISTER_MESSAGE
  }
  if (
    lower.includes('already') ||
    lower.includes('registered') ||
    lower.includes('credential') ||
    lower.includes('in use')
  ) {
    return REGISTRATION_CREDENTIAL_IN_USE_MESSAGE
  }
  return message
}
