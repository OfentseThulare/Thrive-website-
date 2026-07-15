"use client";

import type { CmsActionState } from "@/lib/cms/action-state";

export function ActionFeedback({ state }: { state: CmsActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={`admin-feedback admin-feedback-${state.status}`} role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  );
}
