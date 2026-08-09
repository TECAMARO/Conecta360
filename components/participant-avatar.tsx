'use client'

import { cn } from '@/lib/utils'
import type { Participant } from '@/lib/data'
import { getParticipantAvatarUrl, participantDisplayAcronym } from '@/lib/participant-display'

const sizeClasses = {
  sm: 'size-10 rounded-lg text-sm',
  md: 'size-12 rounded-xl text-base',
  lg: 'size-16 rounded-2xl text-lg',
} as const

export function ParticipantAvatar({
  participant,
  size = 'md',
  className,
  borderClassName,
}: {
  participant: Pick<Participant, 'acronym' | 'name' | 'avatarUrl'>
  size?: keyof typeof sizeClasses
  className?: string
  borderClassName?: string
}) {
  const avatarUrl = getParticipantAvatarUrl(participant)
  const initials = participantDisplayAcronym(participant)

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-secondary font-semibold text-primary',
        sizeClasses[size],
        borderClassName,
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}
