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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_number: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_number?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notes: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          company_id: string | null
          created_at: string | null
          discount_percentage: number
          id: string
          min_quantity: number | null
          product_type: string | null
          tenant_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          discount_percentage: number
          id?: string
          min_quantity?: number | null
          product_type?: string | null
          tenant_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          discount_percentage?: number
          id?: string
          min_quantity?: number | null
          product_type?: string | null
          tenant_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          quotation_id: string | null
          recipient_email: string
          resend_id: string | null
          status: string | null
          subject: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          quotation_id?: string | null
          recipient_email: string
          resend_id?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          quotation_id?: string | null
          recipient_email?: string
          resend_id?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          fetched_at: string | null
          id: string
          rate: number
          rate_date: string
          source: string | null
          target_currency: string
        }
        Insert: {
          base_currency?: string
          fetched_at?: string | null
          id?: string
          rate: number
          rate_date?: string
          source?: string | null
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string | null
          id?: string
          rate?: number
          rate_date?: string
          source?: string | null
          target_currency?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          note: string | null
          quotation_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          note?: string | null
          quotation_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          note?: string | null
          quotation_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string | null
          error_log: Json | null
          failed_imports: number | null
          file_name: string
          file_size: number | null
          id: string
          successful_imports: number | null
          tenant_id: string
          total_rows: number | null
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          failed_imports?: number | null
          file_name: string
          file_size?: number | null
          id?: string
          successful_imports?: number | null
          tenant_id: string
          total_rows?: number | null
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          failed_imports?: number | null
          file_name?: string
          file_size?: number | null
          id?: string
          successful_imports?: number | null
          tenant_id?: string
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      match_analytics: {
        Row: {
          confidence: number | null
          created_at: string | null
          customer_request: string
          execution_time: number | null
          id: string
          matched_product_id: string | null
          strategy: string
          tenant_id: string | null
          tokens_used: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          customer_request: string
          execution_time?: number | null
          id?: string
          matched_product_id?: string | null
          strategy: string
          tenant_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          customer_request?: string
          execution_time?: number | null
          id?: string
          matched_product_id?: string | null
          strategy?: string
          tenant_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_analytics_matched_product_id_fkey"
            columns: ["matched_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_analytics_matched_product_id_fkey"
            columns: ["matched_product_id"]
            isOneToOne: false
            referencedRelation: "products_searchable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          description: string | null
          diameter: string | null
          embedding: string | null
          id: string
          product_code: string | null
          product_type: string
          search_text: string | null
          search_vector: unknown
          tenant_id: string
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          diameter?: string | null
          embedding?: string | null
          id?: string
          product_code?: string | null
          product_type: string
          search_text?: string | null
          search_vector?: unknown
          tenant_id: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          diameter?: string | null
          embedding?: string | null
          id?: string
          product_code?: string | null
          product_type?: string
          search_text?: string | null
          search_vector?: unknown
          tenant_id?: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          ai_matched: boolean | null
          created_at: string | null
          currency: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          list_price: number | null
          manual_code: string | null
          manual_name: string | null
          manual_unit: string | null
          original_request: string | null
          product_id: string | null
          quantity: number
          quotation_id: string | null
          subtotal: number | null
          tenant_id: string
          total_price: number | null
          unit_price: number
        }
        Insert: {
          ai_matched?: boolean | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          list_price?: number | null
          manual_code?: string | null
          manual_name?: string | null
          manual_unit?: string | null
          original_request?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id?: string | null
          subtotal?: number | null
          tenant_id: string
          total_price?: number | null
          unit_price: number
        }
        Update: {
          ai_matched?: boolean | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          list_price?: number | null
          manual_code?: string | null
          manual_name?: string | null
          manual_unit?: string | null
          original_request?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id?: string | null
          subtotal?: number | null
          tenant_id?: string
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_searchable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          quotation_id: string | null
          snapshot: Json
          tenant_id: string | null
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          quotation_id?: string | null
          snapshot: Json
          tenant_id?: string | null
          version_number: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          quotation_id?: string | null
          snapshot?: Json
          tenant_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_versions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_amount: number | null
          final_amount: number | null
          id: string
          notes: string | null
          quotation_number: string
          status: string | null
          subtotal: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          final_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number: string
          status?: string | null
          subtotal?: number | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          final_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number?: string
          status?: string | null
          subtotal?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      products_searchable: {
        Row: {
          base_price: number | null
          currency: string | null
          description: string | null
          diameter: string | null
          extracted_numbers: string[] | null
          id: string | null
          product_code: string | null
          product_type: string | null
          search_text: string | null
          unit: string | null
        }
        Insert: {
          base_price?: number | null
          currency?: string | null
          description?: string | null
          diameter?: string | null
          extracted_numbers?: never
          id?: string | null
          product_code?: string | null
          product_type?: string | null
          search_text?: string | null
          unit?: string | null
        }
        Update: {
          base_price?: number | null
          currency?: string | null
          description?: string | null
          diameter?: string | null
          extracted_numbers?: never
          id?: string | null
          product_code?: string | null
          product_type?: string | null
          search_text?: string | null
          unit?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_tenant_with_admin:
        | {
            Args: {
              p_tenant_name: string
              p_tenant_slug: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_email?: string
              p_tenant_name: string
              p_tenant_slug: string
              p_user_id: string
            }
            Returns: string
          }
      expire_overdue_quotations: { Args: never; Returns: number }
      get_tenant_id: { Args: never; Returns: string }
      get_tenant_user_emails: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      notify_expiring_quotations: { Args: never; Returns: number }
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
