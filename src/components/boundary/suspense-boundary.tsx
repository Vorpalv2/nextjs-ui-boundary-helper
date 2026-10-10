import { Suspense, useId, type ReactNode } from "react";
import { DebugBoundary } from "./debug-boundary";
import { SuspenseStatusReporter } from "./suspense-status-reporter";

type SuspenseBoundaryProps = {
  children: ReactNode;
  name: string;
  fallback: ReactNode;
};

/** Server-compatible Suspense wrapper that labels both the loading state and resolved slot. */
export function SuspenseBoundary({ children, name, fallback }: SuspenseBoundaryProps) {
  const suspenseId = useId();

  return (
    <DebugBoundary kind="suspense" name={name} suspenseId={suspenseId}>
      <Suspense
        fallback={
          <SuspenseStatusReporter id={suspenseId} status="waiting">
            <DebugBoundary kind="suspense" name={`${name} · loading`}>{fallback}</DebugBoundary>
          </SuspenseStatusReporter>
        }
      >
        <SuspenseStatusReporter id={suspenseId} status="resolved" />
        <DebugBoundary kind="server" name={name}>{children}</DebugBoundary>
      </Suspense>
    </DebugBoundary>
  );
}
