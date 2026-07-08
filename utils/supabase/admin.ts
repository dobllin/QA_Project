import { createClient } from '@supabase/supabase-js'

// Admin client dengan service_role key.
// HANYA dipakai di server actions/routes. Jangan pernah expose ke client.
// Bisa bypass RLS - hati-hati.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add to .env.local and restart server.'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}