import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("resources", "/resources");
}

export default function ResourcesPage() {
  return <PublicPage slug="resources" />;
}
