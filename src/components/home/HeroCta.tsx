'use client';

import Link from 'next/link';

export default function HeroCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="hero-cta inline-block font-semibold text-white px-6 py-3.5 rounded-lg text-sm transition-all duration-300 hover:opacity-95"
    >
      {children}
    </Link>
  );
}
