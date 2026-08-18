/** Dispara correo de auditoría admin sin bloquear registro ni revertir la cuenta. */
export function notifyRegistrationAuditEmail(): void {
  void fetch('/api/notifications/send-registration-audit-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch((err) => {
    console.warn('[notifyRegistrationAuditEmail]', err)
  })
}
