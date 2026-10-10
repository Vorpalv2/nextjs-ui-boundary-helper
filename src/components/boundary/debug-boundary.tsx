"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { boundaryKindColor, boundaryKindLabels, boundaryKindTint, type BoundaryKind } from "./boundary-kind";
import { useBoundaryContext } from "./boundary-context";

type DebugBoundaryProps = {
  children: ReactNode;
  kind?: BoundaryKind;
  /** Add multiple labels for regions that represent more than one boundary type. */
  kinds?: BoundaryKind[];
  name: string;
  /** Optional third field shown in the annotation. */
  detail?: string;
  metadata?: ComponentMetadata;
  suspenseId?: string;
  className?: string;
};

type ComponentMetadata = {
  totalLines: number;
  usesState: boolean;
  usesEffect: boolean;
  isAsync: boolean;
  hasTopLevelAwait: boolean;
  parameters: string[];
  returnType: string;
};

type Bounds = { top: number; left: number; width: number; height: number };
type ComponentMetrics = { width: number; height: number; font: string };
const OUTLINE_GAP = 24;
const LABEL_HEIGHT = 32;
const LABEL_GAP = 8;
const BOUNDARY_KIND_INSET = LABEL_HEIGHT + LABEL_GAP;
const NESTED_BOUNDARY_INSET = 6;

/** Explicitly labels a region. Its visual annotation is portaled over the page. */
export function DebugBoundary({ children, kind, kinds, name, detail, metadata, suspenseId, className }: DebugBoundaryProps) {
  const context = useBoundaryContext();
  const debug = context?.debug ?? process.env.NODE_ENV !== "production";
  const boundariesVisible = context?.boundariesVisible ?? true;
  const normalizedSearch = context?.searchQuery.trim().toLocaleLowerCase() ?? "";
  const matchesSearch = !normalizedSearch || name.toLocaleLowerCase().includes(normalizedSearch);
  const boundaryKinds = kinds ?? (kind ? [kind] : []);
  const visibleBoundaryKinds = boundaryKinds.filter((boundaryKind) => context?.visibleKinds[boundaryKind] ?? true);
  const tintedBoundaryKinds = visibleBoundaryKinds.filter((boundaryKind) => context?.tintedKinds[boundaryKind] ?? true);
  // Before either client marker reports, treat the boundary as waiting for its first state signal.
  const suspenseStatus = suspenseId ? context?.suspenseStatuses[suspenseId] ?? "waiting" : undefined;
  const contentRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [metrics, setMetrics] = useState<ComponentMetrics | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<BoundaryKind | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const [popupTransparent, setPopupTransparent] = useState(false);
  const [popupPinned, setPopupPinned] = useState(false);
  const popupPinnedRef = useRef(false);
  const popupCloseTimeout = useRef<number | null>(null);

  const cancelPopupClose = () => {
    if (popupCloseTimeout.current !== null) {
      window.clearTimeout(popupCloseTimeout.current);
      popupCloseTimeout.current = null;
    }
  };

  const schedulePopupClose = () => {
    if (popupPinnedRef.current) return;
    cancelPopupClose();
    popupCloseTimeout.current = window.setTimeout(() => {
      popupCloseTimeout.current = null;
      if (popupPinnedRef.current) return;
      setHoveredLabel(null);
      setPopupAnchor(null);
    }, 160);
  };

  useEffect(() => setMounted(true), []);

  useEffect(() => () => cancelPopupClose(), []);

  useEffect(() => {
    if (!debug) {
      setBounds(null);
      return;
    }

    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      const measuredBounds = measureBoundaryBounds(content);
      if (!measuredBounds) {
        setBounds(null);
        setMetrics(null);
        return;
      }
      setBounds(constrainToAncestors(content, measuredBounds));
      const contentRect = getRenderedContentRect(content);
      setMetrics({
        width: Math.round(contentRect.width),
        height: Math.round(contentRect.height),
        font: getRenderedFont(content),
      });
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(content);
      content.querySelectorAll("*").forEach((element) => resizeObserver.observe(element));
      measure();
    };
    observeChildren();

    const mutationObserver = new MutationObserver(observeChildren);
    mutationObserver.observe(content, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [debug, children, boundaryKinds.length]);

  const overlay = debug && boundariesVisible && matchesSearch && mounted && bounds && visibleBoundaryKinds.length ? createPortal(
    <div aria-hidden="true" style={overlayStackStyle}>
      {context?.tintBackgrounds !== false
        ? tintedBoundaryKinds.map((boundaryKind) => (
            <div key={`tint-${boundaryKind}`} style={componentTintStyle(bounds, boundaryKindTint(boundaryKind))} />
          ))
        : null}
      <div style={overlayStyle(bounds, boundaryKindColor(visibleBoundaryKinds[0]))} />
      <div style={annotationRowStyle(bounds)}>
        {visibleBoundaryKinds.map((boundaryKind) => (
          <div
            key={`label-${boundaryKind}`}
            style={labelStyle(boundaryKindColor(boundaryKind))}
            onMouseEnter={(event) => {
              cancelPopupClose();
              if (popupPinnedRef.current) return;
              const rect = event.currentTarget.getBoundingClientRect();
              setHoveredLabel(boundaryKind);
              setPopupAnchor({ left: rect.left, bottom: rect.bottom });
            }}
            onMouseLeave={schedulePopupClose}
          >
            <span>{boundaryKindLabels[boundaryKind]}</span>
            {boundaryKind === "suspense" && suspenseStatus ? (
              <span style={suspenseStatusBadgeStyle}>
                {suspenseStatus === "waiting" ? "Waiting" : "Resolved"}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  ) : null;

  const popupKind = hoveredLabel && visibleBoundaryKinds.includes(hoveredLabel) ? hoveredLabel : undefined;
  const popup = debug && boundariesVisible && matchesSearch && mounted && popupAnchor && popupKind ? createPortal(
    <div
      style={popupStyle(popupAnchor, boundaryKindColor(popupKind), popupTransparent)}
      role="tooltip"
      onMouseEnter={cancelPopupClose}
      onMouseLeave={schedulePopupClose}
    >
      <div style={popupHeaderStyle}>
        <div style={popupTitleStyle}>
          <span style={popupIdentityLabelStyle}>{popupKind === "server-action" ? "Function" : "Name"}:</span>{" "}
          {popupKind === "server-action" ? formatFunctionName(name) : name}
        </div>
        <div style={popupControlsStyle}>
          <button
            type="button"
            style={{ ...transparencyButtonStyle, ...(popupPinned ? activePopupControlStyle : {}) }}
            aria-label={popupPinned ? "Unpin popup" : "Pin popup"}
            aria-pressed={popupPinned}
            title={popupPinned ? "Unpin popup" : "Pin popup"}
            onClick={() => {
              const nextPinned = !popupPinnedRef.current;
              popupPinnedRef.current = nextPinned;
              setPopupPinned(nextPinned);
              if (nextPinned) cancelPopupClose();
            }}
          >
            <PinIcon pinned={popupPinned} />
          </button>
        <button
          type="button"
          style={transparencyButtonStyle}
          aria-label={popupTransparent ? "Restore popup opacity" : "Make popup half transparent"}
          aria-pressed={popupTransparent}
          title={popupTransparent ? "Restore opacity" : "Make popup half transparent"}
          onClick={() => setPopupTransparent((transparent) => !transparent)}
        >
          <EyeIcon crossedOut={popupTransparent} />
        </button>
        </div>
      </div>
      {detail ? <div style={popupDetailStyle}>{detail}</div> : null}
      <div style={popupRowsStyle}>
        {popupKind === "suspense" ? (
          <PopupRow label="Suspense status" value={suspenseStatus === "waiting" ? "Waiting for content" : "Resolved"} />
        ) : null}
        {metadataRowsForKind(popupKind, metadata, boundaryKinds.some(isCacheKind)).map(({ label, value }) => (
          <PopupRow key={label} label={label} value={value} />
        ))}
        <PopupRow label="Width" value={metrics ? `${metrics.width}px` : "Measuring…"} />
        <PopupRow label="Height" value={metrics ? `${metrics.height}px` : "Measuring…"} />
        <PopupRow label="Font" value={metrics?.font ?? "Measuring…"} />
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div
        ref={contentRef}
        className={className}
        data-boundary-kind={kind ?? boundaryKinds[0]}
        data-boundary-kinds={boundaryKinds.join(" ")}
        style={{ display: "contents" }}
      >
        {children}
      </div>
      {overlay}
      {popup}
    </>
  );
}

const overlayStackStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483000,
  pointerEvents: "none",
};

function componentTintStyle(bounds: Bounds, color: string): CSSProperties {
  return {
    position: "fixed",
    top: bounds.top,
    left: bounds.left,
    width: bounds.width,
    height: bounds.height,
    boxSizing: "border-box",
    borderRadius: 6,
    background: color,
    pointerEvents: "none",
  };
}

function overlayStyle(bounds: Bounds, color: string): CSSProperties {
  return {
    position: "fixed",
    top: bounds.top,
    left: bounds.left,
    width: bounds.width,
    height: bounds.height,
    boxSizing: "border-box",
    border: `2px dotted ${color}`,
    borderRadius: 6,
    pointerEvents: "none",
  };
}

function annotationRowStyle(bounds: Bounds): CSSProperties {
  const labelLeft = Math.max(8, bounds.left + 8);
  const labelTop = Math.max(8, bounds.top - LABEL_HEIGHT);
  const availableWidth = window.innerWidth - labelLeft - 8;
  return {
    position: "absolute",
    zIndex: 1,
    top: labelTop,
    left: labelLeft,
    display: "flex",
    alignItems: "center",
    gap: LABEL_GAP,
    flexWrap: "wrap",
    maxWidth: Math.max(0, availableWidth),
    pointerEvents: "auto",
  };
}

function labelStyle(color: string): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 6,
    background: color,
    color: "#fff",
    font: "15px/22px ui-monospace, SFMono-Regular, Menlo, monospace",
    cursor: "default",
    flexWrap: "nowrap",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px #0002",
    gap: 7,
  };
}

const suspenseStatusBadgeStyle: CSSProperties = {
  padding: "2px 7px",
  border: "1px solid #ffffff70",
  borderRadius: 999,
  background: "#ffffff26",
  color: "#fff",
  font: "700 12px/18px ui-sans-serif, system-ui, sans-serif",
  letterSpacing: "0.01em",
};

function PopupRow({ label, value }: { label: string; value: string }) {
  const [showUnavailableHint, setShowUnavailableHint] = useState(false);

  return (
    <div style={popupRowStyle}>
      <span>{label}</span>
      <strong style={popupValueStyle}>
        <span>{value}</span>
        {value === "Unavailable" ? (
          <span
            style={unavailableHelpGroupStyle}
            onMouseEnter={() => setShowUnavailableHint(true)}
            onMouseLeave={() => setShowUnavailableHint(false)}
          >
            <span
              style={unavailableHelpStyle}
              role="img"
              aria-label="Clear the Next.js build cache and restart the dev server to update this value"
              tabIndex={0}
              onFocus={() => setShowUnavailableHint(true)}
              onBlur={() => setShowUnavailableHint(false)}
            >
              ?
            </span>
            {showUnavailableHint ? <span role="tooltip" style={unavailableHintTextStyle}>Clear .next and restart dev server</span> : null}
          </span>
        ) : null}
      </strong>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function metadataRowsForKind(kind: BoundaryKind, metadata: ComponentMetadata | undefined, usesCacheDirective: boolean) {
  if (!metadata) return [];

  const sourceRows = [
    { label: "Total lines", value: String(metadata.totalLines) },
    // The nullish fallbacks keep already-transformed dev modules working during HMR.
    { label: "Parameters", value: metadata.parameters ? (metadata.parameters.length ? metadata.parameters.join(", ") : "None") : "Unavailable" },
    { label: "Return type", value: metadata.returnType ?? "Unavailable" },
  ];
  if (kind === "client" || kind === "client-only") {
    return [
      ...sourceRows,
      { label: "useState used", value: yesNo(metadata.usesState) },
      { label: "useEffect used", value: yesNo(metadata.usesEffect) },
    ];
  }

  if (kind === "server-action") return sourceRows;

  if (
    kind === "server" ||
    kind === "server-only" ||
    kind === "cache" ||
    kind === "cache-private" ||
    kind === "cache-remote"
  ) {
    return [
      ...sourceRows,
      { label: "Async Server Component", value: yesNo(metadata.isAsync || metadata.hasTopLevelAwait) },
      { label: "Using cache directive", value: yesNo(usesCacheDirective) },
    ];
  }

  return [];
}

function isCacheKind(kind: BoundaryKind) {
  return kind === "cache" || kind === "cache-private" || kind === "cache-remote";
}

const popupTitleStyle: CSSProperties = {
  minWidth: 0,
  paddingBottom: 8,
  fontSize: 13,
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const popupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 6,
  borderBottom: "1px solid #ffffff55",
};

const popupControlsStyle: CSSProperties = {
  display: "flex",
  flex: "0 0 auto",
  alignItems: "flex-start",
  gap: 2,
};

const activePopupControlStyle: CSSProperties = {
  color: "#fff",
  opacity: 1,
  filter: "drop-shadow(0 0 3px #ffffffaa)",
};

const popupIdentityLabelStyle: CSSProperties = {
  opacity: 0.75,
  fontWeight: 500,
};

const transparencyButtonStyle: CSSProperties = {
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  width: 26,
  height: 26,
  marginTop: -3,
  marginRight: -5,
  padding: 0,
  border: 0,
  borderRadius: 0,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

function formatFunctionName(name: string) {
  const functionName = name.trim();
  if (/\(\)$/.test(functionName)) return functionName;
  if (/^[\w$]+(?:\.[\w$]+)*$/.test(functionName)) return `${functionName}()`;
  return "inlineServerAction()";
}

function EyeIcon({ crossedOut }: { crossedOut: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossedOut ? <path d="m3 3 18 18" /> : null}
    </svg>
  );
}

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 3 5 5-4 1-4 4 3 3-1 1-4-2-5 5-1-1 5-5-2-4 1-1 3 3 4-4 1-4Z" />
    </svg>
  );
}

const popupDetailStyle: CSSProperties = {
  paddingBottom: 7,
  fontSize: 11,
  opacity: 0.9,
  overflowWrap: "anywhere",
};

const popupRowsStyle: CSSProperties = { display: "grid", gap: 5 };
const popupRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  fontSize: 11,
  lineHeight: 1.35,
};
const popupValueStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 4,
  minWidth: 0,
  textAlign: "right",
  overflowWrap: "anywhere",
};
const unavailableHelpGroupStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};
const unavailableHelpStyle: CSSProperties = {
  display: "inline-grid",
  placeItems: "center",
  width: 13,
  height: 13,
  border: "1px solid currentColor",
  borderRadius: "50%",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 700,
  cursor: "help",
  opacity: 0.8,
  verticalAlign: "1px",
};
const unavailableHintTextStyle: CSSProperties = {
  position: "absolute",
  right: "calc(100% + 6px)",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 1,
  padding: "2px 5px",
  borderRadius: 3,
  background: "#17202a",
  color: "#fff",
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
};

function popupStyle(anchor: { left: number; bottom: number }, color: string, transparent: boolean): CSSProperties {
  const popupTop = anchor.bottom + 8;
  return {
    position: "fixed",
    zIndex: 2147483647,
    left: Math.min(Math.max(8, anchor.left), Math.max(8, window.innerWidth - 288)),
    top: popupTop,
    width: 280,
    maxWidth: "calc(100vw - 16px)",
    maxHeight: Math.max(0, window.innerHeight - popupTop - 8),
    overflow: "auto",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #ffffff70",
    borderRadius: 8,
    background: color,
    color: "#fff",
    opacity: transparent ? 0.5 : 1,
    textAlign: "left",
    whiteSpace: "normal",
    font: "12px/1.4 ui-sans-serif, system-ui, sans-serif",
    boxShadow: "0 8px 24px #0003",
    pointerEvents: "auto",
  };
}

function getBoundaryDepth(content: HTMLElement) {
  let depth = 0;
  let ancestor = content.parentElement;
  while (ancestor) {
    if (ancestor.hasAttribute("data-boundary-kind")) depth += 1;
    ancestor = ancestor.parentElement;
  }
  return depth;
}

function measureBoundaryBounds(content: HTMLElement): Bounds | null {
  const rect = getRenderedContentRect(content);
  if (rect.width === 0 && rect.height === 0) return null;

  const nestingInset = getBoundaryDepth(content) * NESTED_BOUNDARY_INSET;
  const horizontalGap = OUTLINE_GAP - nestingInset;
  const ownAnnotationSpace = 0;
  const childAnnotationSpace = content.querySelector("[data-boundary-kind]")
    ? BOUNDARY_KIND_INSET
    : 0;
  const topGap = horizontalGap + ownAnnotationSpace + childAnnotationSpace;
  return {
    top: rect.top - topGap,
    left: rect.left - horizontalGap,
    width: Math.max(4, rect.width + horizontalGap * 2),
    height: Math.max(4, rect.height + topGap + horizontalGap),
  };
}

function getRenderedContentRect(content: HTMLElement): DOMRect {
  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  content.querySelectorAll<HTMLElement>("*").forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  });

  if (Number.isFinite(top)) {
    return new DOMRect(left, top, right - left, bottom - top);
  }

  const range = document.createRange();
  range.selectNodeContents(content);
  return range.getBoundingClientRect();
}

function getRenderedFont(content: HTMLElement) {
  const elements = Array.from(content.querySelectorAll<HTMLElement>("*"));
  const element = elements.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(candidate).fontFamily;
  });
  if (!element) return "Unavailable";
  const fontFamily = getComputedStyle(element).fontFamily;
  return fontFamily.split(",")[0].replace(/["']/g, "").trim();
}

function constrainToAncestors(content: HTMLElement, bounds: Bounds): Bounds {
  let constrained = bounds;
  let ancestor = content.parentElement;

  while (ancestor) {
    if (ancestor.hasAttribute("data-boundary-kind")) {
      const parentBounds = measureBoundaryBounds(ancestor);
      if (parentBounds) {
        const sideInset = NESTED_BOUNDARY_INSET;
        const left = Math.max(constrained.left, parentBounds.left + sideInset);
        const right = Math.min(
          constrained.left + constrained.width,
          parentBounds.left + parentBounds.width - sideInset,
        );
        const top = Math.max(constrained.top, parentBounds.top + BOUNDARY_KIND_INSET);
        const bottom = Math.min(
          constrained.top + constrained.height,
          parentBounds.top + parentBounds.height - sideInset,
        );
        constrained = {
          top,
          left,
          width: Math.max(4, right - left),
          height: Math.max(4, bottom - top),
        };
      }
    }
    ancestor = ancestor.parentElement;
  }

  return constrained;
}


