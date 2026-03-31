import { createClient } from "@supabase/supabase-js";
import { getListingBoostEnv } from "@/lib/listingboost/env";

export function createListingBoostAdmin() {
  const env = getListingBoostEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

export function createListingBoostAnon() {
  const env = getListingBoostEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
}
