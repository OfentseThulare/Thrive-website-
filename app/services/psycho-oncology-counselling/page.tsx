import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata(
    "psycho-oncology-counselling",
    "/services/psycho-oncology-counselling",
  );
}

export default function PsychoOncologyCounsellingPage() {
  return <PublicPage slug="psycho-oncology-counselling" />;
}
