import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentBlockView } from "@/components/content-block";
import { getPublishedPage } from "@/lib/content/repository";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("home");
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const page = await getPublishedPage("home");
  if (!page) notFound();

  return page.sections.map((section, index) => (
    <ContentBlockView key={`${section.blockType}-${index}`} block={section} />
  ));
}
