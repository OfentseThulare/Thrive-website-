import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";
export function generateMetadata(): Promise<Metadata> { return getPageMetadata("cancellation-refunds", "/cancellation-refunds"); }
export default function CancellationRefundsPage() { return <PublicPage slug="cancellation-refunds" />; }
