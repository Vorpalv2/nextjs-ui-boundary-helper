"use client";

import "client-only";
import { useState, type ReactNode } from "react";

export function HealthClientOnlyLayer({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="health-only-layer health-client-only-layer">
      <div className="health-only-layer-heading">
        <p className="eyebrow">CLIENT-ONLY MODULE</p>
        <button type="button" className="health-action-button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Hide nested server layer" : "Show nested server layer"}
        </button>
      </div>
      {expanded ? children : null}
    </section>
  );
}
