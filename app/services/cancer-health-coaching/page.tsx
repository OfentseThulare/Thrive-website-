import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("cancer-health-coaching", "/services/cancer-health-coaching");
}

export default function CancerHealthCoachingPage() {
  return <PublicPage slug="cancer-health-coaching" />;
}
