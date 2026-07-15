"use client";

import { useActionState } from "react";

import { requestMagicLinkAction, signInAction } from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function LoginForm({ configured }: { configured: boolean }) {
  const [passwordState, passwordAction] = useActionState(signInAction, initialCmsActionState);
  const [linkState, linkAction] = useActionState(requestMagicLinkAction, initialCmsActionState);

  return (
    <div className="admin-login-options">
      <form action={passwordAction} className="admin-form">
        <div className="admin-field">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" name="email" type="email" autoComplete="username" required disabled={!configured} />
        </div>
        <div className="admin-field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required disabled={!configured} />
        </div>
        <ActionFeedback state={passwordState} />
        <SubmitButton>Sign in securely</SubmitButton>
      </form>

      <div className="admin-divider"><span>or</span></div>

      <form action={linkAction} className="admin-form">
        <div className="admin-field">
          <label htmlFor="magic-email">Email address</label>
          <input id="magic-email" name="email" type="email" autoComplete="email" required disabled={!configured} />
          <small>We will only send a link if the address is authorised.</small>
        </div>
        <ActionFeedback state={linkState} />
        <SubmitButton tone="quiet">Email a secure sign-in link</SubmitButton>
      </form>
    </div>
  );
}
