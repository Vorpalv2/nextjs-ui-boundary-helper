"use client";

import { createContext, useContext } from "react";
import type { BoundaryKind } from "./boundary-kind";

export type BoundaryContextValue = {
  debug: boolean;
  boundariesVisible: boolean;
  tintBackgrounds: boolean;
  visibleKinds: Record<BoundaryKind, boolean>;
  tintedKinds: Record<BoundaryKind, boolean>;
  setTintBackgrounds: (enabled: boolean) => void;
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
};

export type SuspenseStatus = "waiting" | "resolved";

export const BoundaryContext = createContext<BoundaryContextValue | null>(null);

export function useBoundaryContext() {
  return useContext(BoundaryContext);
}
