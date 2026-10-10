import { Suspense } from "react";
import { CachedHealthStatus } from "@/components/health/cached-health-status";
import { HealthClientPanel } from "@/components/health/health-client-panel";
import { HealthClientOnlyLayer } from "@/components/health/health-client-only-layer";
import { HealthClientShell } from "@/components/health/health-client-shell";
import { HealthServerPanel } from "@/components/health/health-server-panel";
import { HealthNestedServerOnlyLayer } from "@/components/health/health-nested-server-only-layer";
import { HealthServerOnlyLayer } from "@/components/health/health-server-only-layer";

export default function HealthPage() {
  return (
    <main className="demo health-page">
      <header>
        <p className="eyebrow">BOUNDARY COMPOSITION · /HEALTH</p>
        <h1>Health check</h1>
        <p className="intro">
          A Server Component page contains a Client Component. Its streamed Server Component contains another
          Client Component, which receives cached server output as a slot.
        </p>
        <a href="/">← Back to the playground</a>
      </header>

      <HealthClientShell>
        <Suspense fallback={<div className="health-skeleton">Checking server health…</div>}>
          <HealthServerPanel>
            <HealthClientPanel>
              <HealthServerOnlyLayer>
                <HealthClientOnlyLayer>
                  <HealthNestedServerOnlyLayer>
                    <CachedHealthStatus />
                  </HealthNestedServerOnlyLayer>
                </HealthClientOnlyLayer>
              </HealthServerOnlyLayer>
            </HealthClientPanel>
          </HealthServerPanel>
        </Suspense>
      </HealthClientShell>
    </main>
  );
}
