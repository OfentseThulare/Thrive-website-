import { notFound } from "next/navigation";

import { ContentBlockView } from "@/components/content-block";
import { getPublishedPageView } from "@/lib/content/repository";

export async function PublicPage({ slug }: { slug: string }) {
  const pageView = await getPublishedPageView(slug);
  if (!pageView) notFound();

  return (
    <article className={`public-page page-${slug}`}>
      {pageView.page.sections.map((section, index) => (
        <ContentBlockView
          key={`${section.blockType}-${index}`}
          block={section}
          reusableEntries={pageView.reusableEntriesBySection[index]}
        />
      ))}
    </article>
  );
}
