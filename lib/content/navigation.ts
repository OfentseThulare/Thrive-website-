import "server-only";

import { cache } from "react";

import { safeHrefSchema } from "./contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublicNavigationItem = { href: string; label: string };

const fallbackNavigation: PublicNavigationItem[] = [
  { href: "/about", label: "About Renny" },
  { href: "/services", label: "Services" },
  { href: "/approach", label: "Our approach" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
];

export const getPublishedNavigation = cache(async (): Promise<PublicNavigationItem[]> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return fallbackNavigation;
  const { data, error } = await supabase
    .from("navigation_items")
    .select("href,label")
    .eq("location", "primary")
    .eq("status", "published")
    .eq("visible", true)
    .order("position");
  if (error) throw new Error("Published navigation could not be loaded.");
  if (!data?.length) return fallbackNavigation;
  return data.map((item) => ({ href: safeHrefSchema.parse(item.href), label: String(item.label) }));
});
