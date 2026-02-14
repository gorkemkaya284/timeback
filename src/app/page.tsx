import Link from 'next/link';
import { getCurrentUser } from '@/lib/dev';
import BrandLogo from '@/components/brand/BrandLogo';
import LandingHero from '@/components/landing/LandingHero';
import LandingPlatformMock from '@/components/landing/LandingPlatformMock';
import LandingSocialProof from '@/components/landing/LandingSocialProof';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingFinalCta from '@/components/landing/LandingFinalCta';

/**
 * Ana sayfa: marketing odaklı landing. Light theme, yeşil accent, yüksek dönüşüm.
 */
export default async function Home() {
  const user = await getCurrentUser();
  const ctaHref = user ? '/app/dashboard' : '/auth/signup';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo className="text-gray-900" />
          <Link
            href={ctaHref}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            {user ? 'Panele git' : 'Ücretsiz başla'}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <LandingHero ctaHref={ctaHref} />
            <div className="flex justify-center lg:justify-end">
              <LandingPlatformMock />
            </div>
          </div>
        </section>

        {/* Sosyal kanıt bandı */}
        <LandingSocialProof />

        {/* Nasıl çalışır */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <LandingHowItWorks />
        </section>

        {/* Kapanış CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-20">
          <LandingFinalCta ctaHref={ctaHref} />
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Timeback</span>
          <div className="flex gap-6">
            <Link href="#" className="font-medium text-gray-700 hover:text-gray-900">
              Şartlar
            </Link>
            <Link href="#" className="font-medium text-gray-700 hover:text-gray-900">
              Gizlilik
            </Link>
            <Link href="/app/support" className="font-medium text-gray-700 hover:text-gray-900">
              Destek
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
