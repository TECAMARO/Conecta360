import { LandingHeader } from '@/components/landing/landing-header'
import { LandingFooter } from '@/components/landing/landing-footer'
import { PublicDirectoryView } from '@/components/public-directory-view'

export default function ParticipantesPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f8f9fa]">
      <LandingHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
        <PublicDirectoryView />
      </main>

      <LandingFooter />
    </div>
  )
}
