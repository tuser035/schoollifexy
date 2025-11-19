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
          name: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          status: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          status?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          status?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      career_counseling: {
        Row: {
          admin_id: string
          attachment_url: string | null
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
          attachment_url?: string | null
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
          attachment_url?: string | null
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
          image_url: string[] | null
          reason: string | null
          score: number
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url?: string[] | null
          reason?: string | null
          score?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string[] | null
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
      email_history: {
        Row: {
          body: string
          created_at: string | null
          id: string
          opened: boolean | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string
          recipient_student_id: string | null
          resend_email_id: string | null
          sender_id: string
          sender_name: string
          sender_type: string
          sent_at: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          opened?: boolean | null
          opened_at?: string | null
          recipient_email: string
          recipient_name: string
          recipient_student_id?: string | null
          resend_email_id?: string | null
          sender_id: string
          sender_name: string
          sender_type: string
          sent_at?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          opened?: boolean | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string
          recipient_student_id?: string | null
          resend_email_id?: string | null
          sender_id?: string
          sender_name?: string
          sender_type?: string
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          admin_id: string
          body: string
          created_at: string
          id: string
          subject: string
          template_type: Database["public"]["Enums"]["template_type"]
          title: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          body: string
          created_at?: string
          id?: string
          subject: string
          template_type?: Database["public"]["Enums"]["template_type"]
          title: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          body?: string
          created_at?: string
          id?: string
          subject?: string
          template_type?: Database["public"]["Enums"]["template_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_metadata: {
        Row: {
          bucket_name: string
          created_at: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          original_filename: string
          storage_path: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          bucket_name?: string
          created_at?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_filename: string
          storage_path: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string
          storage_path?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      merits: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_url: string[] | null
          reason: string | null
          score: number
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url?: string[] | null
          reason?: string | null
          score?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string[] | null
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
          image_url: string[] | null
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
          image_url?: string[] | null
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
          image_url?: string[] | null
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
      student_groups: {
        Row: {
          admin_id: string
          created_at: string | null
          group_name: string
          id: string
          student_ids: string[]
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          group_name: string
          id?: string
          student_ids: string[]
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          group_name?: string
          id?: string
          student_ids?: string[]
          updated_at?: string | null
        }
        Relationships: []
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
          photo_url: string | null
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
          photo_url?: string | null
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
          photo_url?: string | null
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
      teacher_groups: {
        Row: {
          admin_id: string
          created_at: string | null
          group_name: string
          id: string
          teacher_ids: string[]
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          group_name: string
          id?: string
          teacher_ids: string[]
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          group_name?: string
          id?: string
          teacher_ids?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          call_t: string
          class: number | null
          created_at: string | null
          department: string | null
          dept_code: string | null
          grade: number | null
          id: string
          is_homeroom: boolean | null
          name: string
          password_hash: string
          photo_url: string | null
          subject: string | null
          teacher_email: string
          updated_at: string | null
        }
        Insert: {
          call_t: string
          class?: number | null
          created_at?: string | null
          department?: string | null
          dept_code?: string | null
          grade?: number | null
          id?: string
          is_homeroom?: boolean | null
          name: string
          password_hash?: string
          photo_url?: string | null
          subject?: string | null
          teacher_email: string
          updated_at?: string | null
        }
        Update: {
          call_t?: string
          class?: number | null
          created_at?: string | null
          department?: string | null
          dept_code?: string | null
          grade?: number | null
          id?: string
          is_homeroom?: boolean | null
          name?: string
          password_hash?: string
          photo_url?: string | null
          subject?: string | null
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
      admin_delete_email_template: {
        Args: { admin_id_input: string; template_id_input: string }
        Returns: boolean
      }
      admin_delete_student: {
        Args: { admin_id_input: string; student_id_input: string }
        Returns: boolean
      }
      admin_delete_teacher: {
        Args: { admin_id_input: string; teacher_email_input: string }
        Returns: boolean
      }
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
          image_url: string[]
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
          image_url: string[]
          reason: string
          score: number
          student_class: number
          student_grade: number
          student_name: string
          teacher_name: string
        }[]
      }
      admin_get_email_history: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
          search_text?: string
        }
        Returns: {
          body: string
          id: string
          recipient_email: string
          recipient_name: string
          sender_name: string
          sender_type: string
          sent_at: string
          subject: string
        }[]
      }
      admin_get_email_templates: {
        Args: {
          admin_id_input: string
          filter_type?: Database["public"]["Enums"]["template_type"]
        }
        Returns: {
          admin_id: string
          body: string
          created_at: string
          id: string
          subject: string
          template_type: Database["public"]["Enums"]["template_type"]
          title: string
          updated_at: string
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
          image_url: string[]
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
          image_url: string[]
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
          image_url: string[]
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
          image_url: string[]
          reason: string
          teacher_name: string
        }[]
      }
      admin_get_student_groups: {
        Args: { admin_id_input: string }
        Returns: {
          created_at: string
          group_name: string
          id: string
          student_ids: string[]
          updated_at: string
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
          parents_call1: string
          parents_call2: string
          photo_url: string
          student_call: string
          student_id: string
        }[]
      }
      admin_get_teachers:
        | {
            Args: {
              admin_id_input: string
              search_class?: number
              search_department?: string
              search_dept_name?: string
              search_grade?: number
              search_homeroom?: string
              search_subject?: string
              search_text?: string
            }
            Returns: {
              call_t: string
              class: number
              department: string
              dept_name: string
              grade: number
              is_homeroom: boolean
              name: string
              photo_url: string
              subject: string
              teacher_email: string
            }[]
          }
        | {
            Args: {
              admin_id_input: string
              search_class?: number
              search_grade?: number
              search_text?: string
            }
            Returns: {
              call_t: string
              class: number
              department: string
              dept_name: string
              grade: number
              is_homeroom: boolean
              name: string
              subject: string
              teacher_email: string
            }[]
          }
      admin_insert_email_template: {
        Args: {
          admin_id_input: string
          body_input: string
          subject_input: string
          template_type_input: string
          title_input: string
        }
        Returns: string
      }
      admin_insert_student: {
        Args: {
          admin_id_input: string
          class_input: number
          dept_code_input?: string
          gmail_input?: string
          grade_input: number
          name_input: string
          number_input: number
          parents_call1_input?: string
          parents_call2_input?: string
          student_call_input?: string
          student_id_input: string
        }
        Returns: string
      }
      admin_insert_student_group: {
        Args: {
          admin_id_input: string
          group_name_input: string
          student_ids_input: string[]
        }
        Returns: string
      }
      admin_insert_teacher: {
        Args: {
          admin_id_input: string
          call_t_input: string
          class_input?: number
          department_input?: string
          dept_code_input?: string
          grade_input?: number
          is_homeroom_input?: boolean
          name_input: string
          subject_input?: string
          teacher_email_input: string
        }
        Returns: string
      }
      admin_login: {
        Args: { email_input: string; password_input: string }
        Returns: Json
      }
      admin_update_email_template: {
        Args: {
          admin_id_input: string
          body_input: string
          subject_input: string
          template_id_input: string
          template_type_input: string
          title_input: string
        }
        Returns: boolean
      }
      admin_update_student: {
        Args: {
          admin_id_input: string
          gmail_input: string
          name_input: string
          parents_call1_input: string
          parents_call2_input: string
          student_call_input: string
          student_id_input: string
        }
        Returns: boolean
      }
      admin_update_teacher: {
        Args: {
          admin_id_input: string
          call_t_input: string
          class_input: number
          department_input: string
          grade_input: number
          is_homeroom_input: boolean
          name_input: string
          original_email_input: string
          subject_input: string
          teacher_email_input: string
        }
        Returns: boolean
      }
      insert_monthly_recommendation:
        | {
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
        | {
            Args: {
              category_input: string
              image_url_input: string[]
              month_input: number
              reason_input: string
              student_id_input: string
              teacher_id_input: string
              year_input: number
            }
            Returns: string
          }
      log_audit_event: {
        Args: {
          p_action_type: string
          p_error_message?: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_status?: string
          p_table_name?: string
          p_user_id: string
          p_user_type: string
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
      student_login: {
        Args: { password_input: string; student_id_input: string }
        Returns: Json
      }
      teacher_login: {
        Args: { password_input: string; phone_input: string }
        Returns: Json
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
      template_type: "email" | "messenger"
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
      template_type: ["email", "messenger"],
    },
  },
} as const
