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
      assets: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          project_id: string
          storage_path: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          storage_path: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          storage_path?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          app_version: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          failure_fingerprint: string
          id: string
          note: string | null
          payload: Json
          project_id: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          failure_fingerprint: string
          id?: string
          note?: string | null
          payload?: Json
          project_id?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          failure_fingerprint?: string
          id?: string
          note?: string | null
          payload?: Json
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          content: Json | null
          created_at: string
          event_id: string | null
          id: string
          order_index: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          event_id?: string | null
          id?: string
          order_index: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          event_id?: string | null
          id?: string
          order_index?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          background_location_id: string | null
          bgm_id: string | null
          created_at: string
          current_location_id: string | null
          description: string | null
          gallery_image_ids: Json | null
          id: string
          name: string
          organization_id: string | null
          playlist_id: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          background_location_id?: string | null
          bgm_id?: string | null
          created_at?: string
          current_location_id?: string | null
          description?: string | null
          gallery_image_ids?: Json | null
          id?: string
          name: string
          organization_id?: string | null
          playlist_id?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          background_location_id?: string | null
          bgm_id?: string | null
          created_at?: string
          current_location_id?: string | null
          description?: string | null
          gallery_image_ids?: Json | null
          id?: string
          name?: string
          organization_id?: string | null
          playlist_id?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          project_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_logs: {
        Row: {
          deleted_at: string
          entity_id: string
          entity_type: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          entity_id: string
          entity_type: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          associated_id: string | null
          character_ids: string[] | null
          created_at: string
          day: number | null
          description: string | null
          id: string
          location_ids: string[] | null
          month: number | null
          organization_ids: string[] | null
          time: number
          timeline_id: string
          title: string
          type: string
          updated_at: string
          year: number | null
        }
        Insert: {
          associated_id?: string | null
          character_ids?: string[] | null
          created_at?: string
          day?: number | null
          description?: string | null
          id?: string
          location_ids?: string[] | null
          month?: number | null
          organization_ids?: string[] | null
          time: number
          timeline_id: string
          title: string
          type: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          associated_id?: string | null
          character_ids?: string[] | null
          created_at?: string
          day?: number | null
          description?: string | null
          id?: string
          location_ids?: string[] | null
          month?: number | null
          organization_ids?: string[] | null
          time?: number
          timeline_id?: string
          title?: string
          type?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          bgm_id: string | null
          character_ids: Json | null
          conflicts: Json | null
          created_at: string
          culture: string | null
          description: string | null
          gallery_image_ids: Json | null
          history: string | null
          id: string
          name: string
          organization_ids: Json | null
          playlist_id: string | null
          project_id: string
          sublocation_ids: Json
          tags: Json | null
          updated_at: string
        }
        Insert: {
          bgm_id?: string | null
          character_ids?: Json | null
          conflicts?: Json | null
          created_at?: string
          culture?: string | null
          description?: string | null
          gallery_image_ids?: Json | null
          history?: string | null
          id?: string
          name: string
          organization_ids?: Json | null
          playlist_id?: string | null
          project_id: string
          sublocation_ids?: Json
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          bgm_id?: string | null
          character_ids?: Json | null
          conflicts?: Json | null
          created_at?: string
          culture?: string | null
          description?: string | null
          gallery_image_ids?: Json | null
          history?: string | null
          id?: string
          name?: string
          organization_ids?: Json | null
          playlist_id?: string | null
          project_id?: string
          sublocation_ids?: Json
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      metafield_assignments: {
        Row: {
          created_at: string
          definition_id: string
          entity_id: string
          entity_type: string
          id: string
          order_index: number
          project_id: string
          updated_at: string
          value_json: Json
        }
        Insert: {
          created_at?: string
          definition_id: string
          entity_id: string
          entity_type: string
          id?: string
          order_index?: number
          project_id: string
          updated_at?: string
          value_json?: Json
        }
        Update: {
          created_at?: string
          definition_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          order_index?: number
          project_id?: string
          updated_at?: string
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "metafield_assignments_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "metafield_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metafield_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      metafield_definitions: {
        Row: {
          created_at: string
          id: string
          name: string
          name_normalized: string
          project_id: string
          select_options_json: Json
          scope: string
          target_entity_kind: string | null
          updated_at: string
          value_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_normalized: string
          project_id: string
          select_options_json?: Json
          scope: string
          target_entity_kind?: string | null
          updated_at?: string
          value_type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_normalized?: string
          project_id?: string
          select_options_json?: Json
          scope?: string
          target_entity_kind?: string | null
          updated_at?: string
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "metafield_definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bgm_id: string | null
          created_at: string
          description: string | null
          gallery_image_ids: Json | null
          id: string
          location_ids: Json | null
          mission: string | null
          name: string
          playlist_id: string | null
          project_id: string
          tags: Json | null
          updated_at: string
        }
        Insert: {
          bgm_id?: string | null
          created_at?: string
          description?: string | null
          gallery_image_ids?: Json | null
          id?: string
          location_ids?: Json | null
          mission?: string | null
          name: string
          playlist_id?: string | null
          project_id: string
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          bgm_id?: string | null
          created_at?: string
          description?: string | null
          gallery_image_ids?: Json | null
          id?: string
          location_ids?: Json | null
          mission?: string | null
          name?: string
          playlist_id?: string | null
          project_id?: string
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_image_id: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrap_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      timelines: {
        Row: {
          center_value: number
          created_at: string
          description: string | null
          event_ids: string[]
          id: string
          name: string
          project_id: string
          start_value: number
          time_unit: string | null
          updated_at: string
        }
        Insert: {
          center_value?: number
          created_at?: string
          description?: string | null
          event_ids?: string[]
          id?: string
          name: string
          project_id: string
          start_value?: number
          time_unit?: string | null
          updated_at?: string
        }
        Update: {
          center_value?: number
          created_at?: string
          description?: string | null
          event_ids?: string[]
          id?: string
          name?: string
          project_id?: string
          start_value?: number
          time_unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_provider: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_login_at: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          auth_provider?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          last_login_at?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          auth_provider?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
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
