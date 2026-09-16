import { Suspense } from 'react'
import { AdminMessagesDashboard } from '@/components/admin/admin-messages-dashboard'

export const metadata = {
  title: 'Mensajes · Administración · Conecta360',
  robots: { index: false, follow: false },
}

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] text-sm text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <AdminMessagesDashboard />
    </Suspense>
  )
}
