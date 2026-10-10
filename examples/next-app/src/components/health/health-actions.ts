"use server";

export type HealthActionState = { message: string } | null;

export async function runClientHealthAction(
  _previousState: HealthActionState,
  _formData: FormData,
): Promise<HealthActionState> {
  return { message: `Server Action completed at ${new Date().toLocaleTimeString()}.` };
}
