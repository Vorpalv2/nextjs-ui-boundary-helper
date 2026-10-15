"use client";

import { createContext, useContext } from "react";
import type { BoundaryKind } from "./boundary-kind";

export type BoundaryContextValue = {
  debug: boolean;
  settingsLoaded: boolean;
  boundariesVisible: boolean;
  tintBackgrounds: boolean;
  popupMinimized: boolean;
  popupTransparent: boolean;
  visibleKinds: Record<BoundaryKind, boolean>;
  tintedKinds: Record<BoundaryKind, boolean>;
  setTintBackgrounds: (enabled: boolean) => void;
  setPopupMinimized: (minimized: boolean) => void;
  setPopupTransparent: (transparent: boolean) => void;
  setBoundariesVisible: (visible: boolean) => void;
  setKindVisibility: (kind: BoundaryKind, visible: boolean) => void;
  setKindTint: (kind: BoundaryKind, enabled: boolean) => void;
  suspenseStatuses: Record<string, SuspenseStatus>;
  suspenseDurations: Record<string, number | null>;
  reportSuspenseStatus: (id: string, status: SuspenseStatus) => void;
  actionDurations: Record<string, number | null>;
  reportActionDuration: (id: string, duration: number | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  boundaries: BoundaryEntry[];
  registerBoundary: (boundary: BoundaryEntry) => void;
  unregisterBoundary: (id: string) => void;
  focusedBoundaryId: string | null;
  setFocusedBoundaryId: (id: string | null) => void;
  renderHistories: Record<string, RenderHistory>;
  reportBoundaryRender: (id: string, renderTimeMs: number) => void;
};

export type BoundaryEntry = { id: string; name: string; kinds: BoundaryKind[] };
export type RenderHistory = { count: number; samples: number[] };

export type SuspenseStatus = "waiting" | "resolved";

export const BoundaryContext = createContext<BoundaryContextValue | null>(null);

export function useBoundaryContext() {
  return useContext(BoundaryContext);
}
