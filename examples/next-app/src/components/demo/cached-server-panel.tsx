import { refreshCachedSummary } from "./actions";

export async function CachedServerPanel() {
  "use cache";

  return (
    <article className="demo-card">
      <span className="eyebrow">CACHED SERVER COMPONENT</span>
      <strong>Cached summary</strong>
      <p>This Server Component is inside a <code>use cache</code> scope.</p>
      <form action={refreshCachedSummary}>
        <button className="refresh-action" type="submit">Revalidate this page</button>
      </form>
    </article>
  );
}
