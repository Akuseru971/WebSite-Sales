import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  APP_ADMIN_EMAIL: z.string().email(),
  APP_ADMIN_PASSWORD: z.string().min(8),
  OPENAI_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional()
});

export function getListingBoostEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid env configuration: ${reason}`);
  }
  return parsed.data;
}
