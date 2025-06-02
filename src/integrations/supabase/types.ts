export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidate_interactions: {
        Row: {
          candidate_id: string
          created_at: string
          details: Json | null
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          recruiter_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          details?: Json | null
          id?: string
          interaction_date?: string
          interaction_type: string
          notes?: string | null
          recruiter_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          recruiter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_candidate_interactions_candidate_id"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          created_at: string
          education: string | null
          email: string
          experience_years: number | null
          first_name: string
          github_url: string | null
          id: string
          is_dummy: boolean | null
          last_name: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          resume_content: string | null
          resume_file_name: string | null
          resume_file_size: number | null
          resume_uploaded_at: string | null
          resume_url: string | null
          salary_expectation: number | null
          skills: string[] | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          education?: string | null
          email: string
          experience_years?: number | null
          first_name: string
          github_url?: string | null
          id?: string
          is_dummy?: boolean | null
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          resume_content?: string | null
          resume_file_name?: string | null
          resume_file_size?: number | null
          resume_uploaded_at?: string | null
          resume_url?: string | null
          salary_expectation?: number | null
          skills?: string[] | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          education?: string | null
          email?: string
          experience_years?: number | null
          first_name?: string
          github_url?: string | null
          id?: string
          is_dummy?: boolean | null
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          resume_content?: string | null
          resume_file_name?: string | null
          resume_file_size?: number | null
          resume_uploaded_at?: string | null
          resume_url?: string | null
          salary_expectation?: number | null
          skills?: string[] | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      demo_bookings: {
        Row: {
          calendar_event_id: string | null
          company: string
          created_at: string
          current_process: string | null
          demo_date: string
          demo_time: string
          email: string
          first_name: string
          id: string
          job_title: string
          last_name: string
          meeting_url: string | null
          specific_needs: string | null
          status: string | null
          team_size: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          calendar_event_id?: string | null
          company: string
          created_at?: string
          current_process?: string | null
          demo_date: string
          demo_time: string
          email: string
          first_name: string
          id?: string
          job_title: string
          last_name: string
          meeting_url?: string | null
          specific_needs?: string | null
          status?: string | null
          team_size?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string | null
          company?: string
          created_at?: string
          current_process?: string | null
          demo_date?: string
          demo_time?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string
          last_name?: string
          meeting_url?: string | null
          specific_needs?: string | null
          status?: string | null
          team_size?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pre_screens: {
        Row: {
          candidate_id: string
          created_at: string
          flags: Json
          id: string
          questions: Json
          recruiter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          flags?: Json
          id?: string
          questions?: Json
          recruiter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          flags?: Json
          id?: string
          questions?: Json
          recruiter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_screens_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_screens_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_profiles: {
        Row: {
          company: string
          company_size: string | null
          company_website: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          industry: string | null
          job_title: string | null
          last_name: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          industry?: string | null
          job_title?: string | null
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          industry?: string | null
          job_title?: string | null
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          id: string
          recruiter_id: string
          saved_at: string
        }
        Insert: {
          candidate_id: string
          id?: string
          recruiter_id: string
          saved_at?: string
        }
        Update: {
          candidate_id?: string
          id?: string
          recruiter_id?: string
          saved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_candidate_id"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_responses: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          pre_screen_id: string
          responses: Json
          submitted_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          pre_screen_id: string
          responses?: Json
          submitted_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          pre_screen_id?: string
          responses?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_responses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_responses_pre_screen_id_fkey"
            columns: ["pre_screen_id"]
            isOneToOne: false
            referencedRelation: "pre_screens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_candidate: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_recruiter: {
        Args: Record<PropertyKey, never>
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
