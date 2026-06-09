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
      cafe_settings: {
        Row: {
          address: string | null
          cafe_id: number
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          enable_push_notifications: boolean | null
          id: number
          logo_url: string | null
          name: string
          phone: string | null
          service_percent: number | null
          tagline: string | null
          tax_percent: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          address?: string | null
          cafe_id: number
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          enable_push_notifications?: boolean | null
          id?: number
          logo_url?: string | null
          name?: string
          phone?: string | null
          service_percent?: number | null
          tagline?: string | null
          tax_percent?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          address?: string | null
          cafe_id?: number
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          enable_push_notifications?: boolean | null
          id?: number
          logo_url?: string | null
          name?: string
          phone?: string | null
          service_percent?: number | null
          tagline?: string | null
          tax_percent?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_settings_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      cafes: {
        Row: {
          address: string | null
          created_at: string | null
          deleted_at: string | null
          id: number
          name: string
          owner_user_id: string
          phone: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          name: string
          owner_user_id: string
          phone?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          name?: string
          owner_user_id?: string
          phone?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          cafe_id: number
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          cafe_id: number
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          cafe_id?: number
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          cafe_id: number
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          cafe_id: number
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          cafe_id?: number
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          cafe_id: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          receipt_number: string | null
          receipt_url: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          amount: number
          cafe_id: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          amount?: number
          cafe_id?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu: {
        Row: {
          available: boolean | null
          base_unit: string | null
          cafe_id: number
          category: string
          category_id: string | null
          conversion_factor: number | null
          created_at: string | null
          deleted_at: string | null
          has_variants: boolean | null
          hpp_price: number
          id: string
          image_url: string | null
          margin_percent: number | null
          min_stock: number | null
          name: string
          price: number
          stock_quantity: number | null
          track_stock: boolean | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          available?: boolean | null
          base_unit?: string | null
          cafe_id: number
          category: string
          category_id?: string | null
          conversion_factor?: number | null
          created_at?: string | null
          deleted_at?: string | null
          has_variants?: boolean | null
          hpp_price?: number
          id?: string
          image_url?: string | null
          margin_percent?: number | null
          min_stock?: number | null
          name: string
          price: number
          stock_quantity?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          available?: boolean | null
          base_unit?: string | null
          cafe_id?: number
          category?: string
          category_id?: string | null
          conversion_factor?: number | null
          created_at?: string | null
          deleted_at?: string | null
          has_variants?: boolean | null
          hpp_price?: number
          id?: string
          image_url?: string | null
          margin_percent?: number | null
          min_stock?: number | null
          name?: string
          price?: number
          stock_quantity?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          cafe_id: number
          created_at: string | null
          data: Json | null
          deleted_at: string | null
          id: string
          is_pushed: boolean | null
          is_read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body: string
          cafe_id: number
          created_at?: string | null
          data?: Json | null
          deleted_at?: string | null
          id?: string
          is_pushed?: boolean | null
          is_read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string
          cafe_id?: number
          created_at?: string | null
          data?: Json | null
          deleted_at?: string | null
          id?: string
          is_pushed?: boolean | null
          is_read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          created_at: string | null
          deleted_at: string | null
          hpp_price: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          menu_id: string
          min_stock: number | null
          price: number | null
          sku: string | null
          stock_quantity: number | null
          track_stock: boolean | null
          updated_at: string | null
          variant_name: string
          version: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          deleted_at?: string | null
          hpp_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          menu_id: string
          min_stock?: number | null
          price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
          variant_name: string
          version?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          deleted_at?: string | null
          hpp_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          menu_id?: string
          min_stock?: number | null
          price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
          variant_name?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "v_products_with_variants"
            referencedColumns: ["menu_id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string | null
          cafe_id: number
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_subtotal: number | null
          name: string
          target_category_ids: string[] | null
          target_item_ids: string[] | null
          type: string
          updated_at: string | null
          value: number
        }
        Insert: {
          applies_to?: string | null
          cafe_id: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_subtotal?: number | null
          name: string
          target_category_ids?: string[] | null
          target_item_ids?: string[] | null
          type?: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          applies_to?: string | null
          cafe_id?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_subtotal?: number | null
          name?: string
          target_category_ids?: string[] | null
          target_item_ids?: string[] | null
          type?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          cafe_id: number
          created_at: string | null
          deleted_at: string | null
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          auth_key: string
          cafe_id: number
          created_at?: string | null
          deleted_at?: string | null
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          auth_key?: string
          cafe_id?: number
          created_at?: string | null
          deleted_at?: string | null
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_targets: {
        Row: {
          cafe_id: number
          created_at: string | null
          created_by: string | null
          daily_target: number | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          monthly_target: number | null
          notes: string | null
          target_date: string | null
          target_month: number | null
          target_year: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          cafe_id: number
          created_at?: string | null
          created_by?: string | null
          daily_target?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_target?: number | null
          notes?: string | null
          target_date?: string | null
          target_month?: number | null
          target_year?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          cafe_id?: number
          created_at?: string | null
          created_by?: string | null
          daily_target?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_target?: number | null
          notes?: string | null
          target_date?: string | null
          target_month?: number | null
          target_year?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_targets_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_mutations: {
        Row: {
          cafe_id: number
          created_at: string | null
          created_by: string | null
          hpp_price: number | null
          id: string
          menu_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["stock_mutation_type"]
          variant_id: string | null
        }
        Insert: {
          cafe_id: number
          created_at?: string | null
          created_by?: string | null
          hpp_price?: number | null
          id?: string
          menu_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["stock_mutation_type"]
          variant_id?: string | null
        }
        Update: {
          cafe_id?: number
          created_at?: string | null
          created_by?: string | null
          hpp_price?: number | null
          id?: string
          menu_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["stock_mutation_type"]
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_mutations_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_mutations_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_mutations_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "v_products_with_variants"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "stock_mutations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_mutations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_variant_details"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          discount: number | null
          id: string
          menu_id: string | null
          menu_name: string
          note: string | null
          price: number
          quantity: number
          transaction_id: string
          variant_id: string | null
          variant_name: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          discount?: number | null
          id?: string
          menu_id?: string | null
          menu_name: string
          note?: string | null
          price: number
          quantity: number
          transaction_id: string
          variant_id?: string | null
          variant_name?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          discount?: number | null
          id?: string
          menu_id?: string | null
          menu_name?: string
          note?: string | null
          price?: number
          quantity?: number
          transaction_id?: string
          variant_id?: string | null
          variant_name?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "v_products_with_variants"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_variant_details"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      transactions: {
        Row: {
          cafe_id: number
          cashier_name: string | null
          change_amount: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          id: string
          order_note: string | null
          payment_amount: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          service_charge: number
          subtotal: number
          tax_amount: number
          total_amount: number
          transaction_number: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          cafe_id: number
          cashier_name?: string | null
          change_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          order_note?: string | null
          payment_amount: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          service_charge: number
          subtotal: number
          tax_amount: number
          total_amount: number
          transaction_number: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          cafe_id?: number
          cashier_name?: string | null
          change_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          order_note?: string | null
          payment_amount?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          service_charge?: number
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          transaction_number?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          cafe_id: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          full_name: string
          is_active: boolean | null
          is_approved: boolean | null
          last_login: string | null
          role: Database["public"]["Enums"]["user_role"]
          trial_end_date: string | null
          trial_ended_notified: boolean | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          avatar_url?: string | null
          cafe_id?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          full_name: string
          is_active?: boolean | null
          is_approved?: boolean | null
          last_login?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          trial_end_date?: string | null
          trial_ended_notified?: boolean | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          avatar_url?: string | null
          cafe_id?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          full_name?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          last_login?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          trial_end_date?: string | null
          trial_ended_notified?: boolean | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_attribute_mappings: {
        Row: {
          attribute_value_id: string
          created_at: string | null
          variant_id: string
        }
        Insert: {
          attribute_value_id: string
          created_at?: string | null
          variant_id: string
        }
        Update: {
          attribute_value_id?: string
          created_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_mappings_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "variant_attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_mappings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_mappings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_variant_details"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      variant_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string | null
          value: string
          version: number | null
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          value: string
          version?: number | null
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          value?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "variant_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_attributes: {
        Row: {
          cafe_id: number
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          cafe_id: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          cafe_id?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_attributes_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_products_with_variants: {
        Row: {
          base_price: number | null
          category_id: string | null
          has_variants: boolean | null
          menu_id: string | null
          product_name: string | null
          total_variant_stock: number | null
          variant_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_variant_details: {
        Row: {
          attributes: Json | null
          barcode: string | null
          effective_price: number | null
          is_active: boolean | null
          menu_id: string | null
          min_stock: number | null
          product_base_price: number | null
          product_name: string | null
          sku: string | null
          stock_quantity: number | null
          track_stock: boolean | null
          variant_id: string | null
          variant_name: string | null
          variant_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "v_products_with_variants"
            referencedColumns: ["menu_id"]
          },
        ]
      }
    }
    Functions: {
      generate_transaction_number: { Args: never; Returns: string }
      get_cafe_settings: {
        Args: { p_cafe_id: number }
        Returns: {
          currency: string
          name: string
          service_percent: number
          tax_percent: number
        }[]
      }
      get_current_user_cafe: { Args: never; Returns: number }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_dashboard_stats: {
        Args: { p_cafe_id: number; p_date?: string }
        Returns: {
          low_stock_count: number
          out_of_stock_count: number
          today_avg_transaction: number
          today_revenue: number
          today_transactions: number
        }[]
      }
      get_expense_summary: {
        Args: { p_cafe_id: number; p_end_date: string; p_start_date: string }
        Returns: {
          category_id: string
          category_name: string
          total_amount: number
          transaction_count: number
        }[]
      }
      get_monthly_target: {
        Args: { p_cafe_id: number; p_month: number; p_year: number }
        Returns: number
      }
      get_profit_report: {
        Args: { p_cafe_id: number; p_end_date: string; p_start_date: string }
        Returns: {
          gross_profit: number
          profit_margin: number
          total_cogs: number
          total_revenue: number
        }[]
      }
      get_total_expenses: {
        Args: { p_cafe_id: number; p_end_date: string; p_start_date: string }
        Returns: number
      }
      get_user_cafe_ids: {
        Args: never
        Returns: {
          cafe_id: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      is_cafe_owner: {
        Args: { p_cafe_id: number; p_user_id: string }
        Returns: boolean
      }
      recalculate_transaction_total: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      soft_delete: {
        Args: { row_id: string; table_name: string }
        Returns: boolean
      }
      soft_restore: {
        Args: { row_id: string; table_name: string }
        Returns: boolean
      }
      user_belongs_to_cafe: { Args: { cafe_id: number }; Returns: boolean }
    }
    Enums: {
      notification_type:
        | "low_stock"
        | "out_of_stock"
        | "trial_expiring"
        | "new_transaction"
      payment_method: "Tunai" | "QRIS" | "Debit" | "Transfer"
      stock_mutation_type: "in" | "out" | "adjustment" | "opname"
      user_role: "superadmin" | "admin" | "cashier"
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
      notification_type: ["low_stock", "out_of_stock", "trial_expiring", "new_transaction"],
      payment_method: ["Tunai", "QRIS", "Debit", "Transfer"],
      stock_mutation_type: ["in", "out", "adjustment", "opname"],
      user_role: ["superadmin", "admin", "cashier"],
    },
  },
} as const
