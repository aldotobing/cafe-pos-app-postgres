export type PaymentMethod = "Tunai" | "QRIS" | "Debit" | "Transfer"

export interface CafeSettings {
  id: number
  name: string
  tagline?: string
  address?: string
  phone?: string
  logoUrl?: string
  taxPercent: number
  servicePercent: number
  currency: "IDR"
  enablePushNotifications: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Category {
  id: string
  cafe_id?: number
  cafeId?: number
  name: string
  icon?: string
  color?: string
  sortOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  deleted_at?: string
}

export interface MenuItem {
  id: string
  cafe_id?: number
  name: string
  category: string
  categoryId?: string
  price: number
  available: boolean
  imageUrl?: string
  stockQuantity?: number
  hppPrice?: number
  marginPercent?: number
  minStock?: number
  trackStock?: boolean
  hasVariants?: boolean
  has_variants?: number
  baseUnit?: string
  base_unit?: string
  conversionFactor?: number
  conversion_factor?: number
  variantCount?: number
  totalVariantStock?: number
  variants?: ProductVariant[]
  productVariants?: ProductVariant[]  // Raw data from API with snake_case fields
  createdAt?: string
  updatedAt?: string
  deleted_at?: string
}

export interface StockMutation {
  id: string
  menuId: string
  menu_id?: string
  variantId?: string
  variant_id?: string
  cafeId: number
  cafe_id?: number
  type: 'in' | 'out' | 'adjustment' | 'opname'
  quantity: number
  hppPrice?: number
  hpp_price?: number
  referenceType?: string
  reference_type?: string
  referenceId?: string
  reference_id?: string
  notes?: string
  createdBy?: string
  created_by?: string
  createdAt: string
  created_at?: string
}

export interface CartItem {
  menuId: string
  variantId?: string
  name: string
  variantName?: string
  sku?: string
  barcode?: string
  price: number
  qty: number
  note?: string
  discount?: number
}

export interface TransactionItem {
  id: string
  transaction_id?: string // From DB
  transactionId?: string // From frontend
  menu_id?: string
  menuId?: string
  variant_id?: string
  variantId?: string
  menu_name?: string
  menuName?: string
  variant_name?: string
  variantName?: string
  name?: string
  sku?: string
  barcode?: string
  price: number
  quantity?: number
  qty?: number
  discount?: number
  note?: string
  lineTotal?: number
  created_at?: string
  createdAt?: string
}

export interface Transaction {
  id: string
  transaction_number?: string
  transactionNumber?: string
  subtotal: number
  tax_amount?: number
  taxAmount?: number
  service_charge?: number
  serviceCharge?: number
  total_amount?: number
  totalAmount?: number
  payment_method?: PaymentMethod
  paymentMethod?: PaymentMethod
  payment_amount?: number
  paymentAmount?: number
  change_amount?: number
  changeAmount?: number
  order_note?: string
  orderNote?: string
  cafe_id: number
  created_by: string
  cashier_name?: string
  created_at?: string
  createdAt: string
  updated_at?: string
  updatedAt?: string
  deleted_at?: string
  items: TransactionItem[]
}

// ============================================================================
// PRODUCT VARIANTS (New - April 2026)
// ============================================================================

export interface VariantAttribute {
  id: string
  cafe_id?: number
  name: string
  sortOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  deleted_at?: string
  version?: number
}

export interface VariantAttributeValue {
  id: string
  attribute_id?: string
  attributeId?: string
  value: string
  sortOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  deleted_at?: string
  version?: number
}

export interface ProductVariant {
  id: string
  menu_id?: string
  menuId?: string
  sku?: string
  barcode?: string
  variantName: string
  variant_name?: string
  price?: number
  hppPrice?: number
  hpp_price?: number
  stockQuantity?: number
  stock_quantity?: number
  minStock?: number
  min_stock?: number
  trackStock?: boolean
  track_stock?: number
  imageUrl?: string
  image_url?: string
  isActive?: boolean
  is_active?: number
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  deleted_at?: string
  version?: number
  // Join fields
  productName?: string
  product_name?: string
  categoryId?: string
  category_id?: string
  attributes?: Array<{ name: string; value: string }>
  effectivePrice?: number
}

export interface VariantAttributeMapping {
  variant_id: string
  variantId?: string
  attribute_value_id: string
  attributeValueId?: string
  createdAt?: string
}

// Extended MenuItem with variant support
export interface MenuItemWithVariants extends MenuItem {
  hasVariants?: boolean
  has_variants?: number
  baseUnit?: string
  base_unit?: string
  conversionFactor?: number
  conversion_factor?: number
  variantCount?: number
  totalVariantStock?: number
  variants?: ProductVariant[]
}
