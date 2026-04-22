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

export type Plan = "free" | "diy" | "standard" | "premium";
export type DocumentCategory = "id" | "ssn" | "credit_report" | "other";
export type DocumentStatus = "pending" | "verified" | "rejected";
export type MessageSender = "admin" | "client";

// Urgency tiers — higher urgency_score = more action needed. Flipped from
// the earlier "readiness" direction so the number matches sales intuition
// (high number = hot lead). Migration 006 renamed the DB columns to match.
export type UrgencyTier        = "low" | "moderate" | "elevated" | "urgent";
export type RecommendedOffer   = "diy"    | "accelerated" | "executive";
export type GHLDelivery        = "api"    | "webhook_fallback" | "failed";

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
          plan: Plan;
          quiz_data: Record<string, unknown> | null;
          stripe_customer_id: string | null;
          stripe_session_id: string | null;
          status: ClientStatus;
          progress: number;
          id_uploaded: boolean;
          ssn_uploaded: boolean;
          video_verified: boolean;
          ssn_secret_id: string | null;
          negative_items: number | null;
          dispute_probability: number | null;
          admin_notes: string | null;
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
          plan?: Plan;
          quiz_data?: Record<string, unknown> | null;
          stripe_customer_id?: string | null;
          stripe_session_id?: string | null;
          status?: ClientStatus;
          progress?: number;
          id_uploaded?: boolean;
          ssn_uploaded?: boolean;
          video_verified?: boolean;
          ssn_secret_id?: string | null;
          negative_items?: number | null;
          dispute_probability?: number | null;
          admin_notes?: string | null;
        };
        // Broad Update shape is retained so admin code (which writes via the
        // "profiles: admin full access" RLS policy) continues to type-check.
        // Non-admin client code should use `ClientProfileUpdate` below; RLS on
        // profiles (migrations/002) rejects any non-admin write that targets
        // columns outside the allowlist.
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
      stripe_webhook_events: {
        Row: {
          id: string;
          event_type: string;
          received_at: string;
        };
        Insert: {
          id: string;
          event_type: string;
          received_at?: string;
        };
        // Immutable audit record — no valid update columns
        Update: Record<string, never>;
        Relationships: [];
      };
      lead_submissions: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          goal: string | null;
          obstacles: string[];
          credit_score_range: string | null;
          income_range: string | null;
          ideal_score: string | null;
          timeline: string | null;
          urgency_score: number | null;
          urgency_tier: UrgencyTier | null;
          recommended_offer: RecommendedOffer | null;
          source: string;
          ghl_contact_id: string | null;
          ghl_delivery: GHLDelivery | null;
          consent: boolean;
          submitted_at: string;
          created_at: string;
          admin_notes: string | null;
        };
        // Writes only via service-role (/api/lead). RLS rejects all direct
        // inserts from client sessions. Kept loose so the server code
        // type-checks without having to spell every field as optional.
        Insert: {
          email: string;
          full_name?: string | null;
          phone?: string | null;
          goal?: string | null;
          obstacles?: string[];
          credit_score_range?: string | null;
          income_range?: string | null;
          ideal_score?: string | null;
          timeline?: string | null;
          urgency_score?: number | null;
          urgency_tier?: UrgencyTier | null;
          recommended_offer?: RecommendedOffer | null;
          source?: string;
          ghl_contact_id?: string | null;
          ghl_delivery?: GHLDelivery | null;
          consent?: boolean;
          submitted_at?: string;
          admin_notes?: string | null;
        };
        // Admin-side edits via /api/admin/lead/[id]. Shape matches Insert
        // minus the required email (PATCH allows changing email but it's
        // still validated to be an email at the endpoint layer).
        Update: Partial<Database["public"]["Tables"]["lead_submissions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      clerk_user_id: { Args: Record<string, never>; Returns: string };
      is_admin:      { Args: Record<string, never>; Returns: boolean };
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
export type Profile         = Database["public"]["Tables"]["profiles"]["Row"];
export type Message         = Database["public"]["Tables"]["messages"]["Row"];
export type Document        = Database["public"]["Tables"]["documents"]["Row"];
export type AuditLog        = Database["public"]["Tables"]["audit_log"]["Row"];
export type StripeWebhookEvent = Database["public"]["Tables"]["stripe_webhook_events"]["Row"];
export type LeadSubmission  = Database["public"]["Tables"]["lead_submissions"]["Row"];

/** Profile with its Supabase row id — used in admin list views */
export type ClientRecord = Profile;

/**
 * Columns a non-admin caller is permitted to mutate on their OWN profile row.
 * Mirrors the allowlist enforced at the DB layer by RLS (see
 * supabase/migrations/002_fix_profiles_rls_privilege_escalation.sql).
 *
 * Prefer this type at client-side call sites (e.g. DocumentVault) so a typo
 * that adds `plan` or `status` to the update payload is caught at compile
 * time rather than silently rejected by RLS at runtime.
 */
export type ClientProfileUpdate = Partial<Pick<
  Database["public"]["Tables"]["profiles"]["Insert"],
  | "full_name"
  | "phone"
  | "address"
  | "goal"
  | "challenge"
  | "quiz_data"
  | "id_uploaded"
  | "ssn_uploaded"
>>;
