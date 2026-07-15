import Link from "next/link";

import { BrandMark } from "./brand-mark";

const primaryLinks = [
  { href: "/about", label: "About Renny" },
  { href: "/services", label: "Services" },
  { href: "/approach", label: "Our approach" },
  { href: "/resources", label: "Resources" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Thrive Through Cancer home">
          <BrandMark />
          <span>
            <strong>Thrive Through Cancer</strong>
            <small>by Inheritance Academy</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className="button button-small" href="/book">
            Book a session
          </Link>
        </nav>
      </div>
    </header>
  );
}
