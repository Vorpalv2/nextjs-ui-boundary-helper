"use client";

import { useEffect, type ReactNode } from "react";
import { useBoundaryContext, type SuspenseStatus } from "./boundary-context";

type SuspenseStatusReporterProps = {
  id: string;
  status: SuspenseStatus;
  children?: ReactNode;
};

/** Reports which side of a Suspense boundary React currently rendered. */
export function SuspenseStatusReporter({ id, status, children }: SuspenseStatusReporterProps) {
  const context = useBoundaryContext();

  useEffect(() => {
    context?.reportSuspenseStatus(id, status);
  }, [context?.reportSuspenseStatus, id, status]);

  return children ?? null;
}
