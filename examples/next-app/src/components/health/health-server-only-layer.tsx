import "server-only";
import type { ReactNode } from "react";

export function HealthServerOnlyLayer({ children }: { children: ReactNode }) {
  return (
    <section className="health-only-layer health-server-only-layer">
      <p className="eyebrow">SERVER-ONLY MODULE</p>
      <p>This server-only layer contains a client-only layer.</p>
      {children}
    </section>
  );
}
