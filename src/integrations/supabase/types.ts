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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      encounter_documents: {
        Row: {
          encounter_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          kind: string
          ocr_confidence: number | null
          ocr_provider: string | null
          ocr_structured: Json | null
          ocr_text: string | null
          processing_status: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          encounter_id: string
          file_name: string
          file_size?: number
          file_type: string
          id?: string
          kind?: string
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_structured?: Json | null
          ocr_text?: string | null
          processing_status?: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          encounter_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          kind?: string
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_structured?: Json | null
          ocr_text?: string | null
          processing_status?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounter_documents_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          ai_summary: string | null
          answers: Json
          ayush: Json
          care_mode: Database["public"]["Enums"]["care_mode"] | null
          chief_complaint: string | null
          chief_complaint_label: string | null
          completed_at: string | null
          consent: Json | null
          created_at: string
          display_token: string
          doctor_id: string | null
          doctor_notes: string | null
          id: string
          identity_verification: Json | null
          intake_seconds: number | null
          is_demo: boolean
          kiosk_id: string | null
          kiosk_token: string
          language: string | null
          language_label: string | null
          patient: Json | null
          priority: string
          red_flags: Json
          status: Database["public"]["Enums"]["encounter_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          answers?: Json
          ayush?: Json
          care_mode?: Database["public"]["Enums"]["care_mode"] | null
          chief_complaint?: string | null
          chief_complaint_label?: string | null
          completed_at?: string | null
          consent?: Json | null
          created_at?: string
          display_token: string
          doctor_id?: string | null
          doctor_notes?: string | null
          id?: string
          identity_verification?: Json | null
          intake_seconds?: number | null
          is_demo?: boolean
          kiosk_id?: string | null
          kiosk_token: string
          language?: string | null
          language_label?: string | null
          patient?: Json | null
          priority?: string
          red_flags?: Json
          status?: Database["public"]["Enums"]["encounter_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          answers?: Json
          ayush?: Json
          care_mode?: Database["public"]["Enums"]["care_mode"] | null
          chief_complaint?: string | null
          chief_complaint_label?: string | null
          completed_at?: string | null
          consent?: Json | null
          created_at?: string
          display_token?: string
          doctor_id?: string | null
          doctor_notes?: string | null
          id?: string
          identity_verification?: Json | null
          intake_seconds?: number | null
          is_demo?: boolean
          kiosk_id?: string | null
          kiosk_token?: string
          language?: string | null
          language_label?: string | null
          patient?: Json | null
          priority?: string
          red_flags?: Json
          status?: Database["public"]["Enums"]["encounter_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      care_mode: "allopathy" | "ayush"
      encounter_status:
        | "IN_PROGRESS"
        | "READY_FOR_DOCTOR"
        | "URGENT"
        | "IN_CONSULT"
        | "COMPLETED"
        | "CANCELLED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      care_mode: ["allopathy", "ayush"],
      encounter_status: [
        "IN_PROGRESS",
        "READY_FOR_DOCTOR",
        "URGENT",
        "IN_CONSULT",
        "COMPLETED",
        "CANCELLED",
      ],
    },
  },
} as const
