import type { Metadata } from "next";

import type { PageContent } from "./contracts.ts";

type PageLoader = (slug: string) => Promise<PageContent | null>;

const canonicalPathPattern = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;

export function isSafeCanonicalPath(value: string): boolean {
  return canonicalPathPattern.test(value);
}

function resolveCanonicalPath(candidate: string | null | undefined, routePath: string): string {
  if (!isSafeCanonicalPath(routePath)) {
    throw new Error("Page route must be a safe internal canonical path.");
  }

  const canonicalPath = candidate?.trim();
  return canonicalPath && isSafeCanonicalPath(canonicalPath) ? canonicalPath : routePath;
}

function resolveSeoText(candidate: string | null | undefined, fallback: string): string {
  return candidate?.trim() || fallback;
}

export function buildPageMetadata(page: PageContent, routePath: string): Metadata {
  const title = resolveSeoText(page.seo?.title, page.title);
  const description = resolveSeoText(page.seo?.description, page.description);
  const canonicalPath = resolveCanonicalPath(page.seo?.canonicalPath, routePath);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
    },
    robots: {
      index: page.seo?.noIndex !== true,
      follow: true,
    },
  };
}

export async function resolvePageMetadata({
  slug,
  routePath,
  loadPage,
}: {
  slug: string;
  routePath: string;
  loadPage: PageLoader;
}): Promise<Metadata> {
  const page = await loadPage(slug);
  return page ? buildPageMetadata(page, routePath) : {};
}
