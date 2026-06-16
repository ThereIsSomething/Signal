// ═══════════════════════════════════════════════════════════════════════════════
// Supabase Admin Client (Service Role)
// Use ONLY in server-side pipeline operations that bypass RLS.
// NEVER expose this client to the browser.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: SupabaseClient<any, "public", any> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations"
    );
  }

  adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}
