"use client";

import Link from "next/link";

export default function BrandLogo({ className = "" }: { className?: string } = {}) {
  return (
    <Link href="/" className={`inline-flex items-center no-underline ${className}`} aria-label="Timeback - Ana sayfa">
      <span className="flex h-[26px] items-center w-[26px] md:w-auto">
        <img
          src="/brand/logo/logo-horizontal.svg"
          alt=""
          className="hidden md:block h-[26px] w-auto object-contain"
          width={100}
          height={26}
        />
        <img
          src="/brand/logo/logo-icon.svg"
          alt=""
          className="block md:hidden h-[26px] w-[26px] object-contain flex-shrink-0"
          width={26}
          height={26}
        />
      </span>
    </Link>
  );
}
