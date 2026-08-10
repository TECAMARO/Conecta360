'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppSidebar, type View } from '@/components/app-sidebar'
import { DashboardView } from '@/components/dashboard-view'
import { ExploreView } from '@/components/explore-view'
import { AgendaView } from '@/components/agenda-view'
import { ProfileView } from '@/components/profile-view'
import { MessagesView } from '@/components/messages-view'
import { MeetingRequestModal } from '@/components/meeting-request-modal'
import { ParticipantProfileModal } from '@/components/participant-profile-modal'
import { PlatformHeader } from '@/components/platform-header'
import { BrandLogoLink } from '@/components/logo'
import {
  timeSlots,
  participantById,
  type Appointment,
  type ChatMessage,
  type Conversation,
  type Participant,
} from '@/lib/data'
import {
  acceptMeetingRequest,
  agendaSidebarBadgeCount,
  buildSentRequestWithReason,
  type AgendaNotification,
} from '@/lib/meetings'
import { saveMeetingEvaluation, type MeetingEvaluationInput } from '@/lib/meeting-evaluation'
import { clearAuthSession, getAuthSession } from '@/lib/auth'
import { clearUserProfile, getProfileOrDefault, setUserProfile, type UserProfile } from '@/lib/profile'
import { restoreSupabaseSession, signOutSupabase } from '@/lib/supabase/auth-service'
import { fetchDirectoryParticipants } from '@/lib/directory'
import { setParticipantRegistry, mergeParticipantRegistry } from '@/lib/participant-registry'
import {
  cancelPendingInSlotExcept,
  fetchAllActiveMeetings,
  fetchOccupancyForBlock,
  fetchOutgoingConfirmedCount,
  fetchUserMeetings,
  insertMeetingRequest,
  rebouncePendingSentOverLimit,
  saveMeetingEvaluationToDb,
  updateMeeting,
} from '@/lib/supabase/meetings-repository'
import { isOutgoingSendBlocked } from '@/lib/meeting-outgoing-limit'
import { getEventSlotById } from '@/lib/meeting-slots'
import { fetchProfileDisplayName, fetchMyProfile } from '@/lib/supabase/profiles-repository'
import {
  conversationParticipantToRegistryEntry,
  fetchMessageThreads,
  fetchUnreadMessagesCount,
  hasConfirmedMeetingWith,
  hasConfirmedMeetingWithUser,
  markConversationAsRead,
  sendMessage as sendMessageToDb,
} from '@/lib/supabase/messages-repository'
import { supabase } from '@/src/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Menu, X, CircleCheck } from 'lucide-react'

const VIEW_PARAM: Record<string, View> = {
  inicio: 'inicio',
  explorar: 'explorar',
  agenda: 'agenda',
  perfil: 'perfil',
  mensajes: 'mensajes',
}

function mergeConversationMessages(
  previous: Conversation[],
  incoming: Conversation[],
): Conversation[] {
  if (incoming.length === 0 && previous.length > 0) return previous

  const previousById = new Map(previous.map((thread) => [thread.participantId, thread]))

  return incoming.map((thread) => {
    const local = previousById.get(thread.participantId)
    if (!local || thread.messages.length > 0) return thread

    const localOnly = local.messages.filter(
      (message) => !thread.messages.some((remote) => remote.id === message.id),
    )
    if (localOnly.length === 0) return thread

    const mergedMessages = [...thread.messages, ...localOnly]
    return {
      ...thread,
      messages: mergedMessages,
      lastMessageAt: local.lastMessageAt ?? thread.lastMessageAt,
    }
  })
}

function appendMessageToConversation(
  conversations: Conversation[],
  participantId: string,
  message: ChatMessage,
): Conversation[] {
  return conversations.map((thread) => {
    if (thread.participantId !== participantId) return thread
    if (thread.messages.some((existing) => existing.id === message.id)) return thread
    return {
      ...thread,
      messages: [...thread.messages, message],
      lastMessageAt: new Date().toISOString(),
    }
  })
}

function PlatformApp() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const initialView = (viewParam && VIEW_PARAM[viewParam]) || 'inicio'

  const [authReady, setAuthReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [view, setView] = useState<View>(initialView)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slotOccupancy, setSlotOccupancy] = useState<Appointment[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [directoryParticipants, setDirectoryParticipants] = useState<Participant[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userDisplayName, setUserDisplayName] = useState('')
  const [userProfile, setUserProfileState] = useState<UserProfile>(getProfileOrDefault())
  const [modalOpen, setModalOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [selected, setSelected] = useState<Participant | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifications, setNotifications] = useState<AgendaNotification[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesActiveId, setMessagesActiveId] = useState<string | null>(null)

  async function reloadMessaging(activeUserId: string, options?: { silent?: boolean }) {
    if (!options?.silent) setMessagesLoading(true)
    try {
      const [threads, unread] = await Promise.all([
        fetchMessageThreads(activeUserId),
        fetchUnreadMessagesCount(activeUserId),
      ])
      setConversations((prev) => mergeConversationMessages(prev, threads))
      mergeParticipantRegistry(
        threads
          .map((thread) => thread.participant)
          .filter(Boolean)
          .map((participant) => conversationParticipantToRegistryEntry(participant!)),
      )
      setUnreadCount(unread)
    } catch (err) {
      console.warn('[reloadMessaging]', err)
    } finally {
      if (!options?.silent) setMessagesLoading(false)
    }
  }

  async function reloadMeetings(activeUserId: string) {
    const [{ appointments: userAppts }, globalOccupancy] = await Promise.all([
      fetchUserMeetings(activeUserId),
      fetchAllActiveMeetings(),
    ])
    setAppointments(userAppts)
    setSlotOccupancy(globalOccupancy)
    await reloadMessaging(activeUserId)
  }

  useEffect(() => {
    async function bootstrap() {
      const session = await restoreSupabaseSession()
      if (!session?.userId) {
        const path = `${window.location.pathname}${window.location.search}`
        router.replace(`/login?redirect=${encodeURIComponent(path)}`)
        return
      }
      setUserId(session.userId)
      try {
        const published = await fetchDirectoryParticipants(session.userId)
        setDirectoryParticipants(published)
        setParticipantRegistry(published)
        const profile = (await fetchMyProfile(session.userId)) ?? getProfileOrDefault()
        setUserProfileState(profile)
        setUserProfile(profile)
        setUserDisplayName(profile.fullName || profile.organization || session.email)
        await reloadMeetings(session.userId)
      } catch {
        /* data may be empty on first load */
      }
      setAuthReady(true)
    }
    void bootstrap()
  }, [router])

  useEffect(() => {
    if (viewParam && VIEW_PARAM[viewParam]) {
      setView(VIEW_PARAM[viewParam])
    }
  }, [viewParam])

  useEffect(() => {
    const chatParam = searchParams.get('chat')
    if (chatParam) setMessagesActiveId(chatParam)
  }, [searchParams])

  useEffect(() => {
    if (!userId) return

    const refreshMessaging = () => {
      void reloadMessaging(userId, { silent: true })
    }

    const channel = supabase
      .channel(`platform-messaging-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings', filter: `requester_id=eq.${userId}` },
        refreshMessaging,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings', filter: `recipient_id=eq.${userId}` },
        refreshMessaging,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
        refreshMessaging,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        refreshMessaging,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        refreshMessaging,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] messaging channel error')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || view !== 'mensajes') return
    void reloadMessaging(userId)
  }, [userId, view])

  useEffect(() => {
    if (view !== 'mensajes' || !userId || conversations.length === 0) return
    const activeId = messagesActiveId ?? conversations[0]?.participantId
    if (!activeId) return
    const thread = conversations.find((c) => c.participantId === activeId)
    if (thread && thread.unread > 0) void markRead(activeId)
  }, [view, userId, messagesActiveId, conversations])

  useEffect(() => {
    if (!userId) return

    async function refreshDirectory() {
      const published = await fetchDirectoryParticipants(userId)
      setDirectoryParticipants(published)
      setParticipantRegistry(published)
      const profile = (await fetchMyProfile(userId)) ?? getProfileOrDefault()
      setUserProfileState(profile)
      setUserProfile(profile)
      setUserDisplayName(profile.fullName || profile.organization || '')
    }

    const handler = () => {
      void refreshDirectory()
    }
    window.addEventListener('conecta360-profile-updated', handler)
    return () => window.removeEventListener('conecta360-profile-updated', handler)
  }, [userId])

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión…</p>
      </div>
    )
  }

  const agendaCount = agendaSidebarBadgeCount(appointments)
  const outgoingSendBlocked = isOutgoingSendBlocked(appointments)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3500)
  }

  function openRequest(participant: Participant) {
    if (isOutgoingSendBlocked(appointments)) return
    setSelected(participant)
    setModalOpen(true)
    void refreshSlotOccupancy()
  }

  async function refreshSlotOccupancy(): Promise<Appointment[]> {
    try {
      const globalOccupancy = await fetchAllActiveMeetings()
      setSlotOccupancy(globalOccupancy)
      return globalOccupancy
    } catch {
      return slotOccupancy
    }
  }

  function openProfile(participant: Participant) {
    setSelected(participant)
    setProfileOpen(true)
  }

  async function confirmRequest({
    participant,
    slotId,
    message,
  }: {
    participant: Participant
    slotId: string
    message: string
  }) {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return

    const slot = getEventSlotById(slotId)
    if (!slot) {
      showToast('Horario no válido.')
      return
    }

    const blockOccupancy = await fetchOccupancyForBlock(slot.dayId, slot.time)

    const { appointment: draft, error } = buildSentRequestWithReason(
      { userAppointments: appointments, slotOccupancy: blockOccupancy },
      {
      participantId: participant.id,
      slotId,
      day: slot.dayId,
      time: slot.time,
      message: message.trim() || undefined,
    },
    )

    if (!draft) {
      showToast(error ?? 'No se pudo enviar la solicitud en este horario.')
      return
    }

    try {
      await insertMeetingRequest({
        recipientId: participant.id,
        day: slot.dayId,
        slotTime: slot.time,
        message: message.trim() || undefined,
      })
      await reloadMeetings(activeUserId)
      setModalOpen(false)
      setSelected(null)
      showToast('Solicitud de reunión enviada con éxito')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo guardar la solicitud.')
    }
  }

  async function handleAcceptRequest(id: string) {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return

    const target = appointments.find((appt) => appt.id === id)
    const requesterId =
      target?.requesterId ??
      (target?.direction === 'received' ? target.participantId : undefined)

    let requesterConfirmed = 0
    if (requesterId) {
      try {
        requesterConfirmed = await fetchOutgoingConfirmedCount(requesterId)
      } catch {
        requesterConfirmed = 0
      }
    }

    const result = acceptMeetingRequest(
      appointments,
      slotOccupancy,
      id,
      requesterConfirmed,
    )
    if (result.error) {
      showToast(result.error)
      return
    }

    const accepted = result.appointments.find((a) => a.id === id)
    if (!accepted) return

    const respondedAt = new Date().toISOString()

    try {
      await updateMeeting(id, { status: 'confirmada' })
      await cancelPendingInSlotExcept(accepted.slotId, id)
      if (requesterId) {
        await rebouncePendingSentOverLimit(requesterId)
      }
      await reloadMeetings(activeUserId)

      if (result.notifications.length > 0) {
        setNotifications((prev) => [...result.notifications, ...prev])
      }

      const name =
        participantById(accepted.participantId)?.name ??
        (await fetchProfileDisplayName(accepted.participantId)) ??
        'participante'

      setNotifications((prev) => [
        {
          id: `n-accept-${Date.now()}`,
          message: `✅ Confirmaste la reunión con ${name} para el ${accepted.day} a las ${accepted.time} (${accepted.table}).`,
          createdAt: respondedAt,
          read: false,
        },
        ...prev,
      ])
      showToast(`Reunión confirmada con ${name}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo confirmar la reunión.')
    }
  }

  async function handleRejectRequest(id: string) {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return

    const rejected = appointments.find((a) => a.id === id)
    const respondedAt = new Date().toISOString()

    try {
      await updateMeeting(id, { status: 'rechazada' })
      await reloadMeetings(activeUserId)

      if (rejected) {
        const name =
          participantById(rejected.participantId)?.name ??
          (await fetchProfileDisplayName(rejected.participantId)) ??
          'participante'
        setNotifications((prev) => [
          {
            id: `n-reject-${Date.now()}`,
            message: `Rechazaste la solicitud de reunión de ${name}.`,
            createdAt: respondedAt,
            read: false,
          },
          ...prev,
        ])
      }
      showToast('Solicitud rechazada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo rechazar la solicitud.')
    }
  }

  async function handleCancelSent(id: string) {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return

    const respondedAt = new Date().toISOString()
    try {
      await updateMeeting(id, { status: 'cancelada_enviada' })
      await reloadMeetings(activeUserId)
      showToast('Solicitud cancelada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo cancelar la solicitud.')
    }
  }

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  function markNotificationRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function handleSaveEvaluation(appointmentId: string, input: MeetingEvaluationInput) {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return

    const local = saveMeetingEvaluation(appointments, appointmentId, input)
    const updated = local.find((a) => a.id === appointmentId)
    if (!updated?.evaluation) return

    try {
      await saveMeetingEvaluationToDb(appointmentId, activeUserId, updated.evaluation)
      await reloadMeetings(activeUserId)
      showToast('Evaluación registrada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo guardar la evaluación.')
    }
  }

  async function sendMessage(participantId: string, text: string): Promise<boolean> {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return false

    const canChatLocally =
      hasConfirmedMeetingWith(appointments, participantId) ||
      conversations.some((c) => c.participantId === participantId)

    if (!canChatLocally) {
      const allowed = await hasConfirmedMeetingWithUser(activeUserId, participantId)
      if (!allowed) {
        showToast('Solo puedes chatear tras confirmar una reunión.')
        return false
      }
    }

    try {
      const thread = conversations.find((c) => c.participantId === participantId)
      const meetingId = thread?.meetingId ?? searchParams.get('meeting')
      const saved = await sendMessageToDb(activeUserId, participantId, text, { meetingId })
      setConversations((prev) => appendMessageToConversation(prev, participantId, saved))
      void reloadMessaging(activeUserId, { silent: true })
      return true
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.')
      return false
    }
  }

  async function markRead(participantId: string) {
    const activeUserId = userId ?? getAuthSession()?.userId
    if (!activeUserId) return

    const threadUnread =
      conversations.find((c) => c.participantId === participantId)?.unread ?? 0

    if (threadUnread > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.participantId === participantId ? { ...c, unread: 0 } : c)),
      )
      setUnreadCount((prev) => Math.max(0, prev - threadUnread))
    }

    try {
      await markConversationAsRead(activeUserId, participantId)
      await reloadMessaging(activeUserId, { silent: true })
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.participantId === participantId ? { ...c, unread: 0 } : c)),
      )
    }
  }

  function handleOpenConversation(participantId: string) {
    setMessagesActiveId(participantId)
    void markRead(participantId)
  }

  function openConversation(participantId: string, meetingId?: string) {
    void markRead(participantId)
    setMessagesActiveId(participantId)
    setView('mensajes')
    setMobileNavOpen(false)

    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'mensajes')
    params.set('chat', participantId)
    if (meetingId) params.set('meeting', meetingId)
    else params.delete('meeting')
    router.push(`/plataforma?${params.toString()}`)
  }

  function navigate(next: View) {
    setView(next)
    setMobileNavOpen(false)

    const params = new URLSearchParams(searchParams.toString())
    params.set('view', next)
    if (next !== 'mensajes') {
      params.delete('chat')
      params.delete('meeting')
    }
    router.push(`/plataforma?${params.toString()}`)
  }

  async function handleLogout() {
    await signOutSupabase()
    clearAuthSession()
    clearUserProfile()
    router.replace('/login')
  }

  return (
    <div className="platform-shell flex flex-col overflow-hidden md:flex-row">
      <header className="platform-no-print flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden print:hidden">
        <BrandLogoLink imageClassName="h-10 w-auto max-w-[min(100%,10rem)] object-contain sm:h-12" />
        <button
          type="button"
          onClick={() => setMobileNavOpen((o) => !o)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-white transition-colors hover:bg-sidebar-accent"
          aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <div className="platform-no-print hidden h-dvh shrink-0 overflow-hidden md:flex print:hidden">
        <AppSidebar
          active={view}
          onNavigate={navigate}
          onLogout={() => void handleLogout()}
          agendaCount={agendaCount}
          unreadCount={unreadCount}
          userProfile={userProfile}
        />
      </div>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="platform-no-print fixed inset-0 z-40 bg-black/50 md:hidden print:hidden"
            aria-label="Cerrar menú de navegación"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="platform-no-print fixed inset-y-0 left-0 z-50 w-[min(100%,18rem)] md:hidden print:hidden">
            <AppSidebar
              drawer
              active={view}
              onNavigate={navigate}
              onLogout={() => void handleLogout()}
              agendaCount={agendaCount}
              unreadCount={unreadCount}
              userProfile={userProfile}
            />
          </div>
        </>
      )}

      <main className="platform-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'platform-main-inner h-full min-h-0 flex-1',
            view === 'mensajes' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          )}
        >
          <div
            className={cn(
              'mx-auto flex w-full max-w-6xl flex-col',
              view === 'mensajes'
                ? 'min-h-0 flex-1 px-4 py-4 sm:px-8 sm:py-5'
                : 'px-4 py-6 sm:px-8 sm:py-10',
            )}
          >
          <div className={view === 'mensajes' ? 'shrink-0' : undefined}>
            <PlatformHeader
              notifications={notifications}
              appointments={appointments}
              onMarkNotificationRead={markNotificationRead}
              onMarkAllNotificationsRead={markAllNotificationsRead}
            />
          </div>
          {view === 'inicio' && (
            <DashboardView
              appointments={appointments}
              unreadCount={unreadCount}
              userName={userDisplayName}
              directoryParticipants={directoryParticipants}
              onExplore={() => navigate('explorar')}
              onAgenda={() => navigate('agenda')}
              onRequest={openRequest}
              onViewProfile={openProfile}
              requestDisabled={outgoingSendBlocked}
            />
          )}
          {view === 'explorar' && (
            <ExploreView
              onRequest={openRequest}
              onViewProfile={openProfile}
              requestDisabled={outgoingSendBlocked}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              appointments={appointments}
              conversations={conversations}
              notifications={notifications}
              onOpenConversation={openConversation}
              onAccept={(id) => void handleAcceptRequest(id)}
              onReject={(id) => void handleRejectRequest(id)}
              onCancelSent={(id) => void handleCancelSent(id)}
              onDismissNotification={dismissNotification}
              onNotify={showToast}
              onSaveEvaluation={(id, input) => void handleSaveEvaluation(id, input)}
            />
          )}
          {view === 'perfil' && <ProfileView />}
          {view === 'mensajes' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <MessagesView
                conversations={conversations}
                loading={messagesLoading}
                activeParticipantId={messagesActiveId}
                onSend={(id, text) => sendMessage(id, text)}
                onOpen={handleOpenConversation}
              />
            </div>
          )}
          </div>
        </div>
      </main>

      <MeetingRequestModal
        participant={selected}
        open={modalOpen}
        userAppointments={appointments}
        onOpenChange={setModalOpen}
        onConfirm={(args) => void confirmRequest(args)}
      />

      <ParticipantProfileModal
        participant={selected}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onRequest={openRequest}
        requestDisabled={outgoingSendBlocked}
      />

      <div
        aria-live="polite"
        className={cn(
          'platform-no-print pointer-events-none fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 transition-all print:hidden',
          toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        {toast && (
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg">
            <CircleCheck className="size-4" aria-hidden="true" />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlataformaPage() {
  return (
    <Suspense>
      <PlatformApp />
    </Suspense>
  )
}
