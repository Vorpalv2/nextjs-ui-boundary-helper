// This component is a Server Component by default and also opts into caching.
export async function CachedHealthStatus() {
  "use cache";

  return (
    <div className="health-cache-card">
      <p className="eyebrow">CACHED SERVER COMPONENT</p>
      <strong>Database and API are responding</strong>
      <p>This server-rendered status is cached and passed into the client panel.</p>
    </div>
  );
}
