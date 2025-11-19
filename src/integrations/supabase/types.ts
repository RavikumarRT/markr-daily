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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          record_id: string
          scan_method: Database["public"]["Enums"]["scan_method"] | null
          session_id: string
          student_id: string | null
          student_usn: string
          timestamp: string | null
        }
        Insert: {
          record_id?: string
          scan_method?: Database["public"]["Enums"]["scan_method"] | null
          session_id: string
          student_id?: string | null
          student_usn: string
          timestamp?: string | null
        }
        Update: {
          record_id?: string
          scan_method?: Database["public"]["Enums"]["scan_method"] | null
          session_id?: string
          student_id?: string | null
          student_usn?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          academic_year: string
          created_at: string | null
          department: string | null
          end_time: string | null
          present_count: number | null
          session_id: string
          session_name: string
          session_type: Database["public"]["Enums"]["session_type"] | null
          start_time: string | null
          started_by: string
          status: Database["public"]["Enums"]["session_status"] | null
          total_students: number | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          department?: string | null
          end_time?: string | null
          present_count?: number | null
          session_id?: string
          session_name: string
          session_type?: Database["public"]["Enums"]["session_type"] | null
          start_time?: string | null
          started_by: string
          status?: Database["public"]["Enums"]["session_status"] | null
          total_students?: number | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          department?: string | null
          end_time?: string | null
          present_count?: number | null
          session_id?: string
          session_name?: string
          session_type?: Database["public"]["Enums"]["session_type"] | null
          start_time?: string | null
          started_by?: string
          status?: Database["public"]["Enums"]["session_status"] | null
          total_students?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "department_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          ip_address: string | null
          log_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          ip_address?: string | null
          log_id?: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          ip_address?: string | null
          log_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      department_heads: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          id: string
          name: string
          password: string
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          name: string
          password: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          name?: string
          password?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          academic_year: string
          batch_year: string | null
          branch: string | null
          dob: string | null
          email: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id_num: string
          mobile_num: string | null
          name: string
          photo: string | null
          student_id: string
          uploaded_at: string | null
          uploaded_by: string
          usn: string
        }
        Insert: {
          academic_year: string
          batch_year?: string | null
          branch?: string | null
          dob?: string | null
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id_num: string
          mobile_num?: string | null
          name: string
          photo?: string | null
          student_id?: string
          uploaded_at?: string | null
          uploaded_by: string
          usn: string
        }
        Update: {
          academic_year?: string
          batch_year?: string | null
          branch?: string | null
          dob?: string | null
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id_num?: string
          mobile_num?: string | null
          name?: string
          photo?: string | null
          student_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
          usn?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "department_heads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "user" | "admin"
      gender_type: "M" | "F" | "Other"
      scan_method: "barcode" | "manual" | "bulk"
      session_status: "active" | "paused" | "ended"
      session_type: "Placement" | "Workshop" | "Seminar" | "Class" | "Other"
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
      app_role: ["user", "admin"],
      gender_type: ["M", "F", "Other"],
      scan_method: ["barcode", "manual", "bulk"],
      session_status: ["active", "paused", "ended"],
      session_type: ["Placement", "Workshop", "Seminar", "Class", "Other"],
    },
  },
} as const
