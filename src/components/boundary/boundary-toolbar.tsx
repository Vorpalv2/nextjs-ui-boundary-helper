"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type CSSProperties } from "react";
import { useBoundaryContext } from "./boundary-context";
import { boundaryKindColor, boundaryKindLabels, boundaryKinds } from "./boundary-kind";

type ToolbarTheme = "dark" | "light";
type ToolbarPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";
type ToolbarSize = "compact" | "medium" | "large";

const SETTINGS_KEY = "ui-boundary-helper:toolbar-settings";

export function BoundaryToolbar() {
  const context = useBoundaryContext();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [theme, setTheme] = useState<ToolbarTheme>("dark");
  const [position, setPosition] = useState<ToolbarPosition>("bottom-left");
  const [size, setSize] = useState<ToolbarSize>("medium");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved) as Partial<{ theme: ToolbarTheme; position: ToolbarPosition; size: ToolbarSize }>;
        if (settings.theme === "dark" || settings.theme === "light") setTheme(settings.theme);
        if (["bottom-left", "bottom-right", "top-left", "top-right"].includes(settings.position ?? "")) {
          setPosition(settings.position as ToolbarPosition);
        }
        if (settings.size === "compact" || settings.size === "medium" || settings.size === "large") setSize(settings.size);
      }
    } catch {
      // Ignore unavailable storage or stale settings and use defaults.
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme, position, size }));
    } catch {
      // Toolbar settings still work for this session when storage is unavailable.
    }
  }, [mounted, theme, position, size]);

  useEffect(() => {
    if (!mounted || !context?.debug) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== "b" || isTypingTarget(event.target)) return;

      const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform);
      const matchesShortcut = isMac
        ? event.metaKey && event.ctrlKey && !event.altKey
        : event.ctrlKey && event.altKey && !event.metaKey;

      if (!matchesShortcut) return;
      event.preventDefault();
      context.setBoundariesVisible(!context.boundariesVisible);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [mounted, context?.debug, context?.boundariesVisible, context?.setBoundariesVisible]);

  if (!mounted || !context?.debug) return null;

  const palette = theme === "dark" ? darkPalette : lightPalette;
  const launcherSize = size === "compact" ? 36 : size === "large" ? 50 : 42;
  const dockPosition = toolbarPositionStyle(position);
  const isTop = position.startsWith("top");
  const isRight = position.endsWith("right");

  return createPortal(
    <div style={{ ...dockStyle, ...dockPosition, color: palette.text }}>
      {expanded ? (
        <section
          style={{
            ...panelStyle,
            ...panelPositionStyle(position),
            ...palette.panel,
            ...(size === "compact" ? compactPanelStyle : size === "large" ? largePanelStyle : {}),
          }}
          aria-label="UI boundary development tools"
        >
          <header style={{ ...panelHeaderStyle, borderColor: palette.divider }}>
            <span style={panelTitleStyle}>UI Boundaries</span>
            <span style={{ ...shortcutHintStyle, color: palette.muted }} title="Toggle boundary annotations">
              {isMacPlatform() ? "⌘+⌃+B" : "Ctrl+Alt+B"} toggles annotations
            </span>
            <button type="button" style={{ ...closeButtonStyle, color: palette.muted }} aria-label="Collapse UI boundary toolbar" onClick={() => setExpanded(false)}>
              ×
            </button>
          </header>

          <button
            type="button"
            style={{ ...actionButtonStyle, color: palette.text }}
            aria-pressed={context.boundariesVisible}
            onClick={() => context.setBoundariesVisible(!context.boundariesVisible)}
          >
            <BoundaryVisibilityIcon visible={context.boundariesVisible} />
            <span>Show boundary annotations</span>
            <span style={{ ...actionValueStyle, color: palette.muted }}>{context.boundariesVisible ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            style={{ ...actionButtonStyle, color: palette.text }}
            aria-pressed={context.tintBackgrounds}
            onClick={() => context.setTintBackgrounds(!context.tintBackgrounds)}
          >
            <span style={colorSwatchStyle} />
            <span>Color component backgrounds</span>
            <span style={{ ...actionValueStyle, color: palette.muted }}>{context.tintBackgrounds ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            style={{ ...actionButtonStyle, color: palette.text }}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <FilterIcon />
            <span>Show boundaries by type</span>
            <span style={{ ...actionValueStyle, color: palette.muted }}>{filtersOpen ? "−" : "+"}</span>
          </button>

          <label style={{ ...searchRowStyle, color: palette.muted }}>
            <SearchIcon />
            <input
              type="search"
              value={context.searchQuery}
              onChange={(event) => context.setSearchQuery(event.currentTarget.value)}
              placeholder="Search component name…"
              aria-label="Search boundary annotations by component name"
              style={{ ...searchInputStyle, ...palette.select, color: palette.text }}
            />
            {context.searchQuery ? (
              <button
                type="button"
                aria-label="Clear component search"
                title="Clear search"
                style={{ ...clearSearchStyle, color: palette.muted }}
                onClick={() => context.setSearchQuery("")}
              >
                ×
              </button>
            ) : null}
          </label>

          {filtersOpen ? (
            <div style={filterListStyle}>
              <div style={filterHeaderStyle} aria-hidden="true">
                <span>Type</span><span>Show</span><span>Tint</span>
              </div>
              {boundaryKinds.map((kind) => (
                <div key={kind} style={filterOptionStyle}>
                  <span style={{ ...filterKindNameStyle, color: palette.text }}>
                    <span style={{ ...filterSwatchStyle, background: boundaryKindColor(kind) }} />
                    <span>{boundaryKindLabels[kind]}</span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={`Show ${boundaryKindLabels[kind]} boundaries`}
                    checked={context.visibleKinds[kind]}
                    onChange={(event) => context.setKindVisibility(kind, event.currentTarget.checked)}
                  />
                  <input
                    type="checkbox"
                    aria-label={`Tint ${boundaryKindLabels[kind]} backgrounds`}
                    checked={context.tintedKinds[kind]}
                    onChange={(event) => context.setKindTint(kind, event.currentTarget.checked)}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ ...sectionDividerStyle, background: palette.divider }} />
          <div style={settingsListStyle}>
            <ToolbarSetting label="Theme" value={theme} onChange={(value) => setTheme(value as ToolbarTheme)} options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]} palette={palette} />
            <ToolbarSetting label="Position" value={position} onChange={(value) => setPosition(value as ToolbarPosition)} options={[
              { value: "bottom-left", label: "Bottom left" },
              { value: "bottom-right", label: "Bottom right" },
              { value: "top-left", label: "Top left" },
              { value: "top-right", label: "Top right" },
            ]} palette={palette} />
            <ToolbarSetting label="Size" value={size} onChange={(value) => setSize(value as ToolbarSize)} options={[
              { value: "compact", label: "Compact" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]} palette={palette} />
          </div>
        </section>
      ) : null}

      <button
        type="button"
        style={{
          ...launcherStyle,
          width: launcherSize,
          height: launcherSize,
          background: palette.launcher,
          color: palette.text,
          borderColor: palette.launcherBorder,
        }}
        aria-label={expanded ? "Collapse UI boundary toolbar" : "Open UI boundary toolbar"}
        aria-expanded={expanded}
        title={`UI boundary tools · Toggle annotations: ${isMacPlatform() ? "⌘+⌃+B" : "Ctrl+Alt+B"}`}
        onClick={() => setExpanded((open) => !open)}
      >
        <BoundaryIcon />
      </button>
    </div>,
    document.body,
  );
}

function isMacPlatform() {
  return /mac|iphone|ipad|ipod/i.test(navigator.platform);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function ToolbarSetting({
  label,
  value,
  options,
  onChange,
  palette,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  palette: ToolbarPalette;
}) {
  return (
    <label style={{ ...settingRowStyle, color: palette.text }}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)} style={{ ...settingSelectStyle, ...palette.select }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

type ToolbarPalette = {
  text: string;
  muted: string;
  divider: string;
  launcher: string;
  launcherBorder: string;
  panel: CSSProperties;
  select: CSSProperties;
};

const darkPalette: ToolbarPalette = {
  text: "#f4f4f5",
  muted: "#a1a1aa",
  divider: "#ffffff24",
  launcher: "#17191fee",
  launcherBorder: "#ffffff35",
  panel: { background: "#101113f5", borderColor: "#ffffff2b" },
  select: { background: "#202124", borderColor: "#ffffff30", color: "#f4f4f5" },
};

const lightPalette: ToolbarPalette = {
  text: "#27272a",
  muted: "#71717a",
  divider: "#18181b20",
  launcher: "#ffffffed",
  launcherBorder: "#18181b2e",
  panel: { background: "#fffffff5", borderColor: "#18181b24" },
  select: { background: "#f4f4f5", borderColor: "#18181b30", color: "#27272a" },
};

function toolbarPositionStyle(position: ToolbarPosition): CSSProperties {
  const horizontal = position.endsWith("right") ? { right: 16 } : { left: 64 };
  const vertical = position.startsWith("top") ? { top: 16 } : { bottom: 16 };
  return { ...horizontal, ...vertical };
}

function panelPositionStyle(position: ToolbarPosition): CSSProperties {
  const horizontal = position.endsWith("right") ? { right: 0 } : { left: 0 };
  const vertical = position.startsWith("top") ? { top: 54 } : { bottom: 54 };
  return { ...horizontal, ...vertical };
}

const dockStyle: CSSProperties = {
  position: "fixed",
  zIndex: 2147483200,
  font: "13px/1.4 ui-sans-serif, system-ui, sans-serif",
  color: "#f4f4f5",
  pointerEvents: "none",
};

const launcherStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 42,
  height: 42,
  padding: 0,
  border: "1px solid #ffffff35",
  borderRadius: "50%",
  background: "#17191fee",
  color: "#fff",
  boxShadow: "0 4px 18px #0005",
  cursor: "pointer",
  pointerEvents: "auto",
};

const panelStyle: CSSProperties = {
  position: "absolute",
  width: "min(480px, calc(100vw - 90px))",
  maxHeight: "min(75vh, 620px)",
  overflow: "auto",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #ffffff2b",
  borderRadius: 12,
  boxShadow: "0 10px 36px #0007",
  pointerEvents: "auto",
};

const compactPanelStyle: CSSProperties = { width: "min(380px, calc(100vw - 90px))", padding: "9px 11px", fontSize: 12 };
const largePanelStyle: CSSProperties = { width: "min(540px, calc(100vw - 90px))", padding: "15px 17px", fontSize: 14 };

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 8,
  marginBottom: 3,
  borderBottom: "1px solid #ffffff24",
};

const panelTitleStyle: CSSProperties = { fontSize: 14, fontWeight: 650 };
const shortcutHintStyle: CSSProperties = { marginLeft: "auto", fontSize: 10, whiteSpace: "nowrap" };

const closeButtonStyle: CSSProperties = {
  width: 27,
  height: 27,
  padding: 0,
  border: 0,
  borderRadius: 6,
  background: "transparent",
  color: "#d4d4d8",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
};

const actionButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  minHeight: 38,
  padding: "7px 2px",
  border: 0,
  background: "transparent",
  color: "inherit",
  textAlign: "left",
  font: "inherit",
  cursor: "pointer",
};

const actionValueStyle: CSSProperties = { marginLeft: "auto", color: "#a1a1aa", fontSize: 12 };
const colorSwatchStyle: CSSProperties = {
  width: 14,
  height: 14,
  flex: "0 0 auto",
  borderRadius: 4,
  background: "linear-gradient(135deg, #3478f6 0 25%, #d94b4b 25% 50%, #218a5b 50% 75%, #d49a36 75%)",
};

const filterListStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 35px 35px",
  gap: "1px 8px",
  padding: "2px 0 8px 23px",
};

const filterOptionStyle: CSSProperties = {
  display: "contents",
};

const filterHeaderStyle: CSSProperties = {
  display: "contents",
};

const filterKindNameStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minHeight: 28,
  color: "#d4d4d8",
  fontSize: 11,
  whiteSpace: "nowrap",
};

const filterSwatchStyle: CSSProperties = { width: 8, height: 8, flex: "0 0 auto", borderRadius: "50%" };
const sectionDividerStyle: CSSProperties = { height: 1, margin: "5px 0", background: "#ffffff24" };
const settingsListStyle: CSSProperties = { display: "grid", gap: 8, padding: "4px 0 2px" };
const searchRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, margin: "2px 0 5px" };
const searchInputStyle: CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "8px 9px", border: "1px solid", borderRadius: 6, outline: "none", font: "inherit" };
const clearSearchStyle: CSSProperties = { flex: "0 0 auto", marginLeft: -34, width: 26, height: 26, padding: 0, border: 0, background: "transparent", fontSize: 18, cursor: "pointer" };
const settingRowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 };
const settingSelectStyle: CSSProperties = { minWidth: 140, maxWidth: "65%", padding: "6px 8px", border: "1px solid", borderRadius: 6, font: "inherit" };

function FilterIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M7 12h10m-7 6h4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function BoundaryIcon() {
  return (
    <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" strokeDasharray="2 2" />
      <rect x="7" y="7" width="10" height="10" rx="3" />
    </svg>
  );
}

function BoundaryVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" strokeDasharray={visible ? "2 2" : undefined} />
      {!visible ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}
