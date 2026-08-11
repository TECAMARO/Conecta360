import { Suspense } from 'react'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export const metadata = {
  title: 'Administración · Conecta360',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] text-sm text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  )
}
