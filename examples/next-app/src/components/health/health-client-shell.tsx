"use client";

import { useState, type ReactNode } from "react";

export function HealthClientShell({ children }: { children: ReactNode }) {
  const [checks, setChecks] = useState(1);

  return (
    <section className="health-shell">
      <div className="health-shell-heading">
        <div>
          <p className="eyebrow">CLIENT SHELL</p>
          <h2>Streaming health report</h2>
        </div>
        <button className="health-button" onClick={() => setChecks((count) => count + 1)}>
          Client checks: {checks}
        </button>
      </div>
      {children}
    </section>
  );
}
