import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("pems-assessment", "/pems-assessment");
}

export default function PemsAssessmentPage() {
  return <PublicPage slug="pems-assessment" />;
}
