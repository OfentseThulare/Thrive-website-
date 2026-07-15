import { notFound } from "next/navigation";

import { ContentBlockView } from "@/components/content-block";
import { getPublishedPage } from "@/lib/content/repository";

export async function PublicPage({ slug }: { slug: string }) {
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  return (
    <article className={`public-page page-${slug}`}>
      {page.sections.map((section, index) => (
        <ContentBlockView key={`${section.blockType}-${index}`} block={section} />
      ))}
    </article>
  );
}
