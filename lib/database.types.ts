export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          product_type: string
          diameter: string | null
          product_code: string
          base_price: number
          currency: string
          description: string | null
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_type: string
          diameter?: string | null
          product_code: string
          base_price: number
          currency?: string
          description?: string | null
          unit: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_type?: string
          diameter?: string | null
          product_code?: string
          base_price?: number
          currency?: string
          description?: string | null
          unit?: string
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          tax_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      discount_rules: {
        Row: {
          id: string
          company_id: string
          product_type: string | null
          discount_percentage: number
          min_quantity: number | null
          valid_from: string
          valid_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          product_type?: string | null
          discount_percentage: number
          min_quantity?: number | null
          valid_from: string
          valid_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          product_type?: string | null
          discount_percentage?: number
          min_quantity?: number | null
          valid_from?: string
          valid_until?: string | null
          created_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          company_id: string
          quotation_number: string
          status: 'draft' | 'sent' | 'approved' | 'rejected'
          total_amount: number
          discount_amount: number
          final_amount: number
          notes: string | null
          created_at: string
          updated_at: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          quotation_number: string
          status?: 'draft' | 'sent' | 'approved' | 'rejected'
          total_amount: number
          discount_amount: number
          final_amount: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          quotation_number?: string
          status?: 'draft' | 'sent' | 'approved' | 'rejected'
          total_amount?: number
          discount_amount?: number
          final_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          sent_at?: string | null
        }
      }
      quotation_items: {
        Row: {
          id: string
          quotation_id: string
          product_id: string
          quantity: number
          unit_price: number
          currency: string
          discount_percentage: number
          discount_amount: number
          subtotal: number
          ai_matched: boolean
          original_request: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quotation_id: string
          product_id: string
          quantity: number
          unit_price: number
          currency?: string
          discount_percentage: number
          discount_amount: number
          subtotal: number
          ai_matched?: boolean
          original_request?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quotation_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          currency?: string
          discount_percentage?: number
          discount_amount?: number
          subtotal?: number
          ai_matched?: boolean
          original_request?: string | null
          created_at?: string
        }
      }
      import_history: {
        Row: {
          id: string
          file_name: string
          file_url: string
          total_rows: number
          successful_imports: number
          failed_imports: number
          error_log: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          file_name: string
          file_url: string
          total_rows: number
          successful_imports: number
          failed_imports: number
          error_log?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          file_name?: string
          file_url?: string
          total_rows?: number
          successful_imports?: number
          failed_imports?: number
          error_log?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
