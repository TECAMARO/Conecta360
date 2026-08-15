/** Dispara correos de cancelación admin sin bloquear la UI ni revertir la operación en BD. */
export function notifyMeetingCancellationEmail(meetingId: string): void {
  void fetch('/api/notifications/send-cancellation-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingId }),
  }).catch((err) => {
    console.warn('[notifyMeetingCancellationEmail]', err)
  })
}
