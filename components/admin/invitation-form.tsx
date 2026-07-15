"use client";

import { useActionState } from "react";

import { createStaffInvitationAction } from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function InvitationForm() {
  const [state, action] = useActionState(createStaffInvitationAction, initialCmsActionState);
  return (
    <form action={action} className="admin-form admin-form-grid">
      <div className="admin-field">
        <label htmlFor="invite-email">Email address</label>
        <input id="invite-email" name="email" type="email" autoComplete="off" required />
      </div>
      <div className="admin-field">
        <label htmlFor="invite-role">Initial role</label>
        <select id="invite-role" name="role" defaultValue="editor">
          <option value="editor">Editor</option>
          <option value="publisher">Publisher</option>
          <option value="auditor">Auditor</option>
          <option value="scheduler">Scheduler</option>
          <option value="finance">Finance</option>
        </select>
        <small>Owner access cannot be granted by invitation.</small>
      </div>
      <div className="admin-field">
        <label htmlFor="invite-expiry">Expires after</label>
        <select id="invite-expiry" name="expiresInDays" defaultValue="7">
          <option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
        </select>
      </div>
      <div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Create invitation</SubmitButton></div>
    </form>
  );
}
