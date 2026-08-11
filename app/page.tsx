import { LandingHeader } from '@/components/landing/landing-header'
import { LandingHomeBrandLinks } from '@/components/landing/landing-home-brand'
import { HeroSection } from '@/components/landing/hero-section'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function HomePage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f8f9fa]">
      <LandingHeader brand={<LandingHomeBrandLinks />} />

      <main className="mx-auto max-w-7xl pb-0">
        <HeroSection />
      </main>

      <LandingFooter />
    </div>
  )
}
