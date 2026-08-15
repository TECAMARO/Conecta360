'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, BarChart3, RefreshCw, Shield, SlidersHorizontal } from 'lucide-react'

export function AdminShell({
  title,
  subtitle,
  refreshing,
  onRefresh,
  children,
  actions,
}: {
  title: string
  subtitle: string
  refreshing?: boolean
  onRefresh?: () => void
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  const pathname = usePathname()

  const tabs = [
    { href: '/admin', label: 'Operaciones', icon: SlidersHorizontal },
    { href: '/admin/dashboard', label: 'Dashboard Ejecutivo', icon: BarChart3 },
  ]

  return (
    <div className="min-h-dvh bg-[#f4f7f5]">
      <header className="border-b border-[#dde8d8] bg-[#1a3c34] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#8ac441]/20">
              <Shield className="size-5 text-[#8ac441]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
              <p className="text-sm text-white/70">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden="true" />
                Actualizar
              </Button>
            )}
            {actions}
            <Link
              href="/plataforma"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/20 bg-transparent px-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Plataforma
            </Link>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-7xl gap-1 px-4 pb-3 sm:px-8"
          aria-label="Secciones de administración"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">{children}</main>
    </div>
  )
}
