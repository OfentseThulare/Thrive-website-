import { pageContentSchema, type ContentBlock, type PageContent } from "../content/contracts.ts";

export function buildPublishedSnapshot(input: {
  slug: string;
  title: string;
  description: string;
  seo?: PageContent["seo"];
  sections: readonly ContentBlock[];
}): PageContent {
  return pageContentSchema.parse({
    slug: input.slug,
    title: input.title,
    description: input.description,
    seo: input.seo,
    status: "published",
    sections: structuredClone(input.sections),
  });
}

export function buildDraftPreview(input: {
  slug: string;
  title: string;
  description: string;
  seo?: PageContent["seo"];
  sections: readonly ContentBlock[];
}): PageContent {
  return pageContentSchema.parse({ ...input, sections: structuredClone(input.sections), status: "draft" });
}
