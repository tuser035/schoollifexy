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
      admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      career_counseling: {
        Row: {
          admin_id: string
          content: string
          counseling_date: string
          counselor_name: string
          created_at: string | null
          id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          content: string
          counseling_date?: string
          counselor_name: string
          created_at?: string | null
          id?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          content?: string
          counseling_date?: string
          counselor_name?: string
          created_at?: string | null
          id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      demerits: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_url: string | null
          reason: string | null
          score: number
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          reason?: string | null
          score?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          reason?: string | null
          score?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demerits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "demerits_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      merits: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_url: string | null
          reason: string | null
          score: number
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          reason?: string | null
          score?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          reason?: string | null
          score?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "merits_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          month: number
          reason: string | null
          student_id: string | null
          teacher_id: string | null
          year: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          month: number
          reason?: string | null
          student_id?: string | null
          teacher_id?: string | null
          year: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          month?: number
          reason?: string | null
          student_id?: string | null
          teacher_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "monthly_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class: number
          created_at: string | null
          dept_code: string | null
          gmail: string | null
          grade: number
          id: string
          name: string
          number: number
          parents_call1: string | null
          parents_call2: string | null
          password_hash: string
          student_call: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          class: number
          created_at?: string | null
          dept_code?: string | null
          gmail?: string | null
          grade: number
          id?: string
          name: string
          number: number
          parents_call1?: string | null
          parents_call2?: string | null
          password_hash?: string
          student_call?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          class?: number
          created_at?: string | null
          dept_code?: string | null
          gmail?: string | null
          grade?: number
          id?: string
          name?: string
          number?: number
          parents_call1?: string | null
          parents_call2?: string | null
          password_hash?: string
          student_call?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_dept_code_fkey"
            columns: ["dept_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["code"]
          },
        ]
      }
      teachers: {
        Row: {
          call_t: string
          class: number | null
          created_at: string | null
          dept_code: string | null
          grade: number | null
          id: string
          is_homeroom: boolean | null
          name: string
          password_hash: string
          teacher_email: string
          updated_at: string | null
        }
        Insert: {
          call_t: string
          class?: number | null
          created_at?: string | null
          dept_code?: string | null
          grade?: number | null
          id?: string
          is_homeroom?: boolean | null
          name: string
          password_hash?: string
          teacher_email: string
          updated_at?: string | null
        }
        Update: {
          call_t?: string
          class?: number | null
          created_at?: string | null
          dept_code?: string | null
          grade?: number | null
          id?: string
          is_homeroom?: boolean | null
          name?: string
          password_hash?: string
          teacher_email?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_dept_code_fkey"
            columns: ["dept_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_counseling_records: {
        Args: { admin_id_input: string; student_id_input: string }
        Returns: {
          content: string
          counseling_date: string
          counselor_name: string
          created_at: string
          id: string
        }[]
      }
      admin_get_demerit_details: {
        Args: { admin_id_input: string; student_id_input: string }
        Returns: {
          category: string
          created_at: string
          image_url: string
          reason: string
          score: number
          teacher_name: string
        }[]
      }
      admin_get_demerits: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          search_text?: string
        }
        Returns: {
          category: string
          created_at: string
          reason: string
          score: number
          student_class: number
          student_grade: number
          student_name: string
          teacher_name: string
        }[]
      }
      admin_get_homeroom: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
        }
        Returns: {
          class: number
          grade: number
          teacher_name: string
          year: number
        }[]
      }
      admin_get_leaderboard: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          year_input?: number
        }
        Returns: {
          class: number
          demerits: number
          grade: number
          merits: number
          monthly: number
          name: string
          number: number
          student_id: string
          total: number
        }[]
      }
      admin_get_merit_details: {
        Args: { admin_id_input: string; student_id_input: string }
        Returns: {
          category: string
          created_at: string
          image_url: string
          reason: string
          score: number
          teacher_name: string
        }[]
      }
      admin_get_merits: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          search_text?: string
        }
        Returns: {
          category: string
          created_at: string
          reason: string
          score: number
          student_class: number
          student_grade: number
          student_name: string
          teacher_name: string
        }[]
      }
      admin_get_monthly: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          search_text?: string
        }
        Returns: {
          category: string
          created_at: string
          image_url: string
          month: number
          reason: string
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          teacher_name: string
          year: number
        }[]
      }
      admin_get_monthly_details: {
        Args: { admin_id_input: string; student_id_input: string }
        Returns: {
          category: string
          created_at: string
          image_url: string
          reason: string
          teacher_name: string
        }[]
      }
      admin_get_student_points_by_class: {
        Args: { admin_id_input: string; p_class: number; p_grade: number }
        Returns: {
          demerits: number
          merits: number
          monthly: number
          name: string
          student_id: string
          total: number
        }[]
      }
      admin_get_students: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          search_text?: string
        }
        Returns: {
          class: number
          dept_name: string
          gmail: string
          grade: number
          name: string
          number: number
          student_call: string
          student_id: string
        }[]
      }
      admin_get_teachers: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          search_text?: string
        }
        Returns: {
          call_t: string
          class: number
          dept_name: string
          grade: number
          is_homeroom: boolean
          name: string
          teacher_email: string
        }[]
      }
      insert_monthly_recommendation: {
        Args: {
          category_input: string
          image_url_input: string
          month_input: number
          reason_input: string
          student_id_input: string
          teacher_id_input: string
          year_input: number
        }
        Returns: string
      }
      set_admin_session: {
        Args: { admin_id_input: string }
        Returns: undefined
      }
      set_student_session: {
        Args: { student_id_input: string }
        Returns: undefined
      }
      set_teacher_session: {
        Args: { teacher_id_input: string }
        Returns: undefined
      }
      update_admin_password: {
        Args: { admin_id_input: string; new_password: string }
        Returns: boolean
      }
      update_student_password: {
        Args: { new_password: string; student_id_input: string }
        Returns: boolean
      }
      update_teacher_password: {
        Args: { new_password: string; teacher_id_input: string }
        Returns: boolean
      }
      verify_admin_password: {
        Args: { email_input: string; password_input: string }
        Returns: boolean
      }
      verify_student_password: {
        Args: { password_input: string; student_id_input: string }
        Returns: boolean
      }
      verify_teacher_password: {
        Args: { password_input: string; phone_input: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
