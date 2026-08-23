import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { clientEnv, isSupabaseConfigured } from '../env/clientEnv';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (
    !isSupabaseConfigured ||
    !clientEnv.VITE_SUPABASE_URL ||
    !clientEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error('Supabase public environment variables are not configured');
  }
  client ??= createClient<Database>(
    clientEnv.VITE_SUPABASE_URL,
    clientEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }
  );
  return client;
}
