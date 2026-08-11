import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { BrandLogoPairLink } from '@/components/logo'
import { SiteHeader } from '@/components/site-header'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingHeader({ brand }: { brand?: ReactNode }) {
  return (
    <div className="sticky top-0 z-50 border-b border-[#dde8d8]/50 bg-gradient-to-r from-emerald-50/95 via-[#e8f0e4]/90 to-white/80 shadow-sm backdrop-blur-sm">
      <SiteHeader
        brand={brand ?? <BrandLogoPairLink />}
        className={cn(
          'mx-auto max-w-7xl bg-transparent shadow-none backdrop-blur-none',
          'min-h-[4.5rem] sm:min-h-[5.5rem] lg:min-h-[8.75rem]',
        )}
        actions={
          <>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-9 gap-1.5 border border-[#1a3c34]/15 bg-white/90 px-3 text-[#1a3c34] shadow-sm hover:bg-[#e8f0e4] hover:shadow-md sm:h-10 sm:gap-2 sm:px-4 md:px-5',
              )}
            >
              <LogIn className="size-3.5 sm:size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
            </Link>
            <Link
              href="/registro"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-9 gap-1.5 bg-[#1a3c34] px-3 text-white shadow-sm hover:bg-[#234a40] hover:shadow-md sm:h-10 sm:gap-2 sm:px-4 md:px-5',
              )}
            >
              <UserPlus className="size-3.5 sm:size-4" aria-hidden="true" />
              <span className="hidden min-[400px]:inline sm:inline">Registrarse</span>
              <span className="min-[400px]:hidden sm:hidden">Registro</span>
            </Link>
          </>
        }
      />
    </div>
  )
}
