import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("services", "/services");
}

export default function ServicesPage() {
  return <PublicPage slug="services" />;
}
