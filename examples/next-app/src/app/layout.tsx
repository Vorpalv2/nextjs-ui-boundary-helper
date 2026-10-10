import type { Metadata } from "next";
import { BoundaryProvider } from "ui-boundary-helper";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI Boundary Helper — Playground",
  description: "A drop-in layout wrapper for visualizing server, client, and suspense UI boundaries.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <BoundaryProvider debug={true}>
          {children}
        </BoundaryProvider>
      </body>
    </html>
  );
}
