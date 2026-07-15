import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { getPageMetadata } from "@/lib/content/page-metadata";
export function generateMetadata(): Promise<Metadata> { return getPageMetadata("medical-disclaimer", "/medical-disclaimer"); }
export default function MedicalDisclaimerPage() { return <PublicPage slug="medical-disclaimer" />; }
