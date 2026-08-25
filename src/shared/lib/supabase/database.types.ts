export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string;
          couple_id: string;
          entity_id: string;
          entity_type: string;
          id: number;
          metadata: Json;
          occurred_at: string;
          proposal_version_id: string | null;
          request_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          couple_id: string;
          entity_id: string;
          entity_type: string;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          proposal_version_id?: string | null;
          request_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          couple_id?: string;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          proposal_version_id?: string | null;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_proposal_couple';
            columns: ['proposal_version_id', 'couple_id'];
            isOneToOne: false;
            referencedRelation: 'proposal_versions';
            referencedColumns: ['id', 'couple_id'];
          },
          {
            foreignKeyName: 'audit_request_couple';
            columns: ['request_id', 'couple_id'];
            isOneToOne: false;
            referencedRelation: 'requests';
            referencedColumns: ['id', 'couple_id'];
          }
        ];
      };
      couple_invitations: {
        Row: {
          code_hash: string;
          couple_id: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code_hash: string;
          couple_id: string;
          created_at?: string;
          created_by: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code_hash?: string;
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'couple_invitations_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          }
        ];
      };
      couple_members: {
        Row: {
          couple_id: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          role_label: string | null;
          user_id: string;
        };
        Insert: {
          couple_id: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          role_label?: string | null;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          role_label?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'couple_members_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          }
        ];
      };
      couples: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
        };
        Relationships: [];
      };
      pairing_audit_logs: {
        Row: {
          action: string;
          actor_user_id: string;
          couple_id: string;
          id: number;
          invitation_id: string | null;
          metadata: Json;
          occurred_at: string;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          couple_id: string;
          id?: never;
          invitation_id?: string | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          couple_id?: string;
          id?: never;
          invitation_id?: string | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pairing_audit_logs_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pairing_audit_logs_invitation_id_fkey';
            columns: ['invitation_id'];
            isOneToOne: false;
            referencedRelation: 'couple_invitations';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      proposal_versions: {
        Row: {
          amount: number | null;
          amount_type: string | null;
          author_user_id: string;
          counter_reason: string | null;
          couple_id: string;
          created_at: string;
          details: string | null;
          due_at: string | null;
          id: string;
          request_id: string;
          scheduled_at: string | null;
          title: string;
          version_no: number;
        };
        Insert: {
          amount?: number | null;
          amount_type?: string | null;
          author_user_id: string;
          counter_reason?: string | null;
          couple_id: string;
          created_at?: string;
          details?: string | null;
          due_at?: string | null;
          id?: string;
          request_id: string;
          scheduled_at?: string | null;
          title: string;
          version_no: number;
        };
        Update: {
          amount?: number | null;
          amount_type?: string | null;
          author_user_id?: string;
          counter_reason?: string | null;
          couple_id?: string;
          created_at?: string;
          details?: string | null;
          due_at?: string | null;
          id?: string;
          request_id?: string;
          scheduled_at?: string | null;
          title?: string;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'proposal_author_membership';
            columns: ['couple_id', 'author_user_id'];
            isOneToOne: false;
            referencedRelation: 'couple_members';
            referencedColumns: ['couple_id', 'user_id'];
          },
          {
            foreignKeyName: 'proposal_request_couple';
            columns: ['request_id', 'couple_id'];
            isOneToOne: false;
            referencedRelation: 'requests';
            referencedColumns: ['id', 'couple_id'];
          }
        ];
      };
      requests: {
        Row: {
          category: string;
          couple_id: string;
          created_at: string;
          current_actor_user_id: string | null;
          current_proposal_version: number;
          discussion_at: string | null;
          id: string;
          request_kind: string;
          requester_user_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          couple_id: string;
          created_at?: string;
          current_actor_user_id?: string | null;
          current_proposal_version?: number;
          discussion_at?: string | null;
          id?: string;
          request_kind?: string;
          requester_user_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          couple_id?: string;
          created_at?: string;
          current_actor_user_id?: string | null;
          current_proposal_version?: number;
          discussion_at?: string | null;
          id?: string;
          request_kind?: string;
          requester_user_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'requests_actor_membership';
            columns: ['couple_id', 'current_actor_user_id'];
            isOneToOne: false;
            referencedRelation: 'couple_members';
            referencedColumns: ['couple_id', 'user_id'];
          },
          {
            foreignKeyName: 'requests_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'requests_current_proposal_fk';
            columns: ['id', 'couple_id', 'current_proposal_version'];
            isOneToOne: false;
            referencedRelation: 'proposal_versions';
            referencedColumns: ['request_id', 'couple_id', 'version_no'];
          },
          {
            foreignKeyName: 'requests_requester_membership';
            columns: ['couple_id', 'requester_user_id'];
            isOneToOne: false;
            referencedRelation: 'couple_members';
            referencedColumns: ['couple_id', 'user_id'];
          }
        ];
      };
      responses: {
        Row: {
          couple_id: string;
          created_at: string;
          discussion_at: string | null;
          id: string;
          proposal_version_id: string;
          reason: string | null;
          request_id: string;
          responder_user_id: string;
          response_type: string;
        };
        Insert: {
          couple_id: string;
          created_at?: string;
          discussion_at?: string | null;
          id?: string;
          proposal_version_id: string;
          reason?: string | null;
          request_id: string;
          responder_user_id: string;
          response_type: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          discussion_at?: string | null;
          id?: string;
          proposal_version_id?: string;
          reason?: string | null;
          request_id?: string;
          responder_user_id?: string;
          response_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'responses_proposal_request_couple';
            columns: ['proposal_version_id', 'request_id', 'couple_id'];
            isOneToOne: false;
            referencedRelation: 'proposal_versions';
            referencedColumns: ['id', 'request_id', 'couple_id'];
          },
          {
            foreignKeyName: 'responses_request_couple';
            columns: ['request_id', 'couple_id'];
            isOneToOne: false;
            referencedRelation: 'requests';
            referencedColumns: ['id', 'couple_id'];
          },
          {
            foreignKeyName: 'responses_responder_membership';
            columns: ['couple_id', 'responder_user_id'];
            isOneToOne: false;
            referencedRelation: 'couple_members';
            referencedColumns: ['couple_id', 'user_id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_request: {
        Args: { expected_version: number; target_request_id: string };
        Returns: string;
      };
      counter_proposal: {
        Args: {
          expected_version: number;
          p_amount: number;
          p_amount_type: string;
          p_category: string;
          p_details: string;
          p_due_at: string;
          p_reason: string;
          p_scheduled_at: string;
          p_title: string;
          target_request_id: string;
        };
        Returns: string;
      };
      create_couple: { Args: never; Returns: string };
      create_couple_invitation: {
        Args: { target_couple_id: string; valid_for?: string };
        Returns: {
          expires_at: string;
          invitation_id: string;
          invite_code: string;
        }[];
      };
      create_request: {
        Args: {
          p_amount?: number;
          p_amount_type?: string;
          p_category: string;
          p_details?: string;
          p_due_at?: string;
          p_scheduled_at?: string;
          p_title: string;
        };
        Returns: string;
      };
      is_active_couple_member: {
        Args: { target_couple_id: string };
        Returns: boolean;
      };
      join_couple: { Args: { invite_code: string }; Returns: string };
      lock_request_for_response: {
        Args: { expected_version: number; target_request_id: string };
        Returns: {
          category: string;
          couple_id: string;
          created_at: string;
          current_actor_user_id: string | null;
          current_proposal_version: number;
          discussion_at: string | null;
          id: string;
          request_kind: string;
          requester_user_id: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_discussion_result: {
        Args: {
          expected_version: number;
          p_amount: number;
          p_amount_type: string;
          p_category: string;
          p_details: string;
          p_due_at: string;
          p_reason: string;
          p_scheduled_at: string;
          p_title: string;
          target_request_id: string;
        };
        Returns: string;
      };
      reject_request: {
        Args: {
          expected_version: number;
          rejection_reason: string;
          target_request_id: string;
        };
        Returns: string;
      };
      revoke_couple_invitation: {
        Args: { target_invitation_id: string };
        Returns: undefined;
      };
      schedule_discussion: {
        Args: {
          expected_version: number;
          scheduled_for: string;
          target_request_id: string;
        };
        Returns: string;
      };
      validate_negotiation_proposal_input: {
        Args: {
          p_amount: number;
          p_amount_type: string;
          p_category: string;
          p_details: string;
          p_reason: string;
          p_title: string;
        };
        Returns: undefined;
      };
      withdraw_request: {
        Args: { expected_version: number; target_request_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {}
  },
  public: {
    Enums: {}
  }
} as const;
