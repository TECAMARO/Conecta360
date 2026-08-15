/** Dispara correo de confirmación sin bloquear la UI ni revertir la operación en BD. */
export function notifyMeetingConfirmationEmail(meetingId: string): void {
  void fetch('/api/notifications/send-confirmation-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingId }),
  }).catch((err) => {
    console.warn('[notifyMeetingConfirmationEmail]', err)
  })
}
