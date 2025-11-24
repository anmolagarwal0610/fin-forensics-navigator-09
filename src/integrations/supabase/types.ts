export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      case_csv_files: {
        Row: {
          case_id: string
          corrected_csv_url: string | null
          created_at: string | null
          id: string
          is_corrected: boolean | null
          original_csv_url: string
          pdf_file_name: string
          updated_at: string | null
        }
        Insert: {
          case_id: string
          corrected_csv_url?: string | null
          created_at?: string | null
          id?: string
          is_corrected?: boolean | null
          original_csv_url: string
          pdf_file_name: string
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          corrected_csv_url?: string | null
          created_at?: string | null
          id?: string
          is_corrected?: boolean | null
          original_csv_url?: string
          pdf_file_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_csv_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_files: {
        Row: {
          case_id: string
          file_name: string
          file_url: string | null
          id: string
          type: Database["public"]["Enums"]["file_type"]
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          file_name: string
          file_url?: string | null
          id?: string
          type?: Database["public"]["Enums"]["file_type"]
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          file_name?: string
          file_url?: string | null
          id?: string
          type?: Database["public"]["Enums"]["file_type"]
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          analysis_mode: string | null
          analysis_status: string | null
          color_hex: string
          created_at: string
          creator_id: string
          csv_zip_url: string | null
          description: string | null
          hitl_stage: string | null
          id: string
          input_zip_url: string | null
          name: string
          org_id: string | null
          result_zip_url: string | null
          status: Database["public"]["Enums"]["case_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          analysis_mode?: string | null
          analysis_status?: string | null
          color_hex?: string
          created_at?: string
          creator_id: string
          csv_zip_url?: string | null
          description?: string | null
          hitl_stage?: string | null
          id?: string
          input_zip_url?: string | null
          name: string
          org_id?: string | null
          result_zip_url?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          analysis_mode?: string | null
          analysis_status?: string | null
          color_hex?: string
          created_at?: string
          creator_id?: string
          csv_zip_url?: string | null
          description?: string | null
          hitl_stage?: string | null
          id?: string
          input_zip_url?: string | null
          name?: string
          org_id?: string | null
          result_zip_url?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          case_id: string
          created_at: string
          id: string
          payload: Json | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          idempotency_key: string | null
          input_url: string
          session_id: string | null
          status: string
          task: string
          updated_at: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id: string
          idempotency_key?: string | null
          input_url: string
          session_id?: string | null
          status?: string
          task: string
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          input_url?: string
          session_id?: string | null
          status?: string
          task?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_period_pages_used: number
          current_period_start: string | null
          full_name: string
          id: string
          organization_name: string
          phone_number: string | null
          subscription_expires_at: string | null
          subscription_granted_at: string | null
          subscription_granted_by: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_pages_used?: number
          current_period_start?: string | null
          full_name: string
          id?: string
          organization_name: string
          phone_number?: string | null
          subscription_expires_at?: string | null
          subscription_granted_at?: string | null
          subscription_granted_by?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_pages_used?: number
          current_period_start?: string | null
          full_name?: string
          id?: string
          organization_name?: string
          phone_number?: string | null
          subscription_expires_at?: string | null
          subscription_granted_at?: string | null
          subscription_granted_by?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_history: {
        Row: {
          created_at: string | null
          id: string
          pages_processed: number
          period_end: string
          period_start: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pages_processed?: number
          period_end: string
          period_start: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pages_processed?: number
          period_end?: string
          period_start?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_job_update: {
        Args: {
          p_error: string
          p_id: string
          p_idempotency_key: string
          p_input_url: string
          p_session_id: string
          p_status: string
          p_task: string
          p_updated_at: string
          p_url: string
          p_user_id: string
        }
        Returns: {
          created_at: string | null
          error: string | null
          id: string
          idempotency_key: string | null
          input_url: string
          session_id: string | null
          status: string
          task: string
          updated_at: string | null
          url: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_subscription_status: {
        Args: { _user_id: string }
        Returns: {
          expires_at: string
          is_active: boolean
          pages_remaining: number
          tier: Database["public"]["Enums"]["subscription_tier"]
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_details?: Json
          p_target_user_id: string
        }
        Returns: string
      }
      reset_usage_period: { Args: never; Returns: undefined }
      track_page_usage: {
        Args: { p_pages_processed: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      case_status:
        | "Active"
        | "Processing"
        | "Ready"
        | "Archived"
        | "Failed"
        | "Timeout"
        | "Review"
      event_type:
        | "created"
        | "files_uploaded"
        | "analysis_submitted"
        | "analysis_ready"
        | "note_added"
      file_type: "upload" | "result"
      subscription_tier: "free" | "starter" | "professional" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      case_status: [
        "Active",
        "Processing",
        "Ready",
        "Archived",
        "Failed",
        "Timeout",
        "Review",
      ],
      event_type: [
        "created",
        "files_uploaded",
        "analysis_submitted",
        "analysis_ready",
        "note_added",
      ],
      file_type: ["upload", "result"],
      subscription_tier: ["free", "starter", "professional", "enterprise"],
    },
  },
} as const
