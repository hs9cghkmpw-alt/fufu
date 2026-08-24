// Generated file location. Replace with:
// npx supabase gen types typescript --project-id <project-id> > src/shared/lib/supabase/database.types.ts
// Do not hand-maintain business table types in this file.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: { display_name?: string | null; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
