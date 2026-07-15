"use client";

import { useActionState } from "react";

import { cancelPendingMfaAction, enrolMfaAction, unenrolMfaAction, verifyMfaAction } from "@/app/admin/actions";
import { initialCmsActionState, type MfaEnrolActionState } from "@/lib/cms/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function MfaEnrolForm() {
  const [state, action] = useActionState(enrolMfaAction, initialCmsActionState as MfaEnrolActionState);
  return (
    <div className="admin-mfa-enrol">
      {state.status !== "enrolment" ? (
        <form action={action} className="admin-form">
          <div className="admin-field">
            <label htmlFor="factor-name">Authenticator name</label>
            <input id="factor-name" name="friendlyName" defaultValue="Thrive CMS" maxLength={60} required />
          </div>
          <ActionFeedback state={state} />
          <SubmitButton>Set up an authenticator</SubmitButton>
        </form>
      ) : (
        <div className="admin-mfa-setup" role="status">
          <p>{state.message}</p>
          <img src={state.qrCode} alt="QR code for adding Thrive CMS to an authenticator app" />
          <div className="admin-field">
            <label>Manual setup key</label>
            <code>{state.secret}</code>
          </div>
          <MfaVerifyForm factorId={state.factorId} label="Finish enrolment" />
        </div>
      )}
    </div>
  );
}

export function MfaVerifyForm({ factorId, label = "Verify this session" }: { factorId: string; label?: string }) {
  const [state, action] = useActionState(verifyMfaAction, initialCmsActionState);
  return (
    <form action={action} className="admin-form admin-mfa-verify">
      <input type="hidden" name="factorId" value={factorId} />
      <div className="admin-field">
        <label htmlFor={`mfa-code-${factorId}`}>Six-digit authenticator code</label>
        <input id={`mfa-code-${factorId}`} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}

export function MfaCancelPendingForm({ factorId }: { factorId: string }) {
  const [state, action] = useActionState(cancelPendingMfaAction, initialCmsActionState);
  return (
    <form action={action} className="admin-form admin-mfa-cancel">
      <input type="hidden" name="factorId" value={factorId} />
      <p>Cancel this incomplete setup if the QR code or manual key is no longer available.</p>
      <ActionFeedback state={state} />
      <SubmitButton tone="danger">Cancel pending setup</SubmitButton>
    </form>
  );
}

export function MfaUnenrolForm({ factorId }: { factorId: string }) {
  const [state, action] = useActionState(unenrolMfaAction, initialCmsActionState);
  return (
    <details className="admin-confirm-panel">
      <summary>Remove this authenticator</summary>
      <form action={action} className="admin-form">
        <input type="hidden" name="factorId" value={factorId} />
        <div className="admin-field">
          <label htmlFor={`remove-${factorId}`}>Type REMOVE to confirm</label>
          <input id={`remove-${factorId}`} name="confirmation" pattern="REMOVE" required />
        </div>
        <ActionFeedback state={state} />
        <SubmitButton tone="danger">Remove authenticator</SubmitButton>
      </form>
    </details>
  );
}
