"use client";

import { useActionState } from "react";

import { initialiseCmsContentAction } from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function SeedImportForm() {
  const [state, action] = useActionState(initialiseCmsContentAction, initialCmsActionState);

  return (
    <form action={action} className="admin-seed-import-form">
      <ActionFeedback state={state} />
      <SubmitButton>Import approved seed content</SubmitButton>
    </form>
  );
}
