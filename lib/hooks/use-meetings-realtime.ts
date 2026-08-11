'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/src/lib/supabaseClient'

type UseMeetingsRealtimeOptions = {
  /** When false, the subscription is torn down (e.g. before auth is ready). */
  enabled?: boolean
}

/**
 * Listens to INSERT/UPDATE/DELETE on `public.meetings` for rows where the
 * current user is requester or recipient. Requires `meetings` in
 * `supabase_realtime` publication (see meetings-atomic-transitions.sql).
 */
export function useMeetingsRealtime(
  userId: string | null,
  onMeetingsChange: () => void,
  options?: UseMeetingsRealtimeOptions,
) {
  const onChangeRef = useRef(onMeetingsChange)
  onChangeRef.current = onMeetingsChange

  const enabled = options?.enabled !== false

  useEffect(() => {
    if (!userId || !enabled) return

    const syncFromRealtime = () => {
      onChangeRef.current()
    }

    const channel = supabase
      .channel(`realtime_meetings_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `requester_id=eq.${userId}`,
        },
        syncFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `recipient_id=eq.${userId}`,
        },
        syncFromRealtime,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] meetings channel error')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, enabled])
}
