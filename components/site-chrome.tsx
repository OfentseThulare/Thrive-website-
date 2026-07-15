"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function SiteChrome({ children, primaryLinks }: { children: React.ReactNode; primaryLinks: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <main id="main-content" className="admin-root">{children}</main>;
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader primaryLinks={primaryLinks} />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </>
  );
}
