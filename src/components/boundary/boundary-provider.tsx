"use client";

import { useRef, useState, type ReactNode } from "react";
import { BoundaryContext } from "./boundary-context";
import { boundaryKinds, type BoundaryKind } from "./boundary-kind";
import { BoundaryToolbar } from "./boundary-toolbar";

type BoundaryProviderProps = {
  children: ReactNode;
  /** Show boundary annotations. Defaults to enabled in development. */
  debug?: boolean;
};

/** Add once in app/layout.tsx. The provider does not add a DOM element. */
export function BoundaryProvider({
  children,
  debug = process.env.NODE_ENV !== "production",
}: BoundaryProviderProps) {
  const [boundariesVisible, setBoundariesVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [suspenseStatuses, setSuspenseStatuses] = useState<Record<string, "waiting" | "resolved">>({});
  const [suspenseDurations, setSuspenseDurations] = useState<Record<string, number | null>>({});
  const [actionDurations, setActionDurations] = useState<Record<string, number | null>>({});
  const suspenseStartedAt = useRef<Record<string, number>>({});
  const suspenseStatusesRef = useRef<Record<string, "waiting" | "resolved">>({});
  const [tintBackgrounds, setTintBackgrounds] = useState(true);
  const [visibleKinds, setVisibleKinds] = useState<Record<BoundaryKind, boolean>>(() =>
    Object.fromEntries(boundaryKinds.map((kind) => [kind, true])) as Record<BoundaryKind, boolean>,
  );
  const [tintedKinds, setTintedKinds] = useState<Record<BoundaryKind, boolean>>(() =>
    Object.fromEntries(boundaryKinds.map((kind) => [kind, true])) as Record<BoundaryKind, boolean>,
  );
  const setKindVisibility = (kind: BoundaryKind, visible: boolean) => {
    setVisibleKinds((current) => ({ ...current, [kind]: visible }));
  };
  const setKindTint = (kind: BoundaryKind, enabled: boolean) => {
    setTintedKinds((current) => ({ ...current, [kind]: enabled }));
  };
  const reportSuspenseStatus = (id: string, status: "waiting" | "resolved") => {
    if (suspenseStatusesRef.current[id] === status) return;
    suspenseStatusesRef.current[id] = status;
    setSuspenseStatuses((current) => ({ ...current, [id]: status }));

    if (status === "waiting") {
      suspenseStartedAt.current[id] = performance.now();
      setSuspenseDurations((durations) => ({ ...durations, [id]: null }));
      return;
    }

    const startedAt = suspenseStartedAt.current[id];
    const duration = startedAt === undefined ? null : performance.now() - startedAt;
    setSuspenseDurations((durations) => ({ ...durations, [id]: duration }));
    delete suspenseStartedAt.current[id];
  };
  const reportActionDuration = (id: string, duration: number | null) => {
    setActionDurations((current) => current[id] === duration ? current : { ...current, [id]: duration });
  };

  return (
    <BoundaryContext.Provider value={{
      debug,
      boundariesVisible,
      tintBackgrounds,
      visibleKinds,
      tintedKinds,
      setTintBackgrounds,
      setBoundariesVisible,
      setKindVisibility,
      setKindTint,
      suspenseStatuses,
      suspenseDurations,
      reportSuspenseStatus,
      actionDurations,
      reportActionDuration,
      searchQuery,
      setSearchQuery,
    }}>
      {children}
      {debug ? <BoundaryToolbar /> : null}
    </BoundaryContext.Provider>
  );
}
