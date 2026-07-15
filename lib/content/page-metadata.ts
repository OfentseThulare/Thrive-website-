import type { Metadata } from "next";

import { getPublishedPage } from "./repository";

export async function getPageMetadata(slug: string, canonical: string): Promise<Metadata> {
  const page = await getPublishedPage(slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonical,
    },
  };
}
