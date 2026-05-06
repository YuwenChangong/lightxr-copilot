"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="safe-top sticky top-0 z-50 glass-thick border-b border-[var(--separator)]">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-sm mx-auto">
        {/* Back button for sub-pages */}
        {!isHome ? (
          <Link
            href="/"
            className="flex items-center gap-0.5 text-[var(--system-blue)] text-body font-normal no-underline"
          >
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
              <path d="M10 2L2 10L10 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="ml-0.5">Back</span>
          </Link>
        ) : (
          <div className="w-14" />
        )}

        {/* Title */}
        <h1 className="text-headline text-[var(--label)] tracking-tight">
          LightXR
        </h1>

        {/* Right side spacer */}
        <div className="w-14" />
      </div>
    </header>
  );
}