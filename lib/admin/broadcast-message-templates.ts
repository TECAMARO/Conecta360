import { displayOrg } from '@/lib/email/meeting-email-shared'

export type AdminBroadcastTemplateId = 'general_1' | 'general_2' | 'profile_1' | 'custom'

export const ORGANIZATION_PLACEHOLDER = '{{ORGANIZACION}}'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valida y normaliza correos externos del panel Mensajes (no persistidos). */
export function normalizeBroadcastExternalEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(trimmed)) return null
  return trimmed
}

export function resolveExternalBroadcastOrganizationName(
  organizationName: string | undefined | null,
  email: string,
): string {
  const trimmed = organizationName?.trim()
  if (trimmed) return trimmed
  const localPart = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
  return localPart ? localPart.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Organización'
}

export type BroadcastRecipient = {
  id: string
  email: string
  organizationName: string
}

export function resolveBroadcastOrganizationName(profile: {
  organization_name?: string | null
  full_name?: string | null
  email?: string | null
}): string {
  return displayOrg(profile)
}

/** Sustituye marcadores de organización en plantillas y mensajes personalizados. */
export function personalizeBroadcastText(body: string, organizationName: string): string {
  return body
    .replaceAll('(NOMBRE DE LA ORGANIZACIÓN)', organizationName)
    .replaceAll('{{NOMBRE_ORGANIZACION}}', organizationName)
    .replaceAll(ORGANIZATION_PLACEHOLDER, organizationName)
}

const GENERAL_1_BODY = `Señores (NOMBRE DE LA ORGANIZACIÓN):

Ustedes ya están registrados en Conecta 360, la plataforma de rueda de negocios de la Semana Orinoquía Sostenible y Competitiva 2026.

Les recordamos la importancia de revisar diariamente la plataforma, ya que constantemente se están registrando nuevas organizaciones y empresas que pueden ser de su interés.

A través de Conecta 360 podrán:
* Consultar los perfiles de las organizaciones participantes.
* Identificar organizaciones con las que tengan oportunidades de conexión.
* Solicitar reuniones de negocios.
* Revisar y gestionar las solicitudes de reuniones que reciban.

Las reuniones se desarrollarán en el marco de la Semana Orinoquía Sostenible y Competitiva 2026, que se realizará del 21 al 26 de septiembre en el Teatro La Vorágine, Villavicencio, Meta.

Les invitamos a ingresar diariamente a la plataforma y aprovechar al máximo las oportunidades de conexión y generación de negocios que ofrece este espacio.

¡Nos vemos en la Semana Orinoquía Sostenible y Competitiva 2026!`

const GENERAL_2_BODY = `Señores (NOMBRE DE LA ORGANIZACIÓN):

¡Bienvenidos a Conecta 360! 🎯

Usted acaba de realizar su registro en la plataforma de rueda de negocios de la Semana Orinoquía Sostenible y Competitiva 2026.

A través de Conecta 360 podrá consultar los perfiles de las diferentes organizaciones y empresas que participan en este espacio, identificar oportunidades de conexión, solicitar reuniones con las organizaciones de su interés y aceptar o gestionar las solicitudes de reuniones que reciba.

Las reuniones se realizarán de manera presencial, en la zona establecida por Amaro Agency para el desarrollo de la rueda de negocios, durante la Semana Orinoquía Sostenible y Competitiva 2026, que se llevará a cabo del 21 al 26 de septiembre en el Teatro La Vorágine, Villavicencio, Meta.

Le recomendamos ingresar periódicamente a la plataforma, revisar los nuevos perfiles registrados y estar atento(a) a las solicitudes de reunión que pueda recibir.

¡Gracias por ser parte de Conecta 360 y nos vemos en la Semana Orinoquía Sostenible y Competitiva 2026!`

const PROFILE_1_BODY = `Señores (NOMBRE DE LA ORGANIZACIÓN):

Nos dirigimos a ustedes para informarles que hemos detectado que el registro de su empresa en la plataforma Conecta360 aún no ha sido completado en su totalidad.

Para finalizar el proceso y asegurar que su cuenta esté correctamente configurada, les solicitamos amablemente que sigan estos breves pasos:

* Ingresar a la plataforma y dirigirse a la sección "Mi Perfil Estratégico".
* Rellenar los espacios correspondientes que el sistema les indicará como faltantes al momento de hacer clic en el botón "Guardar y publicar Perfil en la Red".

Completar estos datos es un paso fundamental para enriquecer la información de su empresa. Tener un perfil detallado y actualizado les permitirá obtener una mayor visibilidad y llegar a más usuarios dentro de nuestra red de negocios Conecta360.

¡Quedamos a su entera disposición en caso de que requieran soporte o asistencia adicional durante la Semana Orinoquía Sostenible y Competitiva 2026!`

export const ADMIN_BROADCAST_TEMPLATES: Record<
  Exclude<AdminBroadcastTemplateId, 'custom'>,
  { label: string; subject: string; body: string }
> = {
  general_1: {
    label: 'Mensaje General',
    subject: 'Conecta360 · Recordatorio de participación',
    body: GENERAL_1_BODY,
  },
  general_2: {
    label: 'Mensaje General 2 (Bienvenida)',
    subject: 'Conecta360 · Bienvenida a la plataforma',
    body: GENERAL_2_BODY,
  },
  profile_1: {
    label: 'Mensaje Perfil',
    subject: 'Conecta360 · Complete su perfil en la plataforma',
    body: PROFILE_1_BODY,
  },
}

export function buildBroadcastMessage(args: {
  templateId: AdminBroadcastTemplateId
  organizationName: string
  customBody?: string
}): { subject: string; text: string } {
  const { templateId, organizationName, customBody } = args

  if (templateId === 'custom') {
    const raw = customBody?.trim() ?? ''
    if (!raw) {
      throw new Error('El mensaje personalizado no puede estar vacío.')
    }
    return {
      subject: 'Conecta360 · Comunicado',
      text: personalizeBroadcastText(raw, organizationName),
    }
  }

  const template = ADMIN_BROADCAST_TEMPLATES[templateId]
  return {
    subject: template.subject,
    text: personalizeBroadcastText(template.body, organizationName),
  }
}
