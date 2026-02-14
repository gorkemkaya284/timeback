import BrandLogo from '@/components/brand/BrandLogo';
import AuthBrandingSide from '@/components/auth/AuthBrandingSide';

/**
 * Auth layout: 2 kolon desktop (sol: branding, sağ: form), mobilde form önce.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
        <BrandLogo className="text-gray-900" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Sol: branding (desktop), mobilde altta */}
            <div className="order-2 lg:order-1 lg:pr-8">
              <AuthBrandingSide />
            </div>

            {/* Sağ: form (desktop), mobilde önce */}
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="w-full max-w-md">
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
