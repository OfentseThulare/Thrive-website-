import Link from "next/link";

import { BrandMark } from "./brand-mark";

const exploreLinks = [
  { href: "/about", label: "About Renny" },
  { href: "/approach", label: "Our approach" },
  { href: "/pems-assessment", label: "PEMS introduction" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/book", label: "Prepare to book" },
];

const serviceLinks = [
  { href: "/services", label: "All services" },
  { href: "/services/cancer-health-coaching", label: "Cancer Health Coaching" },
  {
    href: "/services/psycho-oncology-counselling",
    label: "Psycho-Oncology Counselling",
  },
  {
    href: "/services/cancer-prevention-coaching",
    label: "Cancer Prevention Coaching",
  },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cancellation-refunds", label: "Cancellations and refunds" },
  { href: "/medical-disclaimer", label: "Medical disclaimer" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-about">
          <div className="footer-brand">
            <BrandMark />
            <p>
              <strong>Thrive Through Cancer</strong>
              <span>by Inheritance Academy</span>
            </p>
          </div>
          <p>
            Compassionate virtual cancer coaching and counselling support from South Africa.
          </p>
        </div>
        <nav aria-label="Explore">
          <p>Explore</p>
          {exploreLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Services">
          <p>Services</p>
          {serviceLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="footer-scope">
          <p className="eyebrow">Our scope</p>
          <p>
            Coaching and counselling support complements, and never replaces, diagnosis or
            treatment from your oncology and medical team.
          </p>
        </div>
        <nav aria-label="Legal">
          <p>Legal</p>
          {legalLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
      </div>
      <div className="shell footer-bottom">
        <p>© 2026 Thrive Through Cancer, a division of Inheritance Academy.</p>
        <p>Legal drafts last updated 15/07/2026. Client approval is required before live payment.</p>
      </div>
    </footer>
  );
}
