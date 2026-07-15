import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteUrl } from "@/lib/env";

import "./globals.css";

const sans = localFont({
  src: [
    { path: "./fonts/AlegreyaSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/AlegreyaSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/AlegreyaSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const serif = localFont({
  src: "./fonts/CormorantGaramond-Variable.ttf",
  weight: "300 700",
  style: "normal",
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
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
