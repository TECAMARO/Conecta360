'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  canPublishProfile,
  getProfileOrDefault,
  profileInitials,
  type UserProfile,
} from '@/lib/profile'
import { PlatformLogoToggle } from '@/components/platform-logo-toggle'
import type { PlatformLogoVariant } from '@/lib/platform-preferences'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserRound,
  MessagesSquare,
  Clock,
  Settings,
  LogOut,
} from 'lucide-react'

function sidebarSubtitle(profile: UserProfile): string {
  if (canPublishProfile(profile) || profile.isPublished) {
    const detail = [profile.role, profile.organization].filter(Boolean).join(' · ')
    return detail || 'Perfil completo'
  }
  return 'Completa tu perfil'
}

export type View = 'inicio' | 'explorar' | 'agenda' | 'horarios' | 'perfil' | 'mensajes'

const nav: { id: View; label: string; icon: typeof Users }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'perfil', label: 'Mi Perfil Estratégico', icon: UserRound },
  { id: 'explorar', label: 'Explorar Participantes', icon: Users },
  { id: 'agenda', label: 'Mi Agenda', icon: CalendarDays },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'mensajes', label: 'Mensajes', icon: MessagesSquare },
]

export function AppSidebar({
  active,
  onNavigate,
  onLogout,
  agendaCount,
  unreadCount,
  userProfile,
  logoVariant = 'primary',
  onLogoToggle,
  drawer = false,
}: {
  active: View
  onNavigate: (view: View) => void
  onLogout: () => void
  agendaCount: number
  unreadCount: number
  userProfile?: UserProfile
  logoVariant?: PlatformLogoVariant
  onLogoToggle?: () => void
  /** Mobile overlay drawer — hides duplicate brand (header already shows logo). */
  drawer?: boolean
}) {
  const [profile, setProfile] = useState<UserProfile>(userProfile ?? getProfileOrDefault())

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile)
      return
    }
    setProfile(getProfileOrDefault())
  }, [userProfile])

  useEffect(() => {
    const refresh = () => setProfile(userProfile ?? getProfileOrDefault())
    window.addEventListener('conecta360-profile-updated', refresh)
    return () => window.removeEventListener('conecta360-profile-updated', refresh)
  }, [userProfile])

  const initials = profileInitials(profile.fullName)

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground',
        !drawer && 'md:h-dvh md:w-72',
      )}
    >
      {/* Brand — hidden in mobile drawer (platform header shows logo) */}
      <div
        className={cn(
          'flex h-[112px] shrink-0 items-center justify-center border-b border-sidebar-border px-3 py-2',
          drawer && 'hidden',
        )}
      >
        <PlatformLogoToggle
          variant={logoVariant}
          onToggle={() => onLogoToggle?.()}
          sidebar
          className="flex h-full w-full items-center justify-center"
        />
      </div>

      {/* Nav */}
      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Navegación principal"
      >
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          const badge =
            item.id === 'agenda' ? agendaCount : item.id === 'mensajes' ? unreadCount : 0
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white',
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span
                  className={cn(
                    'flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-sidebar-primary text-sidebar-primary-foreground',
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User card */}
      <div className="platform-safe-bottom shrink-0 border-t border-sidebar-border p-3">
        <div className="rounded-xl bg-sidebar-accent/60 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-primary text-sm font-semibold text-white">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt="" className="size-full max-w-full object-cover" />
              ) : (
                initials || '?'
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">
                {profile.fullName || profile.organization || 'Mi perfil'}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {sidebarSubtitle(profile)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onNavigate('perfil')}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sidebar-border/60 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-sidebar-border"
            >
              <Settings className="size-3.5" aria-hidden="true" />
              Ajustes
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-sidebar-border/60 px-2.5 py-2 text-white transition-colors hover:bg-sidebar-border"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
