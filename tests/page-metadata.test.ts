import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPageMetadata,
  isSafeCanonicalPath,
  resolvePageMetadata,
} from "../lib/content/metadata-policy.ts";
import { seedPages } from "../lib/content/seed.ts";

function aboutPage() {
  const page = seedPages.get("about");
  assert.ok(page);
  return structuredClone(page);
}

test("page metadata applies every published CMS SEO field", () => {
  const page = aboutPage();
  page.seo = {
    title: "A calmer cancer journey",
    description: "Compassionate guidance for people navigating cancer and survivorship.",
    canonicalPath: "/services/cancer-health-coaching",
    noIndex: true,
  };

  assert.deepEqual(buildPageMetadata(page, "/about"), {
    title: "A calmer cancer journey",
    description: "Compassionate guidance for people navigating cancer and survivorship.",
    alternates: { canonical: "/services/cancer-health-coaching" },
    openGraph: {
      title: "A calmer cancer journey",
      description: "Compassionate guidance for people navigating cancer and survivorship.",
      url: "/services/cancer-health-coaching",
    },
    robots: { index: false, follow: true },
  });
});

test("empty CMS SEO text and canonical values fall back to public page content and route", () => {
  const page = aboutPage();
  page.seo = {
    title: "  ",
    description: null,
    canonicalPath: "",
    noIndex: false,
  };

  assert.deepEqual(buildPageMetadata(page, "/about"), {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/about" },
    openGraph: {
      title: page.title,
      description: page.description,
      url: "/about",
    },
    robots: { index: true, follow: true },
  });
});

test("canonical metadata accepts route-shaped internal paths only", () => {
  const accepted = ["/", "/about", "/services/cancer-health-coaching"];
  const rejected = [
    "https://example.org/about",
    "//example.org/about",
    "about",
    "/about?campaign=one",
    "/about#profile",
    "/about/../admin",
    "/about/",
    "/About",
    "/about\\profile",
  ];

  for (const path of accepted) assert.equal(isSafeCanonicalPath(path), true, path);
  for (const path of rejected) assert.equal(isSafeCanonicalPath(path), false, path);
});

test("unsafe CMS canonical values fall back to the trusted public route", () => {
  const page = aboutPage();

  for (const canonicalPath of [
    "https://example.org/about",
    "//example.org/about",
    "/about?campaign=one",
    "/about/../admin",
  ]) {
    page.seo = { canonicalPath };
    const metadata = buildPageMetadata(page, "/about");

    assert.deepEqual(metadata.alternates, { canonical: "/about" }, canonicalPath);
    assert.equal(metadata.openGraph?.url, "/about", canonicalPath);
  }
});

test("metadata resolution uses the requested slug and returns no override for a missing page", async () => {
  const requestedSlugs: string[] = [];
  const metadata = await resolvePageMetadata({
    slug: "about",
    routePath: "/about",
    async loadPage(slug) {
      requestedSlugs.push(slug);
      return aboutPage();
    },
  });

  assert.deepEqual(requestedSlugs, ["about"]);
  assert.equal(metadata.title, "About Renny");
  assert.deepEqual(
    await resolvePageMetadata({
      slug: "missing",
      routePath: "/missing",
      async loadPage() {
        return null;
      },
    }),
    {},
  );
});

test("an unsafe route fallback fails closed", () => {
  assert.throws(
    () => buildPageMetadata(aboutPage(), "https://example.org/about"),
    /safe internal canonical path/,
  );
});
