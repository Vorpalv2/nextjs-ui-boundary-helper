"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useBoundaryContext } from "./boundary-context";

type ActionTimingReporterProps = {
  id: string;
};

/** Measures the browser-observed duration of a form Server Action submission. */
export function ActionTimingReporter({ id }: ActionTimingReporterProps) {
  const { pending } = useFormStatus();
  const context = useBoundaryContext();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (pending) {
      if (startedAt.current === null) {
        startedAt.current = performance.now();
        context?.reportActionDuration(id, null);
      }
      return;
    }

    if (startedAt.current !== null) {
      context?.reportActionDuration(id, performance.now() - startedAt.current);
      startedAt.current = null;
    }
  }, [context?.reportActionDuration, id, pending]);

  return null;
}
