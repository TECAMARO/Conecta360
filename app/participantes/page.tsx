import { redirect } from 'next/navigation'

/** Directorio público desactivado — redirige al inicio. */
export default function ParticipantesPage() {
  redirect('/')
}
