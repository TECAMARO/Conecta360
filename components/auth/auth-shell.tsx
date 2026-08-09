import { SiteHeader } from '@/components/site-header'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[#f8f9fa]">
      <div className="mx-auto w-full max-w-7xl">
        <SiteHeader />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-[#dde8d8]/80 bg-white shadow-lg ring-1 ring-black/5">
            <div className="border-b border-[#dde8d8]/60 bg-gradient-to-r from-[#f3f6f0] to-[#eef3ea] px-6 py-5">
              <h1 className="text-xl font-bold text-[#1a3c34]">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-[#5a6b62]">{subtitle}</p>
              )}
            </div>
            <div className="p-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
