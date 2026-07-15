import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const parsedId = z.string().uuid().safeParse((await params).assetId);
  if (!parsedId.success) return new NextResponse("Not found", { status: 404 });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return new NextResponse("Not found", { status: 404 });
  const { data: asset, error } = await supabase
    .from("assets")
    .select("storage_path,mime_type")
    .eq("id", parsedId.data)
    .eq("status", "published")
    .single();
  if (error || !asset || !asset.mime_type.startsWith("image/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { data, error: downloadError } = await supabase.storage.from("site-assets").download(asset.storage_path);
  if (downloadError || !data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(data, {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
