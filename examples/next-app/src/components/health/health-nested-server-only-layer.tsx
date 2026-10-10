import "server-only";
import type { ReactNode } from "react";

export function HealthNestedServerOnlyLayer({ children }: { children: ReactNode }) {
  return (
    <section className="health-only-layer health-server-only-layer health-nested-server-only-layer">
      <p className="eyebrow">NESTED SERVER-ONLY MODULE</p>
      {children}
    </section>
  );
}
