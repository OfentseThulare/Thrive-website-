"use client";

import { useActionState } from "react";

import { deleteSectionAction } from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import { ActionFeedback } from "./action-feedback";

export function DeleteSectionForm({ sectionId, pageSlug }: { sectionId: string; pageSlug: string }) {
  const [state, action, pending] = useActionState(deleteSectionAction, initialCmsActionState);

  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="pageSlug" value={pageSlug} />
      <button className="admin-danger-link" disabled={pending} type="submit">
        {pending ? "Removing…" : "Remove draft section"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}
