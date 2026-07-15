import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("book", "/book");
}

export default function BookPage() {
  return <PublicPage slug="book" />;
}
