/**
 * Hand-authored Supabase database types.
 * Once the Supabase project is live, replace with the auto-generated version:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Matches the GenericTable / GenericSchema shape expected by @supabase/supabase-js v2.
 */

export type UserRole = "admin" | "client";

export type ClientStatus =
  | "pending_connection"
  | "missing_id"
  | "ready_for_audit"
  | "audit_in_progress"
  | "audit_complete"
  | "disputes_drafted"
  | "disputes_sent"
  | "waiting_on_bureau"
  | "bureau_responded"
  | "results_received"
  | "complete";

export type DocumentCategory = "id" | "ssn" | "credit_report" | "other";
export type DocumentStatus = "pending" | "verified" | "rejected";
export type MessageSender = "admin" | "client";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          address: string | null;
          goal: string | null;
          challenge: string | null;
          role: UserRole;
          status: ClientStatus;
          progress: number;
          id_uploaded: boolean;
          ssn_uploaded: boolean;
          video_verified: boolean;
          ssn_secret_id: string | null;
          negative_items: number | null;
          dispute_probability: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          address?: string | null;
          goal?: string | null;
          challenge?: string | null;
          role?: UserRole;
          status?: ClientStatus;
          progress?: number;
          id_uploaded?: boolean;
          ssn_uploaded?: boolean;
          video_verified?: boolean;
          ssn_secret_id?: string | null;
          negative_items?: number | null;
          dispute_probability?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          profile_id: string;
          sender: MessageSender;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          sender: MessageSender;
          body: string;
        };
        // Messages are immutable — no valid update columns
        Update: Record<string, never>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number | null;
          category: DocumentCategory;
          status: DocumentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          storage_path: string;
          mime_type: string;
          size_bytes?: number | null;
          category: DocumentCategory;
          status?: DocumentStatus;
        };
        Update: { status?: DocumentStatus };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string;
          action: string;
          target_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        // Insert-only via log_audit_event() RPC — no valid insert columns from client
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      clerk_user_id: { Args: Record<string, never>; Returns: string };
      log_audit_event: {
        Args: { p_action: string; p_target?: string; p_metadata?: Record<string, unknown> };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row type aliases
export type Profile  = Database["public"]["Tables"]["profiles"]["Row"];
export type Message  = Database["public"]["Tables"]["messages"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];

/** Profile with its Supabase row id — used in admin list views */
export type ClientRecord = Profile;
