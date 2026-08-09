import { supabase } from '@/src/lib/supabaseClient'
import type { Database } from '@/lib/supabase/database.types'
import type { Appointment, ChatMessage, Conversation, ConversationParticipant, Participant } from '@/lib/data'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { profileInitials } from '@/lib/profile'
import { sectorToCategory } from '@/lib/profile'

type MessageRow = Database['public']['Tables']['messages']['Row'] & {
  /** Alternate column names tolerated when reading legacy rows. */
  recipient_id?: string | null
  body?: string | null
}

type MessageInsert = Database['public']['Tables']['messages']['Insert']

/** Strict write shape — only columns that exist in Supabase `messages`. */
type MessageWritePayload = {
  content: string
  sender_id: string
  receiver_id: string
  meeting_id?: string | null
}

type MeetingRow = {
  id: string
  requester_id: string
  recipient_id: string
  status: string
}

type MessageBucket = {
  messages: ChatMessage[]
  unread: number
  lastMessageAt: string | null
}

export type FetchMessageThreadsOptions = {
  /** @deprecated No longer filters message history — kept for API compatibility. */
  meetingId?: string | null
}

export type SendMessageOptions = {
  meetingId?: string | null
}

const CONFIRMED_DB_STATUSES = ['confirmada', 'confirmed', 'completada', 'completed'] as const
const CONFIRMED_APP_STATUSES = new Set<Appointment['status']>(['confirmada', 'completada'])
const DEFAULT_LOCATION = 'Región Orinoquía, Colombia'

const MESSAGE_SELECT = 'id, sender_id, receiver_id, content, created_at, read_at'

function messageReceiverId(row: Pick<MessageRow, 'receiver_id' | 'recipient_id'>): string {
  return row.receiver_id ?? row.recipient_id ?? ''
}

function messageText(row: Pick<MessageRow, 'content' | 'body'>): string {
  return String(row.content ?? row.body ?? '').trim()
}

function buildMessageInsertPayload(
  senderId: string,
  receiverId: string,
  text: string,
  meetingId?: string | null,
): MessageWritePayload {
  const payload: MessageWritePayload = {
    content: text,
    sender_id: senderId,
    receiver_id: receiverId,
  }

  if (meetingId) {
    payload.meeting_id = meetingId
  }

  return payload
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) return 'Ayer'

  return date.toLocaleDateString('es', { weekday: 'short' })
}

function rowToChatMessage(row: MessageRow, userId: string): ChatMessage {
  return {
    id: row.id,
    fromMe: row.sender_id === userId,
    text: messageText(row),
    time: formatMessageTime(row.created_at),
  }
}

export function defaultConversationParticipant(participantId: string): ConversationParticipant {
  return {
    id: participantId,
    name: 'Organización',
    fullName: '',
    role: '',
    avatarUrl: null,
    acronym: '??',
    location: DEFAULT_LOCATION,
    sector: '',
  }
}

function profileRowToConversationParticipant(row: ProfileRow): ConversationParticipant {
  const organization = String(row.organization_name ?? '').trim()
  const fullName = String(row.full_name ?? '').trim()
  const name = organization || fullName || 'Organización'

  return {
    id: row.id,
    name,
    fullName,
    role: String(row.job_title ?? '').trim(),
    avatarUrl: row.logo_url ?? null,
    acronym: profileInitials(name) || '??',
    location: String(row.region ?? '').trim() || DEFAULT_LOCATION,
    sector: String(row.sector ?? '').trim(),
  }
}

export function conversationParticipantToRegistryEntry(
  participant: ConversationParticipant,
): Participant {
  const safe = {
    ...defaultConversationParticipant(participant.id),
    ...participant,
    name: participant.name?.trim() || 'Organización',
    fullName: participant.fullName ?? '',
    role: participant.role ?? '',
    avatarUrl: participant.avatarUrl ?? null,
    acronym: participant.acronym?.trim() || '??',
    location: participant.location?.trim() || DEFAULT_LOCATION,
    sector: participant.sector ?? '',
  }

  return {
    id: safe.id,
    name: safe.name,
    fullName: safe.fullName,
    role: safe.role,
    avatarUrl: safe.avatarUrl,
    acronym: safe.acronym,
    location: safe.location,
    sector: safe.sector,
    category: sectorToCategory(safe.sector),
    needs: [],
    offer: [],
    seeking: [],
    description: '',
  }
}

async function fetchConfirmedCounterparts(
  userId: string,
  meetingId?: string | null,
): Promise<Map<string, string>> {
  let query = supabase
    .from('meetings')
    .select('id, requester_id, recipient_id, status')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .in('status', [...CONFIRMED_DB_STATUSES])

  if (meetingId) {
    query = query.eq('id', meetingId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const counterparts = new Map<string, string>()
  for (const row of (data ?? []) as MeetingRow[]) {
    const counterpartId =
      row.requester_id === userId ? row.recipient_id : row.requester_id
    if (!counterpartId) continue
    counterparts.set(counterpartId, row.id)
  }
  return counterparts
}

export async function resolveMeetingIdForChat(
  userId: string,
  counterpartId: string,
  preferredMeetingId?: string | null,
): Promise<string | null> {
  if (preferredMeetingId) return preferredMeetingId

  try {
    const counterparts = await fetchConfirmedCounterparts(userId)
    return counterparts.get(counterpartId) ?? null
  } catch {
    return null
  }
}

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ConversationParticipant>> {
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, organization_name, job_title, region, sector, logo_url')
    .in('id', ids)

  if (error) throw new Error(error.message)

  const map = new Map<string, ConversationParticipant>()
  for (const row of (data ?? []) as ProfileRow[]) {
    if (!row?.id) continue
    map.set(row.id, profileRowToConversationParticipant(row))
  }
  return map
}

function emptyMessageBucket(): MessageBucket {
  return { messages: [], unread: 0, lastMessageAt: null }
}

async function fetchMessagesGrouped(
  userId: string,
  counterpartIds: string[],
): Promise<Map<string, MessageBucket>> {
  const grouped = new Map<string, MessageBucket>()
  for (const id of counterpartIds) {
    grouped.set(id, emptyMessageBucket())
  }
  if (counterpartIds.length === 0) return grouped

  const filter = counterpartIds
    .flatMap((id) => [
      `and(sender_id.eq.${userId},receiver_id.eq.${id})`,
      `and(sender_id.eq.${id},receiver_id.eq.${userId})`,
    ])
    .join(',')

  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .or(filter)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[fetchMessagesGrouped]', error.message)
    throw new Error(error.message)
  }

  for (const row of (data ?? []) as MessageRow[]) {
    const receiverId = messageReceiverId(row)
    const counterpart = row.sender_id === userId ? receiverId : row.sender_id
    const bucket = grouped.get(counterpart)
    if (!bucket) continue
    bucket.messages.push(rowToChatMessage(row, userId))
    bucket.lastMessageAt = row.created_at ?? bucket.lastMessageAt
    if (receiverId === userId && !row.read_at) bucket.unread += 1
  }

  return grouped
}

function sortThreadsByLastMessage(threads: Conversation[]): Conversation[] {
  return [...threads].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    if (bTime !== aTime) return bTime - aTime
    return (a.participant?.name ?? '').localeCompare(b.participant?.name ?? '', 'es')
  })
}

/** Loads chat threads from confirmed meetings + profiles + messages. */
export async function fetchMessageThreads(
  userId: string,
  options?: FetchMessageThreadsOptions,
): Promise<Conversation[]> {
  try {
    const counterparts = await fetchConfirmedCounterparts(userId)
    const counterpartIds = [...counterparts.keys()]
    if (counterpartIds.length === 0) return []

    const [profiles, messagesByCounterpart] = await Promise.all([
      fetchProfilesByIds(counterpartIds).catch(() => new Map<string, ConversationParticipant>()),
      fetchMessagesGrouped(userId, counterpartIds).catch((err) => {
        console.warn('[fetchMessageThreads] messages load failed', err)
        const fallback = new Map<string, MessageBucket>()
        for (const id of counterpartIds) fallback.set(id, emptyMessageBucket())
        return fallback
      }),
    ])

    const threads = counterpartIds.map((participantId) => {
      const messageBucket = messagesByCounterpart.get(participantId) ?? emptyMessageBucket()
      const profile =
        profiles.get(participantId) ?? defaultConversationParticipant(participantId)

      return {
        participantId,
        meetingId: counterparts.get(participantId),
        participant: profile,
        unread: messageBucket.unread,
        messages: messageBucket.messages,
        lastMessageAt: messageBucket.lastMessageAt,
      }
    })

    return sortThreadsByLastMessage(threads)
  } catch (err) {
    console.warn('[fetchMessageThreads]', err)
    return []
  }
}

export function getConfirmedCounterpartIds(appointments: Appointment[]): string[] {
  return [
    ...new Set(
      appointments
        .filter((appt) => CONFIRMED_APP_STATUSES.has(appt.status))
        .map((appt) => appt.participantId),
    ),
  ]
}

export async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null)

    if (error) {
      console.warn('[fetchUnreadMessagesCount]', error.message)
      return 0
    }

    return count ?? 0
  } catch (err) {
    console.warn('[fetchUnreadMessagesCount]', err)
    return 0
  }
}

/** @deprecated Prefer fetchMessageThreads */
export async function fetchConversations(
  userId: string,
  confirmedParticipantIds: string[],
  options?: FetchMessageThreadsOptions,
): Promise<Conversation[]> {
  const threads = await fetchMessageThreads(userId, options)
  if (confirmedParticipantIds.length === 0) return threads

  const allowed = new Set(confirmedParticipantIds)
  return threads.filter((thread) => allowed.has(thread.participantId))
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string,
  options?: SendMessageOptions,
): Promise<ChatMessage> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('El mensaje está vacío.')

  const meetingId = await resolveMeetingIdForChat(senderId, receiverId, options?.meetingId)

  async function tryInsert(insertPayload: MessageWritePayload) {
    return supabase.from('messages').insert(insertPayload satisfies MessageInsert)
  }

  let payload = buildMessageInsertPayload(senderId, receiverId, trimmed, meetingId)
  let { error: insertError } = await tryInsert(payload)

  if (insertError && payload.meeting_id) {
    const { meeting_id: _omit, ...withoutMeeting } = payload
    payload = withoutMeeting
    const retry = await tryInsert(payload)
    insertError = retry.error
  }

  if (insertError) throw new Error(insertError.message)

  const { data, error: selectError } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('content', trimmed)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    console.warn('[sendMessage] insert ok, select failed:', selectError.message)
  }

  if (data) return rowToChatMessage(data as MessageRow, senderId)

  return {
    id: `pending-${Date.now()}`,
    fromMe: true,
    text: trimmed,
    time: 'Ahora',
  }
}

export async function markConversationAsRead(
  userId: string,
  counterpartId: string,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('messages')
    .update({ read_at: now })
    .eq('receiver_id', userId)
    .eq('sender_id', counterpartId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
}

export function hasConfirmedMeetingWith(
  appointments: Appointment[],
  participantId: string,
): boolean {
  return appointments.some(
    (appt) =>
      appt.participantId === participantId && CONFIRMED_APP_STATUSES.has(appt.status),
  )
}

export async function hasConfirmedMeetingWithUser(
  userId: string,
  participantId: string,
): Promise<boolean> {
  try {
    const counterparts = await fetchConfirmedCounterparts(userId)
    return counterparts.has(participantId)
  } catch {
    return false
  }
}
