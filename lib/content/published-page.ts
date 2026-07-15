import { pageContentSchema, type PageContent } from "./contracts.ts";

export type PublishedPageRow = {
  slug: string;
  published_version_id: string;
};

export type PublishedVersionRow = {
  snapshot: unknown;
};

type QueryError = {
  code: string;
};

type QueryResult<T> = {
  data: T | null;
  error: QueryError | null;
};

export type PublishedPageSource = {
  getPublishedPage(slug: string): Promise<QueryResult<PublishedPageRow>>;
  getPublishedVersion(id: string): Promise<QueryResult<PublishedVersionRow>>;
};

export async function resolvePublishedPage({
  slug,
  source,
  seedPages,
}: {
  slug: string;
  source: PublishedPageSource | null;
  seedPages: ReadonlyMap<string, PageContent>;
}): Promise<PageContent | null> {
  if (!source) return seedPages.get(slug) ?? null;

  const { data: page, error: pageError } = await source.getPublishedPage(slug);

  if (pageError) {
    if (pageError.code === "PGRST116") return null;
    throw new Error(`Published page query failed: ${pageError.code}`);
  }

  if (!page) return null;

  const { data: version, error: versionError } = await source.getPublishedVersion(
    page.published_version_id,
  );

  if (versionError) {
    throw new Error(`Published page version query failed: ${versionError.code}`);
  }

  if (!version) {
    throw new Error("Published page version query returned no content.");
  }

  const publishedPage = pageContentSchema.parse(version.snapshot);

  if (publishedPage.slug !== page.slug || publishedPage.status !== "published") {
    throw new Error("Published page snapshot does not match its route or publication state.");
  }

  return publishedPage;
}
