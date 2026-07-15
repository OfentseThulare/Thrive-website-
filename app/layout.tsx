import type { Metadata, Viewport } from "next";
import { Alegreya_Sans, Cormorant_Garamond } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteUrl } from "@/lib/env";

import "./globals.css";

const sans = Alegreya_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Thrive Through Cancer | Coaching and Counselling",
    template: "%s | Thrive Through Cancer",
  },
  description:
    "Compassionate cancer health coaching and psycho-oncology counselling with Renny.",
  applicationName: "Thrive Through Cancer",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Thrive Through Cancer",
    images: [{ url: "/images/renny-portrait-seated.jpg", width: 2048, height: 2048 }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#075b5a",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
