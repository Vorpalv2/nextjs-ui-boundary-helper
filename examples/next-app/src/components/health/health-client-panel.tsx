"use client";

import { useActionState, type ReactNode } from "react";
import { runClientHealthAction } from "./health-actions";

export function HealthClientPanel({ children }: { children: ReactNode }) {
  const [actionState, formAction, isPending] = useActionState(runClientHealthAction, null);

  return (
    <div className="health-client-panel">
      <p className="eyebrow">NESTED CLIENT COMPONENT</p>
      <p>The cached server component below is passed in as a slot.</p>
      <form action={formAction} className="health-action-form">
        <button className="health-action-button" type="submit" disabled={isPending}>
          {isPending ? "Running…" : "Run imported Server Action"}
        </button>
      </form>
      {actionState ? <p className="health-action-status" role="status">{actionState.message}</p> : null}
      <div className="health-cache-slot">{children}</div>
    </div>
  );
}
