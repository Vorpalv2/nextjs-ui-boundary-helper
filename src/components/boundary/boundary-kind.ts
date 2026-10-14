export const boundaryKinds = [
  "server",
  "client",
  "suspense",
  "cache",
  "cache-private",
  "cache-remote",
  "server-only",
  "client-only",
  "server-action",
] as const;

export type BoundaryKind = (typeof boundaryKinds)[number];

export const boundaryKindLabels: Record<BoundaryKind, string> = {
  server: "Server Component",
  client: "Client Component",
  suspense: "Suspense",
  cache: "use cache",
  "cache-private": "use cache: private",
  "cache-remote": "use cache: remote",
  "server-only": "server-only",
  "client-only": "client-only",
  "server-action": "Server Action",
};

export function boundaryKindColor(kind: BoundaryKind) {
  if (kind === "server" || kind === "server-only") return "#d94b4b";
  if (kind === "server-action") return "#8051d8";
  if (kind === "client" || kind === "client-only") return "#3478f6";
  if (kind === "suspense") return "#d49a36";
  return "#218a5b";
}

export function boundaryKindTint(kind: BoundaryKind, active = false) {
  if (active) {
    if (kind === "server" || kind === "server-only") return "hsla(0, 72%, 40%, 0.28)";
    if (kind === "server-action") return "hsla(270, 75%, 44%, 0.30)";
    if (kind === "client" || kind === "client-only") return "hsla(218, 90%, 40%, 0.28)";
    if (kind === "suspense") return "hsla(44, 88%, 36%, 0.32)";
    return "hsla(150, 70%, 28%, 0.28)";
  }
  if (kind === "server" || kind === "server-only") return "hsla(0, 72%, 56%, 0.12)";
  if (kind === "server-action") return "hsla(270, 75%, 60%, 0.14)";
  if (kind === "client" || kind === "client-only") return "hsla(218, 90%, 56%, 0.12)";
  if (kind === "suspense") return "hsla(44, 88%, 52%, 0.16)";
  return "hsla(150, 70%, 40%, 0.12)";
}
