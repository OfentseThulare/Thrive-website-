"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "quiet" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button className={`admin-button admin-button-${tone}`} type="submit" disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}
