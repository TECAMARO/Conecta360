import type { CorporateBrochure } from '@/lib/corporate-brochure'
import { eventTimeSlots } from '@/lib/event-config'
import type { MeetingEvaluation } from '@/lib/meeting-evaluation'

export type CategoryId =
  | 'conservacion'
  | 'innovacion-social'
  | 'economia-circular'
  | 'financiamiento'

export type Category = {
  id: CategoryId
  label: string
}

export const categories: Category[] = [
  { id: 'conservacion', label: 'Conservación' },
  { id: 'innovacion-social', label: 'Innovación Social' },
  { id: 'economia-circular', label: 'Economía Circular' },
  { id: 'financiamiento', label: 'Búsqueda de Financiamiento' },
]

export const categoryLabel = (id: CategoryId) =>
  categories.find((c) => c.id === id)?.label ?? id

/** Activation needs — the "Conecta360 permite activar" axis from the deck. */
export type NeedId = 'aliados' | 'financiamiento' | 'visibilidad' | 'colaboracion'

export const needLabel: Record<NeedId, string> = {
  aliados: 'Busca aliados',
  financiamiento: 'Necesita financiamiento',
  visibilidad: 'Requiere visibilidad',
  colaboracion: 'Abierta a colaboración',
}

/** Unified filter list for the Explorar Participantes view. */
export type ExploreFilter =
  | { id: 'todas'; label: string; kind: 'all' }
  | { id: CategoryId; label: string; kind: 'category' }
  | { id: NeedId; label: string; kind: 'need' }

export const exploreFilters: ExploreFilter[] = [
  { id: 'todas', label: 'Todas', kind: 'all' },
  { id: 'conservacion', label: 'Conservación', kind: 'category' },
  { id: 'innovacion-social', label: 'Innovación Social', kind: 'category' },
  { id: 'economia-circular', label: 'Economía Circular', kind: 'category' },
  { id: 'aliados', label: 'Buscan aliados', kind: 'need' },
  { id: 'financiamiento', label: 'Necesitan financiamiento', kind: 'need' },
  { id: 'visibilidad', label: 'Requieren visibilidad', kind: 'need' },
]

export type Participant = {
  id: string
  /** Primary label: organization name, or full name as fallback. */
  name: string
  fullName: string
  role: string
  acronym: string
  avatarUrl?: string | null
  category: CategoryId
  needs: NeedId[]
  location: string
  offer: string[]
  seeking: string[]
  description: string
  sector: string
  isPublished?: boolean
  isCurrentUser?: boolean
  brochure?: CorporateBrochure | null
}

export { participantById, getParticipantRegistry, setParticipantRegistry } from '@/lib/participant-registry'

export type { MeetingEvaluation } from '@/lib/meeting-evaluation'

export type TimeSlot = {
  id: string
  dayId: string
  day: string
  dayLabel?: string
  time: string
  available: boolean
}

export const timeSlots: TimeSlot[] = eventTimeSlots.map((slot) => ({
  id: slot.id,
  dayId: slot.dayId,
  day: slot.day,
  dayLabel: slot.dayLabel,
  time: slot.time,
  available: slot.available,
}))

export const MEETING_MODALITY = 'presencial' as const

export type AppointmentStatus =
  | 'confirmada'
  | 'pendiente'
  | 'rechazada'
  | 'cancelada_enviada'
  | 'cancelada_conflicto'
  | 'anulada_por_cruce'
  | 'completada'

export type AppointmentDirection = 'sent' | 'received'

export type Appointment = {
  id: string
  participantId: string
  slotId: string
  day: string
  time: string
  table: string
  /** Mesa 01–10 from DB; used for allocation when `table` label differs. */
  tableNumber?: number
  requesterId?: string
  recipientId?: string
  modality: typeof MEETING_MODALITY
  status: AppointmentStatus
  direction: AppointmentDirection
  message?: string
  createdAt: string
  respondedAt?: string
  evaluation?: MeetingEvaluation
}

export type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type ConversationParticipant = {
  id: string
  name: string
  fullName: string
  role: string
  avatarUrl?: string | null
  acronym: string
  location: string
  sector: string
}

export type Conversation = {
  participantId: string
  meetingId?: string
  participant?: ConversationParticipant
  unread: number
  messages: ChatMessage[]
  /** ISO timestamp of the latest message, used for inbox ordering. */
  lastMessageAt?: string | null
}
