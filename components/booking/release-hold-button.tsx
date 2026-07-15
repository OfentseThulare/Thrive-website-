"use client";

import { useState } from "react";

export function ReleaseHoldButton() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function release() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/booking/release", { method: "POST" });
    if (response.ok) { window.location.assign("/book"); return; }
    const body = await response.json() as { message?: string };
    setMessage(body.message || "The hold could not be released."); setBusy(false);
  }
  return <div><button className="button booking-release" disabled={busy} onClick={release} type="button">{busy ? "Releasing…" : "Release this time"}</button>{message ? <p className="booking-error" role="alert">{message}</p> : null}</div>;
}
