"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BoundaryContext } from "./boundary-context";
import { boundaryKinds, type BoundaryKind } from "./boundary-kind";
import { BoundaryToolbar } from "./boundary-toolbar";

const BOUNDARY_SETTINGS_KEY = "ui-boundary-helper:boundary-settings";

type SavedBoundarySettings = {
  boundariesVisible: boolean;
  tintBackgrounds: boolean;
  popupMinimized: boolean;
  popupTransparent: boolean;
  visibleKinds: Partial<Record<BoundaryKind, boolean>>;
  tintedKinds: Partial<Record<BoundaryKind, boolean>>;
};

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
  const [popupMinimized, setPopupMinimized] = useState(false);
  const [popupTransparent, setPopupTransparent] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [visibleKinds, setVisibleKinds] = useState<Record<BoundaryKind, boolean>>(() =>
    Object.fromEntries(boundaryKinds.map((kind) => [kind, true])) as Record<BoundaryKind, boolean>,
  );
  const [tintedKinds, setTintedKinds] = useState<Record<BoundaryKind, boolean>>(() =>
    Object.fromEntries(boundaryKinds.map((kind) => [kind, true])) as Record<BoundaryKind, boolean>,
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BOUNDARY_SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved) as Partial<SavedBoundarySettings>;
        if (typeof settings.boundariesVisible === "boolean") setBoundariesVisible(settings.boundariesVisible);
        if (typeof settings.tintBackgrounds === "boolean") setTintBackgrounds(settings.tintBackgrounds);
        if (typeof settings.popupMinimized === "boolean") setPopupMinimized(settings.popupMinimized);
        if (typeof settings.popupTransparent === "boolean") setPopupTransparent(settings.popupTransparent);
        if (settings.visibleKinds) setVisibleKinds((current) => ({ ...current, ...pickKindSettings(settings.visibleKinds) }));
        if (settings.tintedKinds) setTintedKinds((current) => ({ ...current, ...pickKindSettings(settings.tintedKinds) }));
      }
    } catch {
      // Ignore unavailable storage or stale settings and use defaults.
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      window.localStorage.setItem(BOUNDARY_SETTINGS_KEY, JSON.stringify({
        boundariesVisible,
        tintBackgrounds,
        popupMinimized,
        popupTransparent,
        visibleKinds,
        tintedKinds,
      } satisfies SavedBoundarySettings));
    } catch {
      // Settings still work for this session when storage is unavailable.
    }
  }, [settingsLoaded, boundariesVisible, tintBackgrounds, popupMinimized, popupTransparent, visibleKinds, tintedKinds]);
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
      settingsLoaded,
      boundariesVisible,
      tintBackgrounds,
      popupMinimized,
      popupTransparent,
      visibleKinds,
      tintedKinds,
      setTintBackgrounds,
      setPopupMinimized,
      setPopupTransparent,
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

function pickKindSettings(settings: Partial<Record<BoundaryKind, boolean>> | undefined) {
  return Object.fromEntries(boundaryKinds.flatMap((kind) =>
    typeof settings?.[kind] === "boolean" ? [[kind, settings[kind]]] : [],
  )) as Partial<Record<BoundaryKind, boolean>>;
}
