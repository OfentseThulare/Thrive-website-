import type { Metadata } from "next";

import { resolvePageMetadata } from "./metadata-policy";
import { getPublishedPage } from "./repository";

export function getPageMetadata(slug: string, routePath: string): Promise<Metadata> {
  return resolvePageMetadata({ slug, routePath, loadPage: getPublishedPage });
}
