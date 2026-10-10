import { Suspense } from "react";
import { CachedServerPanel } from "@/components/demo/cached-server-panel";
import { ClientCounter } from "@/components/demo/client-counter";
import { ServerData } from "@/components/demo/server-data";

export default function Home() {
  return (
    <main className="demo">
      <header>
        <p className="eyebrow">NEXT.JS APP ROUTER · SMALL DEMO</p>
        <h1>UI Boundary Helper</h1>
        <p className="intro">
          Put one provider in <code>app/layout.tsx</code>; the build integration finds component boundaries for you.
        </p>
        <p className="health-link"><a href="/health">Open the /health boundary example →</a></p>
      </header>

      <section className="example" aria-labelledby="example-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LIVE EXAMPLE</p>
            <h2 id="example-title">Server page, client island, cached server child</h2>
          </div>
          <span className="dev-note">Toggle with debug in layout.tsx</span>
        </div>

        <div className="demo-grid">
          <article className="demo-card">
            <ClientCounter>
              <CachedServerPanel />
            </ClientCounter>
          </article>

          <Suspense fallback={<div className="skeleton">Loading the server summary…</div>}>
            <ServerData />
          </Suspense>

        </div>

        <p className="action-note">
          The Server Component contains a Client Component, which receives the cached Server Component as a slot.
          Their independently generated outlines show the nested layers. The form action gets its own annotation too.
        </p>

        <div className="donut-callout">
          <strong>Donut pattern</strong>
          <code>{"<ClientShell>{<ServerContent />}</ClientShell>"}</code>
          <span>The Server Component is passed into the Client Component as a slot.</span>
        </div>
      </section>

      <details className="integration">
        <summary>Root layout integration</summary>
        <pre><code>{`import { BoundaryProvider } from "ui-boundary-helper";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <BoundaryProvider debug={process.env.NODE_ENV === "development"}>
          {children}
        </BoundaryProvider>
      </body>
    </html>
  );
}`}</code></pre>
      </details>

      <p className="footnote">
        Annotations are injected at build time for local components and Suspense fallbacks.
      </p>
    </main>
  );
}
