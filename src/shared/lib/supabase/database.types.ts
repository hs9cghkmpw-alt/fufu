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
      couples: {
        Row: { id: string; created_by: string; created_at: string; archived_at: string | null };
        Insert: {
          id?: string;
          created_by: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: { archived_at?: string | null };
        Relationships: [];
      };
      couple_members: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string;
          role_label: string | null;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          couple_id: string;
          user_id: string;
          role_label?: string | null;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: { role_label?: string | null; left_at?: string | null };
        Relationships: [];
      };
      couple_invitations: {
        Row: {
          id: string;
          couple_id: string;
          code_hash: string;
          created_by: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      pairing_audit_logs: {
        Row: {
          id: number;
          couple_id: string;
          actor_user_id: string;
          action: string;
          invitation_id: string | null;
          metadata: Json;
          occurred_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_couple: { Args: Record<PropertyKey, never>; Returns: string };
      create_couple_invitation: {
        Args: { target_couple_id: string; valid_for?: string };
        Returns: { invitation_id: string; invite_code: string; expires_at: string }[];
      };
      revoke_couple_invitation: {
        Args: { target_invitation_id: string };
        Returns: undefined;
      };
      join_couple: { Args: { invite_code: string }; Returns: string };
      is_active_couple_member: { Args: { target_couple_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
