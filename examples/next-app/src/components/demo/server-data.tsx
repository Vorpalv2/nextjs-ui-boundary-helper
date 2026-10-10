import { connection } from "next/server";

export async function ServerData() {
  await connection();
  await new Promise((resolve) => setTimeout(resolve, 900));

  return (
    <article className="demo-card">
      <span className="eyebrow">SERVER FETCH COMPLETE</span>
      <strong>Your workspace is up to date.</strong>
      <p>Rendered on the server, then streamed into the open slot.</p>
    </article>
  );
}
