"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCmsIdentity } from "@/lib/cms/auth";
import { CmsMfaRequiredError, requireCmsRole } from "@/lib/cms/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const refundSchema = z.object({
  paymentId: z.string().uuid(),
  toState: z.enum(["REFUND_PENDING", "REFUNDED"]),
});

export async function changeRefundStateAction(formData: FormData) {
  const input = refundSchema.parse(Object.fromEntries(formData.entries()));
  const supabase = await createServerSupabaseClient();
  const identity = await getCmsIdentity();
  if (!supabase || !identity) throw new Error("FINANCE_UNAVAILABLE");
  requireCmsRole(identity.roles, ["owner", "finance"]);
  if (identity.roles.includes("owner")) {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || data.currentLevel !== "aal2") throw new CmsMfaRequiredError();
  }
  const { data, error } = await supabase.rpc("mark_payment_refund_state", {
    p_payment_id: input.paymentId, p_to_state: input.toState,
  });
  if (error || data !== true) throw new Error("REFUND_STATE_CHANGE_FAILED");
  revalidatePath("/admin/finance/payments");
  revalidatePath(`/admin/finance/payments/${input.paymentId}`);
}
