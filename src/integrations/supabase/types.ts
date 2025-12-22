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
          call_a: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          call_a?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          call_a?: string | null
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
      book_reports: {
        Row: {
          book_title: string
          content: string
          created_at: string
          id: string
          points_awarded: number | null
          points_awarded_at: string | null
          points_awarded_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          book_title: string
          content: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          points_awarded_at?: string | null
          points_awarded_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          book_title?: string
          content?: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          points_awarded_at?: string | null
          points_awarded_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "career_counseling_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
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
          attachment_urls: string[] | null
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
          attachment_urls?: string[] | null
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
          attachment_urls?: string[] | null
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
      mindtalk_alerts: {
        Row: {
          created_at: string
          dangerous_word_count: number
          id: string
          last_alert_count: number | null
          last_alert_sent_at: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dangerous_word_count?: number
          id?: string
          last_alert_count?: number | null
          last_alert_sent_at?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dangerous_word_count?: number
          id?: string
          last_alert_count?: number | null
          last_alert_sent_at?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mindtalk_keywords: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          keyword: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          keyword: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          keyword?: string
          updated_at?: string
        }
        Relationships: []
      }
      mindtalk_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          student_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          student_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          student_id?: string
        }
        Relationships: []
      }
      mindtalk_music: {
        Row: {
          category: string
          created_at: string
          duration_seconds: number | null
          file_path: string
          id: string
          is_active: boolean
          play_count: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          id?: string
          is_active?: boolean
          play_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          id?: string
          is_active?: boolean
          play_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mindtalk_play_history: {
        Row: {
          id: string
          music_id: string
          played_at: string
          student_id: string
        }
        Insert: {
          id?: string
          music_id: string
          played_at?: string
          student_id: string
        }
        Update: {
          id?: string
          music_id?: string
          played_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mindtalk_play_history_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "mindtalk_music"
            referencedColumns: ["id"]
          },
        ]
      }
      mindtalk_playlists: {
        Row: {
          created_at: string
          id: string
          music_ids: string[]
          playlist_name: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          music_ids?: string[]
          playlist_name: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          music_ids?: string[]
          playlist_name?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
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
      poems: {
        Row: {
          collection_id: string
          content: string
          created_at: string
          id: string
          poem_order: number
          title: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          content: string
          created_at?: string
          id?: string
          poem_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          content?: string
          created_at?: string
          id?: string
          poem_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poems_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "poetry_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      poetry_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          hashtags: string[] | null
          id: string
          is_published: boolean | null
          poem_count: number | null
          poet: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_published?: boolean | null
          poem_count?: number | null
          poet: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_published?: boolean | null
          poem_count?: number | null
          poet?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      poetry_completion_bonus: {
        Row: {
          bonus_points: number
          collection_id: string
          completed_at: string
          id: string
          student_id: string
        }
        Insert: {
          bonus_points?: number
          collection_id: string
          completed_at?: string
          id?: string
          student_id: string
        }
        Update: {
          bonus_points?: number
          collection_id?: string
          completed_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poetry_completion_bonus_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "poetry_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      poetry_reading_history: {
        Row: {
          collection_id: string
          completed_at: string | null
          id: string
          is_completed: boolean | null
          last_poem_order: number | null
          started_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_poem_order?: number | null
          started_at?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_poem_order?: number | null
          started_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poetry_reading_history_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "poetry_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      poetry_recordings: {
        Row: {
          collection_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          poem_id: string
          points_awarded: number | null
          recording_url: string
          student_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          poem_id: string
          points_awarded?: number | null
          recording_url: string
          student_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          poem_id?: string
          points_awarded?: number | null
          recording_url?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poetry_recordings_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "poetry_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poetry_recordings_poem_id_fkey"
            columns: ["poem_id"]
            isOneToOne: false
            referencedRelation: "poems"
            referencedColumns: ["id"]
          },
        ]
      }
      recommended_books: {
        Row: {
          author: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          quarter: number
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          author?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          quarter: number
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          author?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          quarter?: number
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      storybook_page_bookmarks: {
        Row: {
          book_id: string
          created_at: string
          id: string
          page_number: number
          student_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          page_number: number
          student_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          page_number?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storybook_page_bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "storybooks"
            referencedColumns: ["id"]
          },
        ]
      }
      storybook_pages: {
        Row: {
          book_id: string
          created_at: string
          id: string
          image_url: string | null
          page_number: number
          text_content: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          page_number: number
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          page_number?: number
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storybook_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "storybooks"
            referencedColumns: ["id"]
          },
        ]
      }
      storybook_reading_history: {
        Row: {
          book_id: string
          completed_at: string | null
          id: string
          is_completed: boolean | null
          last_page: number | null
          started_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_page?: number | null
          started_at?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_page?: number | null
          started_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storybook_reading_history_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "storybooks"
            referencedColumns: ["id"]
          },
        ]
      }
      storybook_reviews: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          is_public: boolean | null
          rating: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          rating?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          rating?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storybook_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "storybooks"
            referencedColumns: ["id"]
          },
        ]
      }
      storybooks: {
        Row: {
          book_number: number
          category: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_published: boolean | null
          page_count: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          book_number: number
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean | null
          page_count?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          book_number?: number
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean | null
          page_count?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          is_admin: boolean | null
          is_counselor: boolean | null
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
          is_admin?: boolean | null
          is_counselor?: boolean | null
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
          is_admin?: boolean | null
          is_counselor?: boolean | null
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
      admin_award_book_report_points: {
        Args: {
          admin_id_input: string
          points_input: number
          report_id_input: string
        }
        Returns: boolean
      }
      admin_delete_all_from_table: {
        Args: { admin_id_input: string; table_name_input: string }
        Returns: number
      }
      admin_delete_email_template: {
        Args: { admin_id_input: string; template_id_input: string }
        Returns: boolean
      }
      admin_delete_poetry_collection: {
        Args: { admin_id_input: string; collection_id_input: string }
        Returns: boolean
      }
      admin_delete_recommended_book: {
        Args: { admin_id_input: string; book_id_input: string }
        Returns: boolean
      }
      admin_delete_storybook: {
        Args: { admin_id_input: string; book_id_input: string }
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
      admin_get_all_counseling_records: {
        Args: { admin_id_input: string }
        Returns: {
          attachment_url: string
          content: string
          counseling_date: string
          counselor_name: string
          created_at: string
          id: string
          student_id: string
          student_name: string
        }[]
      }
      admin_get_book_report_leaderboard: {
        Args: {
          admin_id_input: string
          search_class?: number
          search_grade?: number
        }
        Returns: {
          class: number
          dept_name: string
          grade: number
          name: string
          number: number
          student_id: string
          total_points: number
          total_reports: number
        }[]
      }
      admin_get_book_reports: {
        Args: { admin_id_input: string; status_filter?: string }
        Returns: {
          book_title: string
          content: string
          created_at: string
          dept_name: string
          id: string
          points_awarded: number
          status: string
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
        }[]
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
          id: string
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
          opened: boolean
          opened_at: string
          recipient_email: string
          recipient_name: string
          recipient_student_id: string
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
          id: string
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
      admin_get_mindtalk_alerts: {
        Args: { admin_id_input: string }
        Returns: {
          dangerous_word_count: number
          id: string
          last_alert_sent_at: string
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
          updated_at: string
        }[]
      }
      admin_get_mindtalk_messages: {
        Args: { admin_id_input: string; student_id_input?: string }
        Returns: {
          content: string
          created_at: string
          id: string
          role: string
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
        }[]
      }
      admin_get_mindtalk_music: {
        Args: { admin_id_input: string }
        Returns: {
          category: string
          created_at: string
          duration_seconds: number
          file_path: string
          id: string
          is_active: boolean
          play_count: number
          title: string
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
          id: string
          image_url: string[]
          reason: string
          teacher_name: string
        }[]
      }
      admin_get_poems: {
        Args: { admin_id_input: string; collection_id_input: string }
        Returns: {
          content: string
          created_at: string
          id: string
          poem_order: number
          title: string
        }[]
      }
      admin_get_poetry_collections: {
        Args: { admin_id_input: string }
        Returns: {
          cover_image_url: string
          created_at: string
          hashtags: string[]
          id: string
          is_published: boolean
          poem_count: number
          poet: string
          title: string
        }[]
      }
      admin_get_popular_storybooks: {
        Args: { admin_id_input: string }
        Returns: {
          avg_rating: number
          book_id: string
          book_number: number
          completed_readers: number
          cover_image_url: string
          title: string
          total_readers: number
        }[]
      }
      admin_get_reading_statistics: {
        Args: { admin_id_input: string }
        Returns: {
          avg_rating: number
          completed_books: number
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
          total_books_read: number
          total_reviews: number
        }[]
      }
      admin_get_recommended_books: {
        Args: {
          admin_id_input: string
          quarter_filter?: number
          year_filter?: number
        }
        Returns: {
          author: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          quarter: number
          title: string
          year: number
        }[]
      }
      admin_get_storage_files: {
        Args: { admin_id_input: string; bucket_name_input: string }
        Returns: {
          bucket_id: string
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          original_filename: string
          owner: string
          updated_at: string
        }[]
      }
      admin_get_storybook_pages: {
        Args: { admin_id_input: string; book_id_input: string }
        Returns: {
          id: string
          image_url: string
          page_number: number
          text_content: string
        }[]
      }
      admin_get_storybooks: {
        Args: { admin_id_input: string }
        Returns: {
          book_number: number
          cover_image_url: string
          created_at: string
          description: string
          external_url: string
          id: string
          is_published: boolean
          page_count: number
          subtitle: string
          title: string
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
      admin_get_system_settings: {
        Args: { admin_id_input: string }
        Returns: {
          description: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }[]
      }
      admin_get_teachers: {
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
          id: string
          is_admin: boolean
          is_counselor: boolean
          is_homeroom: boolean
          name: string
          photo_url: string
          subject: string
          teacher_email: string
        }[]
      }
      admin_insert_career_counseling: {
        Args: {
          admin_id_input: string
          attachment_url_input?: string
          content_input: string
          counseling_date_input: string
          counselor_name_input: string
          student_id_input: string
        }
        Returns: string
      }
      admin_insert_department: {
        Args: { admin_id_input: string; code_input: string; name_input: string }
        Returns: string
      }
      admin_insert_email_history: {
        Args: {
          admin_id_input: string
          body_input: string
          recipient_email_input: string
          recipient_name_input: string
          recipient_student_id_input: string
          resend_email_id_input?: string
          sender_id_input: string
          sender_name_input: string
          sender_type_input: string
          subject_input: string
        }
        Returns: string
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
      admin_insert_email_template_bulk: {
        Args: {
          admin_id_input: string
          body_input: string
          subject_input: string
          template_type_input: string
          title_input: string
        }
        Returns: string
      }
      admin_insert_file_metadata: {
        Args: {
          admin_id_input: string
          bucket_name_input: string
          file_size_input?: number
          mime_type_input?: string
          original_filename_input: string
          storage_path_input: string
          uploaded_by_input?: string
        }
        Returns: string
      }
      admin_insert_poem: {
        Args: {
          admin_id_input: string
          collection_id_input: string
          content_input: string
          poem_order_input?: number
          title_input: string
        }
        Returns: string
      }
      admin_insert_poetry_collection: {
        Args: {
          admin_id_input: string
          cover_image_url_input?: string
          hashtags_input?: string[]
          poet_input: string
          title_input: string
        }
        Returns: string
      }
      admin_insert_recommended_book: {
        Args: {
          admin_id_input: string
          author_input?: string
          description_input?: string
          display_order_input?: number
          quarter_input?: number
          title_input: string
          year_input?: number
        }
        Returns: string
      }
      admin_insert_storybook: {
        Args: {
          admin_id_input: string
          book_number_input: number
          description_input?: string
          external_url_input?: string
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
          is_admin_input?: boolean
          is_counselor_input?: boolean
          is_homeroom_input?: boolean
          name_input: string
          subject_input?: string
          teacher_email_input: string
        }
        Returns: string
      }
      admin_insert_teacher_group: {
        Args: {
          admin_id_input: string
          group_name_input: string
          teacher_ids_input: string[]
        }
        Returns: string
      }
      admin_login: {
        Args: { email_or_phone_input: string; password_input: string }
        Returns: Json
      }
      admin_publish_poetry_collection: {
        Args: {
          admin_id_input: string
          collection_id_input: string
          publish_input: boolean
        }
        Returns: boolean
      }
      admin_publish_storybook: {
        Args: {
          admin_id_input: string
          book_id_input: string
          publish_input: boolean
        }
        Returns: boolean
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
      admin_update_recommended_book: {
        Args: {
          admin_id_input: string
          author_input?: string
          book_id_input: string
          description_input?: string
          display_order_input?: number
          is_active_input?: boolean
          title_input: string
        }
        Returns: boolean
      }
      admin_update_storybook_book_number: {
        Args: {
          admin_id_input: string
          book_id_input: string
          book_number_input: number
        }
        Returns: boolean
      }
      admin_update_storybook_category: {
        Args: {
          admin_id_input: string
          book_id_input: string
          category_input: string
        }
        Returns: boolean
      }
      admin_update_storybook_cover: {
        Args: {
          admin_id_input: string
          book_id_input: string
          cover_image_url_input: string
        }
        Returns: boolean
      }
      admin_update_storybook_description: {
        Args: {
          admin_id_input: string
          book_id_input: string
          description_input: string
        }
        Returns: boolean
      }
      admin_update_storybook_external_url: {
        Args: {
          admin_id_input: string
          book_id_input: string
          external_url_input: string
        }
        Returns: boolean
      }
      admin_update_storybook_page_count: {
        Args: {
          admin_id_input: string
          book_id_input: string
          page_count_input: number
        }
        Returns: boolean
      }
      admin_update_storybook_subtitle: {
        Args: {
          admin_id_input: string
          book_id_input: string
          subtitle_input: string
        }
        Returns: boolean
      }
      admin_update_storybook_title: {
        Args: {
          admin_id_input: string
          book_id_input: string
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
      admin_update_system_setting: {
        Args: {
          admin_id_input: string
          setting_key_input: string
          setting_value_input: string
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
          is_admin_input?: boolean
          is_counselor_input?: boolean
          is_homeroom_input: boolean
          name_input: string
          original_email_input: string
          subject_input: string
          teacher_email_input: string
        }
        Returns: boolean
      }
      admin_upsert_storybook_page: {
        Args: {
          admin_id_input: string
          book_id_input: string
          image_url_input?: string
          page_number_input: number
          text_content_input?: string
        }
        Returns: string
      }
      delete_counseling_record: {
        Args: { p_admin_id: string; p_record_id: string }
        Returns: boolean
      }
      delete_old_audit_logs: {
        Args: { p_admin_id: string; p_days_old?: number }
        Returns: number
      }
      get_audit_logs: {
        Args: { p_admin_id: string; p_limit?: number }
        Returns: {
          action_type: string
          created_at: string
          error_message: string
          id: string
          ip_address: string
          new_data: Json
          old_data: Json
          record_id: string
          status: string
          table_name: string
          user_agent: string
          user_id: string
          user_name: string
          user_type: string
        }[]
      }
      get_class_monthly_statistics: {
        Args: {
          class_input: number
          grade_input: number
          user_id_input: string
          year_input: number
        }
        Returns: {
          demerits_total: number
          merits_total: number
          month: number
        }[]
      }
      get_counseling_records: {
        Args: { p_admin_id: string; p_student_id: string }
        Returns: {
          attachment_url: string
          content: string
          counseling_date: string
          counselor_name: string
          created_at: string
          id: string
        }[]
      }
      get_mindtalk_danger_count: {
        Args: { student_id_input: string }
        Returns: number
      }
      get_mindtalk_music: {
        Args: never
        Returns: {
          category: string
          duration_seconds: number
          file_path: string
          id: string
          title: string
        }[]
      }
      get_public_reviews: {
        Args: { book_id_input: string }
        Returns: {
          content: string
          created_at: string
          id: string
          rating: number
          student_id: string
          student_name: string
        }[]
      }
      get_system_setting: {
        Args: { setting_key_input: string }
        Returns: string
      }
      increment_music_play_count: {
        Args: { music_id_input: string }
        Returns: boolean
      }
      insert_counseling_record: {
        Args: {
          p_admin_id: string
          p_attachment_url?: string
          p_content: string
          p_counseling_date: string
          p_counselor_name: string
          p_student_id: string
        }
        Returns: string
      }
      insert_demerit: {
        Args: {
          p_category: string
          p_image_url: string[]
          p_reason: string
          p_score: number
          p_student_id: string
          p_teacher_id: string
        }
        Returns: string
      }
      insert_merit: {
        Args: {
          p_category: string
          p_image_url: string[]
          p_reason: string
          p_score: number
          p_student_id: string
          p_teacher_id: string
        }
        Returns: string
      }
      insert_monthly_recommendation: {
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
      is_admin_user: { Args: { user_id_input: string }; Returns: boolean }
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
      reset_admin_teacher_password_by_phone: {
        Args: {
          admin_id_input: string
          new_password: string
          phone_input: string
        }
        Returns: boolean
      }
      reset_teacher_password_by_phone: {
        Args: {
          admin_id_input: string
          new_password: string
          phone_input: string
        }
        Returns: boolean
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
      student_delete_playlist: {
        Args: { playlist_id_input: string; student_id_input: string }
        Returns: boolean
      }
      student_get_book_reports: {
        Args: { student_id_input: string }
        Returns: {
          book_title: string
          content: string
          created_at: string
          id: string
          points_awarded: number
          status: string
        }[]
      }
      student_get_current_recommended_books: {
        Args: { student_id_input: string }
        Returns: {
          author: string
          description: string
          display_order: number
          id: string
          title: string
        }[]
      }
      student_get_demerits: {
        Args: { student_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          image_url: string[]
          reason: string
          score: number
          student_id: string
          teacher_id: string
          teacher_name: string
        }[]
      }
      student_get_merits: {
        Args: { student_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          image_url: string[]
          reason: string
          score: number
          student_id: string
          teacher_id: string
          teacher_name: string
        }[]
      }
      student_get_mindtalk_messages: {
        Args: { student_id_input: string }
        Returns: {
          content: string
          created_at: string
          id: string
          role: string
        }[]
      }
      student_get_monthly: {
        Args: { student_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          image_url: string[]
          month: number
          reason: string
          student_id: string
          teacher_id: string
          teacher_name: string
          year: number
        }[]
      }
      student_get_page_bookmarks: {
        Args: { book_id_input: string; student_id_input: string }
        Returns: {
          created_at: string
          page_number: number
        }[]
      }
      student_get_play_history: {
        Args: { student_id_input: string }
        Returns: {
          category: string
          duration_seconds: number
          file_path: string
          last_played_at: string
          music_id: string
          title: string
        }[]
      }
      student_get_playlists: {
        Args: { student_id_input: string }
        Returns: {
          created_at: string
          id: string
          music_ids: string[]
          playlist_name: string
          updated_at: string
        }[]
      }
      student_get_poems: {
        Args: { collection_id_input: string; student_id_input: string }
        Returns: {
          content: string
          id: string
          poem_order: number
          title: string
        }[]
      }
      student_get_poetry_collections: {
        Args: { student_id_input: string }
        Returns: {
          cover_image_url: string
          hashtags: string[]
          id: string
          is_completed: boolean
          last_poem_order: number
          poem_count: number
          poet: string
          title: string
        }[]
      }
      student_get_poetry_recordings: {
        Args: { collection_id_input?: string; student_id_input: string }
        Returns: {
          collection_id: string
          collection_title: string
          created_at: string
          duration_seconds: number
          id: string
          poem_id: string
          poem_title: string
          points_awarded: number
          recording_url: string
        }[]
      }
      student_get_reviews: {
        Args: { student_id_input: string }
        Returns: {
          book_id: string
          book_title: string
          content: string
          created_at: string
          id: string
          is_public: boolean
          rating: number
        }[]
      }
      student_get_storybook_pages: {
        Args: { book_id_input: string; student_id_input: string }
        Returns: {
          id: string
          image_url: string
          page_number: number
          text_content: string
        }[]
      }
      student_get_storybooks: {
        Args: { student_id_input: string }
        Returns: {
          book_number: number
          category: string
          cover_image_url: string
          description: string
          external_url: string
          id: string
          is_completed: boolean
          last_page: number
          page_count: number
          subtitle: string
          title: string
        }[]
      }
      student_login: {
        Args: { password_input: string; student_id_input: string }
        Returns: Json
      }
      student_save_mindtalk_message: {
        Args: {
          content_input: string
          role_input: string
          student_id_input: string
        }
        Returns: string
      }
      student_save_play_history: {
        Args: { music_id_input: string; student_id_input: string }
        Returns: string
      }
      student_save_playlist: {
        Args: {
          music_ids_input: string[]
          playlist_name_input: string
          student_id_input: string
        }
        Returns: string
      }
      student_save_poetry_recording: {
        Args: {
          collection_id_input: string
          duration_seconds_input?: number
          poem_id_input: string
          recording_url_input: string
          student_id_input: string
        }
        Returns: Json
      }
      student_save_review: {
        Args: {
          book_id_input: string
          content_input: string
          rating_input: number
          student_id_input: string
        }
        Returns: string
      }
      student_submit_book_report: {
        Args: {
          book_title_input: string
          content_input: string
          student_id_input: string
        }
        Returns: string
      }
      student_toggle_page_bookmark: {
        Args: {
          book_id_input: string
          page_number_input: number
          student_id_input: string
        }
        Returns: boolean
      }
      student_update_playlist: {
        Args: {
          music_ids_input: string[]
          playlist_id_input: string
          playlist_name_input: string
          student_id_input: string
        }
        Returns: boolean
      }
      student_update_poetry_reading_progress: {
        Args: {
          collection_id_input: string
          is_completed_input?: boolean
          last_poem_order_input: number
          student_id_input: string
        }
        Returns: boolean
      }
      student_update_reading_progress: {
        Args: {
          book_id_input: string
          is_completed_input?: boolean
          last_page_input: number
          student_id_input: string
        }
        Returns: boolean
      }
      student_update_review_visibility: {
        Args: {
          is_public_input: boolean
          review_id_input: string
          student_id_input: string
        }
        Returns: boolean
      }
      teacher_delete_demerit: {
        Args: { demerit_id_input: string; teacher_id_input: string }
        Returns: boolean
      }
      teacher_delete_merit: {
        Args: { merit_id_input: string; teacher_id_input: string }
        Returns: boolean
      }
      teacher_delete_monthly: {
        Args: { monthly_id_input: string; teacher_id_input: string }
        Returns: boolean
      }
      teacher_delete_own_teacher_group: {
        Args: { group_id_input: string; teacher_id_input: string }
        Returns: boolean
      }
      teacher_get_email_history: {
        Args: { teacher_id_input: string }
        Returns: {
          attachment_urls: string[]
          body: string
          id: string
          recipient_email: string
          recipient_name: string
          recipient_student_id: string
          sent_at: string
          subject: string
        }[]
      }
      teacher_get_own_demerits: {
        Args: { teacher_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          reason: string
          score: number
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
        }[]
      }
      teacher_get_own_merits: {
        Args: { teacher_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          reason: string
          score: number
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
        }[]
      }
      teacher_get_own_monthly: {
        Args: { teacher_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          month: number
          reason: string
          student_class: number
          student_grade: number
          student_id: string
          student_name: string
          student_number: number
          year: number
        }[]
      }
      teacher_get_own_teacher_groups: {
        Args: { teacher_id_input: string }
        Returns: {
          created_at: string
          group_name: string
          id: string
          teacher_ids: string[]
          updated_at: string
        }[]
      }
      teacher_get_students_by_ids: {
        Args: { student_ids_input: string[]; teacher_id_input: string }
        Returns: {
          gmail: string
          name: string
          student_id: string
        }[]
      }
      teacher_login: {
        Args: { password_input: string; phone_input: string }
        Returns: Json
      }
      teacher_update_demerit: {
        Args: {
          category_input: string
          demerit_id_input: string
          reason_input: string
          score_input: number
          teacher_id_input: string
        }
        Returns: boolean
      }
      teacher_update_merit: {
        Args: {
          category_input: string
          merit_id_input: string
          reason_input: string
          score_input: number
          teacher_id_input: string
        }
        Returns: boolean
      }
      teacher_update_monthly: {
        Args: {
          category_input: string
          monthly_id_input: string
          reason_input: string
          teacher_id_input: string
        }
        Returns: boolean
      }
      teacher_update_own_teacher_group_name: {
        Args: {
          group_id_input: string
          group_name_input: string
          teacher_id_input: string
        }
        Returns: boolean
      }
      update_admin_password: {
        Args: { admin_id_input: string; new_password: string }
        Returns: boolean
      }
      update_counseling_record: {
        Args: {
          p_admin_id: string
          p_attachment_url?: string
          p_content: string
          p_counseling_date: string
          p_counselor_name: string
          p_record_id: string
        }
        Returns: boolean
      }
      update_mindtalk_alert_sent: {
        Args: { student_id_input: string }
        Returns: boolean
      }
      update_mindtalk_danger_count: {
        Args: { increment_by?: number; student_id_input: string }
        Returns: {
          last_alert_count: number
          should_alert: boolean
          total_count: number
        }[]
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
