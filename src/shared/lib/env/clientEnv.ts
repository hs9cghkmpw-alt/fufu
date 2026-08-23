import { publicEnvSchema } from './schema';

export const clientEnv = publicEnvSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
});

export const isSupabaseConfigured = Boolean(
  clientEnv.VITE_SUPABASE_URL && clientEnv.VITE_SUPABASE_PUBLISHABLE_KEY
);
