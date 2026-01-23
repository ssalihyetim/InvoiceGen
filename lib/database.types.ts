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
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          company_id: string
          created_at: string | null
          discount_percentage: number
          id: string
          min_quantity: number | null
          product_type: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          discount_percentage: number
          id?: string
          min_quantity?: number | null
          product_type?: string | null
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          discount_percentage?: number
          id?: string
          min_quantity?: number | null
          product_type?: string | null
          valid_from?: string
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
        ]
      }
      import_history: {
        Row: {
          created_at: string | null
          error_log: Json | null
          failed_imports: number
          file_name: string
          file_url: string
          id: string
          successful_imports: number
          total_rows: number
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          failed_imports?: number
          file_name: string
          file_url: string
          id?: string
          successful_imports?: number
          total_rows?: number
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          failed_imports?: number
          file_name?: string
          file_url?: string
          id?: string
          successful_imports?: number
          total_rows?: number
        }
        Relationships: []
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
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: string | null
          created_at: string | null
          currency: string
          description: string | null
          diameter: string | null
          embedding: string | null
          id: string
          material: string | null
          pressure_class: string | null
          product_code: string
          product_code_normalized: string | null
          product_features: string | null
          product_subtype: string | null
          product_type: string
          search_text: string | null
          search_vector: unknown
          size_measurement: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          brand?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          diameter?: string | null
          embedding?: string | null
          id?: string
          material?: string | null
          pressure_class?: string | null
          product_code: string
          product_code_normalized?: string | null
          product_features?: string | null
          product_subtype?: string | null
          product_type: string
          search_text?: string | null
          search_vector?: unknown
          size_measurement?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          brand?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          diameter?: string | null
          embedding?: string | null
          id?: string
          material?: string | null
          pressure_class?: string | null
          product_code?: string
          product_code_normalized?: string | null
          product_features?: string | null
          product_subtype?: string | null
          product_type?: string
          search_text?: string | null
          search_vector?: unknown
          size_measurement?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          ai_matched: boolean | null
          created_at: string | null
          currency: string
          discount_amount: number
          discount_percentage: number
          id: string
          original_request: string | null
          product_id: string
          quantity: number
          quotation_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          ai_matched?: boolean | null
          created_at?: string | null
          currency?: string
          discount_amount?: number
          discount_percentage?: number
          id?: string
          original_request?: string | null
          product_id: string
          quantity: number
          quotation_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          ai_matched?: boolean | null
          created_at?: string | null
          currency?: string
          discount_amount?: number
          discount_percentage?: number
          id?: string
          original_request?: string | null
          product_id?: string
          quantity?: number
          quotation_id?: string
          subtotal?: number
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
        ]
      }
      quotations: {
        Row: {
          company_id: string
          created_at: string | null
          discount_amount: number
          final_amount: number
          id: string
          notes: string | null
          quotation_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quotation_status"] | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          discount_amount?: number
          final_amount?: number
          id?: string
          notes?: string | null
          quotation_number: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          discount_amount?: number
          final_amount?: number
          id?: string
          notes?: string | null
          quotation_number?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      v_product_data_quality: {
        Row: {
          brand_fill_rate: number | null
          features_fill_rate: number | null
          has_brand: number | null
          has_features: number | null
          has_material: number | null
          has_pressure: number | null
          has_size: number | null
          has_subtype: number | null
          material_fill_rate: number | null
          pressure_fill_rate: number | null
          size_fill_rate: number | null
          subtype_fill_rate: number | null
          total_products: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      extract_size_numbers: { Args: { text_input: string }; Returns: string }
      generate_quotation_number: { Args: never; Returns: string }
    }
    Enums: {
      quotation_status: "draft" | "sent" | "approved" | "rejected"
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
      quotation_status: ["draft", "sent", "approved", "rejected"],
    },
  },
} as const
