import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";

export async function HealthServerPanel({ children }: { children: ReactNode }) {
  async function refreshHealthFromServer() {
    "use server";
    revalidatePath("/health");
  }

  async function validateHealthLabel(formData: FormData): Promise<void> {
    "use server";
    const label = String(formData.get("label") ?? "").trim();
    if (!label) return;
    revalidatePath("/health");
  }

  await connection();
  await new Promise((resolve) => setTimeout(resolve, 1400));

  return (
    <article className="health-card">
      <p className="eyebrow">SERVER COMPONENT · STREAMED</p>
      <h2>Server checks passed</h2>
      <p>This panel finished its server work and streamed inside the client shell.</p>
      <form action={refreshHealthFromServer} className="health-action-form">
        <button className="health-action-button" type="submit">Run action defined in Server Component</button>
      </form>
      <form action={validateHealthLabel} className="health-action-form">
        <input aria-label="Health label" name="label" defaultValue="Health report" />
        <button className="health-action-button" type="submit">Validate typed action</button>
      </form>
      <div className="health-nested-slot">{children}</div>
    </article>
  );
}
