import { Suspense } from 'react'
import { ExecutiveDashboard } from '@/components/admin/executive-dashboard'

export const metadata = {
  title: 'Dashboard Ejecutivo · Conecta360 Admin',
  robots: { index: false, follow: false },
}

export default function AdminExecutiveDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] text-sm text-muted-foreground">
          Cargando dashboard…
        </div>
      }
    >
      <ExecutiveDashboard />
    </Suspense>
  )
}
