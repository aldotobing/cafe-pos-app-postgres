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
        Relationships: [
          {
            foreignKeyName: "cafes_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
          name: string | null
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
          name?: string | null
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
          name?: string | null
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
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "stock_mutations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "stock_mutations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          role: Database["public"]["Enums"]["user_role"]
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
          {
            foreignKeyName: "user_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
          menu_id: string | null
          product_base_price: number | null
          product_name: string | null
          sku: string | null
          stock_quantity: number | null
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
        ]
      }
    }
    Functions: {
      generate_transaction_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_cafe_settings: {
        Args: {
          p_cafe_id: number
        }
        Returns: {
          name: string
          tax_percent: number
          service_percent: number
          currency: string
        }[]
      }
      get_current_user_cafe: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_cafe_ids: {
        Args: Record<PropertyKey, never>
        Returns: {
          cafe_id: number
        }[]
      }
      handle_stock_mutation: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      is_cafe_owner: {
        Args: {
          p_cafe_id: number
          p_user_id: string
        }
        Returns: boolean
      }
      recalculate_transaction_total: {
        Args: {
          p_transaction_id: string
        }
        Returns: undefined
      }
      soft_delete: {
        Args: {
          table_name: string
          row_id: string
        }
        Returns: boolean
      }
      soft_restore: {
        Args: {
          table_name: string
          row_id: string
        }
        Returns: boolean
      }
      trigger_set_updated_at_and_version: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      user_belongs_to_cafe: {
        Args: {
          cafe_id: number
        }
        Returns: boolean
      }
    }
    Enums: {
      payment_method: "Tunai" | "QRIS" | "Debit" | "Transfer"
      stock_mutation_type: "in" | "out" | "adjustment" | "opname"
      user_role: "superadmin" | "admin" | "cashier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
