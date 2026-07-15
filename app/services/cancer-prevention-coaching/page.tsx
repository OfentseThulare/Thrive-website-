import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("cancer-prevention-coaching", "/services/cancer-prevention-coaching");
}

export default function CancerPreventionCoachingPage() {
  return <PublicPage slug="cancer-prevention-coaching" />;
}
