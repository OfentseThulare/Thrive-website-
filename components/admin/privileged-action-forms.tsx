"use client";

import { useActionState } from "react";

import {
  manageRoleAction,
  publishNavigationAction,
  restoreVersionAction,
  revokeStaffInvitationAction,
  setContentPublicationAction,
} from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function RestoreVersionForm({ pageId, versionId }: { pageId: string; versionId: string }) {
  const [state, action] = useActionState(restoreVersionAction, initialCmsActionState);
  return <form action={action}><input type="hidden" name="pageId" value={pageId} /><input type="hidden" name="versionId" value={versionId} /><ActionFeedback state={state} /><SubmitButton tone="quiet">Restore this version</SubmitButton></form>;
}

export function NavigationPublicationForm({ itemId, published }: { itemId: string; published: boolean }) {
  const [state, action] = useActionState(publishNavigationAction, initialCmsActionState);
  return <form action={action}><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="makePublic" value={published ? "false" : "true"} /><ActionFeedback state={state} /><SubmitButton tone="quiet">{published ? "Return to draft" : "Publish"}</SubmitButton></form>;
}

export function ContentPublicationForm({ entity, entityId, published, publishLabel }: { entity: "asset" | "reusable_entry"; entityId: string; published: boolean; publishLabel: string }) {
  const [state, action] = useActionState(setContentPublicationAction, initialCmsActionState);
  return <form action={action}><input type="hidden" name="entity" value={entity} /><input type="hidden" name="entityId" value={entityId} /><input type="hidden" name="makePublic" value={published ? "false" : "true"} /><ActionFeedback state={state} /><SubmitButton tone="quiet">{published ? "Return to private draft" : publishLabel}</SubmitButton></form>;
}

export function ManageRoleForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(manageRoleAction, initialCmsActionState);
  return (
    <form action={action} className="admin-role-form">
      <input type="hidden" name="userId" value={userId} />
      <div className="admin-field"><label>Role</label><select name="role"><option value="editor">Editor</option><option value="publisher">Publisher</option><option value="auditor">Auditor</option><option value="scheduler">Scheduler</option><option value="finance">Finance</option><option value="owner">Owner</option></select></div>
      <div className="admin-field"><label>Change</label><select name="operation"><option value="grant">Grant</option><option value="revoke">Revoke</option></select></div>
      <ActionFeedback state={state} />
      <SubmitButton tone="quiet">Apply role change</SubmitButton>
    </form>
  );
}

export function RevokeInvitationForm({ invitationId }: { invitationId: string }) {
  const [state, action] = useActionState(revokeStaffInvitationAction, initialCmsActionState);
  return <form action={action}><input type="hidden" name="invitationId" value={invitationId} /><ActionFeedback state={state} /><SubmitButton tone="danger">Revoke</SubmitButton></form>;
}
