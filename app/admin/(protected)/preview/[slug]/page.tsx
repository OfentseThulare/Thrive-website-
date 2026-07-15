import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentBlockView } from "@/components/content-block";
import { getDraftPreview } from "@/lib/cms/queries";

export const metadata = { title: "Private draft preview", robots: { index: false, follow: false } };

export default async function DraftPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getDraftPreview(slug);
  if (!page) notFound();
  return <div className="admin-preview"><div className="admin-preview-bar"><div><strong>Private draft preview</strong><span>Only authenticated CMS users can see this working copy.</span></div><Link href="/admin/pages">Back to pages</Link></div><article className={`public-page page-${slug}`}>{page.sections.map((section, index) => <ContentBlockView key={`${section.blockType}-${index}`} block={section} />)}</article></div>;
}
