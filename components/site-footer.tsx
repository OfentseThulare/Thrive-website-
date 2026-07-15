import Link from "next/link";

import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>
            <strong>Thrive Through Cancer</strong>
            <span>Compassionate virtual support from South Africa.</span>
          </p>
        </div>
        <nav aria-label="Legal navigation">
          <Link href="/privacy">Privacy and POPIA</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/medical-disclaimer">Medical disclaimer</Link>
        </nav>
        <p className="footer-note">
          Coaching and counselling support does not replace diagnosis or treatment from your
          medical team.
        </p>
      </div>
    </footer>
  );
}
