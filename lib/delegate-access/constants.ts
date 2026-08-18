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
