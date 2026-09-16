import { Suspense } from 'react'
import { AdminSupportDashboard } from '@/components/admin/admin-support-dashboard'

export const metadata = {
  title: 'Soporte · Administración · Conecta360',
  robots: { index: false, follow: false },
}

export default function AdminSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] text-sm text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <AdminSupportDashboard />
    </Suspense>
  )
}
