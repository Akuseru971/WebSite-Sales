import { createSupabaseServerClient } from "./server";

export async function requireAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Unauthorized: you must be authenticated to edit demo sites.");
  }

  return data.user.id;
}
