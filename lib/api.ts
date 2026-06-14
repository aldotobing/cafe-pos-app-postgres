import type { CafeSettings, MenuItem, Transaction, TransactionItem } from "../types";
import { getJakartaNow } from "./format";
import { fetchWithError, FetchError } from "./fetch-client";

const API_BASE_URL = "/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  try {
    const { data } = await fetchWithError<T>(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return data;
  } catch (err) {
    if (err instanceof FetchError) {
      if (err.status) {
        throw new ApiError(err.message, err.status);
      }
      throw err;
    }
    throw err;
  }
};

export const cafeSettingsApi = {
  get: async (cafeId?: number): Promise<CafeSettings[]> => {
    let url = '/cafe_settings';
    if (cafeId) url += `?cafe_id=${cafeId}`;
    const response = await apiRequest<any>(url);
    const settings = Array.isArray(response) ? response : (response ? [response] : []);
    const now = new Date().toISOString();
    return settings.map(setting => ({
      id: setting.id || 1,
      cafe_id: setting.cafe_id || cafeId,
      name: setting.name || "KasirKu POS",
      tagline: setting.tagline || "",
      address: setting.address || "",
      phone: setting.phone || "",
      logoUrl: setting.logo_url || setting.logoUrl || "",
      taxPercent: typeof setting.tax_percent === 'number' ? setting.tax_percent : 0,
      servicePercent: typeof setting.service_percent === 'number' ? setting.service_percent : 0,
      currency: setting.currency || "IDR",
      enablePushNotifications: Boolean(setting.enable_push_notifications),
      createdAt: setting.created_at || setting.createdAt || now,
      updatedAt: setting.updated_at || setting.updatedAt || now,
    }));
  },
  create: async (settings: Omit<CafeSettings, 'id'>, cafeId?: number): Promise<CafeSettings> => {
    const settingsData = {
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      logo_url: settings.logoUrl,
      tax_percent: settings.taxPercent,
      service_percent: settings.servicePercent,
      currency: settings.currency,
      enable_push_notifications: !!settings.enablePushNotifications,
      cafe_id: cafeId,
    };
    return apiRequest<CafeSettings>('/cafe_settings', { method: 'POST', body: JSON.stringify(settingsData) });
  },
  update: async (id: number, settings: Partial<CafeSettings>, cafeId?: number): Promise<CafeSettings> => {
    const settingsData: any = { ...settings };
    if (settingsData.logoUrl !== undefined) settingsData.logo_url = settingsData.logoUrl;
    if (settingsData.taxPercent !== undefined) settingsData.tax_percent = settingsData.taxPercent;
    if (settingsData.servicePercent !== undefined) settingsData.service_percent = settingsData.servicePercent;
    if (settingsData.enablePushNotifications !== undefined) settingsData.enable_push_notifications = !!settingsData.enablePushNotifications;
    settingsData.updated_at = new Date().toISOString();
    ['logoUrl', 'taxPercent', 'servicePercent', 'enablePushNotifications', 'createdAt', 'created_at', 'updatedAt', 'cafe_id', 'tagline', 'id'].forEach(f => delete settingsData[f]);
    return apiRequest<CafeSettings>(`/cafe_settings/${id}`, { method: 'PUT', body: JSON.stringify(settingsData) });
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest(`/cafe_settings/${id}`, { method: 'DELETE' });
  },
};

export const menuApi = {
  get: async (cafeId?: number): Promise<MenuItem[]> => {
    let url = '/rest/menu';
    const params = new URLSearchParams();
    if (cafeId) params.set('cafe_id', cafeId.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const response = await apiRequest<any>(url);
    const menuItems = response?.data || (Array.isArray(response) ? response : (response ? [response] : []));

    // Map snake_case DB fields to camelCase TypeScript interface
    return menuItems.filter((i: { id: any; }) => i.id).map((i: { id: any; name: any; category: any; category_id: any; price: any; available: any; image_url: any; stock_quantity: any; hpp_price: any; margin_percent: any; min_stock: any; track_stock: any; has_variants: any; created_at: any; updated_at: any; product_variants?: any[] }) => {
      const mapped = {
        id: i.id,
        name: i.name,
        category: i.category,
        categoryId: i.category_id,
        price: i.price,
        available: Boolean(i.available),
        imageUrl: i.image_url,
        // Stock fields - map from snake_case to camelCase
        stockQuantity: i.stock_quantity,
        hppPrice: i.hpp_price,
        marginPercent: i.margin_percent,
        minStock: i.min_stock,
        trackStock: Boolean(i.track_stock),
        // Variant fields
        hasVariants: Boolean(i.has_variants),
        has_variants: i.has_variants,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        // Product variants
        productVariants: i.product_variants || [],
      };

      return mapped;
    });
  },
  getById: async (id: string): Promise<MenuItem> => {
    const response = await apiRequest<any>(`/rest/menu/${id}`);
    const item = Array.isArray(response) ? response[0] : response;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      categoryId: item.category_id,
      price: item.price,
      available: Boolean(item.available),
      imageUrl: item.image_url,
      stockQuantity: item.stock_quantity,
      hppPrice: item.hpp_price,
      marginPercent: item.margin_percent,
      minStock: item.min_stock,
      trackStock: Boolean(item.track_stock),
      // Variant fields
      hasVariants: Boolean(item.has_variants),
      has_variants: item.has_variants,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  },
  create: async (item: Omit<MenuItem, 'id'>, cafeId?: number): Promise<MenuItem> => {
    const id = `menu_${Date.now()}`;
    const data: any = {
      id,
      name: item.name,
      category: item.category,
      price: item.price,
      available: item.available ? 1 : 0,
      image_url: item.imageUrl,
      cafe_id: cafeId,
      // Stock fields
      stock_quantity: item.stockQuantity || 0,
      hpp_price: item.hppPrice || 0,
      margin_percent: item.marginPercent || 30,
      min_stock: item.minStock || 5,
      track_stock: item.trackStock ? 1 : 0,
      // Variant fields
      has_variants: item.hasVariants ? 1 : 0,
    };
    
    // Only send category_id if it exists (migration may not have been run yet)
    if (item.categoryId) {
      data.category_id = item.categoryId;
    }

    const response = await apiRequest<any>('/rest/menu', { method: 'POST', body: JSON.stringify(data) });

    // Return the server response if available, otherwise fall back to client-generated data
    // Server returns { data: {...}, success: true }
    const serverItem = response?.data;
    if (serverItem && serverItem.id) {
      return {
        ...serverItem,
        imageUrl: serverItem.image_url,
        available: Boolean(serverItem.available),
        stockQuantity: serverItem.stock_quantity,
        hppPrice: serverItem.hpp_price,
        marginPercent: serverItem.margin_percent,
        minStock: serverItem.min_stock,
        trackStock: Boolean(serverItem.track_stock),
        cafe_id: serverItem.cafe_id,
        hasVariants: Boolean(serverItem.has_variants),
        has_variants: serverItem.has_variants,
      };
    }

    // Fallback if server doesn't return the created item
    return {
      ...item,
      id,
      createdAt: getJakartaNow(),
      available: true,
      stockQuantity: item.stockQuantity || 0,
      hppPrice: item.hppPrice || 0,
      marginPercent: item.marginPercent || 30,
      minStock: item.minStock || 5,
      trackStock: item.trackStock || false,
      hasVariants: item.hasVariants || false,
      has_variants: item.hasVariants ? 1 : 0,
    };
  },
  update: async (id: string, item: Partial<MenuItem>): Promise<MenuItem> => {
    const data: any = {};

    // Only include fields that are explicitly provided to avoid overwriting
    // DB values with undefined/defaults (e.g. toggling availability shouldn't
    // reset track_stock or has_variants).
    if (item.name !== undefined) data.name = item.name;
    if (item.category !== undefined) data.category = item.category;
    if (item.price !== undefined) data.price = item.price;
    if (item.available !== undefined) data.available = item.available ? 1 : 0;
    if (item.imageUrl !== undefined) data.image_url = item.imageUrl;
    if (item.stockQuantity !== undefined) data.stock_quantity = item.stockQuantity;
    if (item.hppPrice !== undefined) data.hpp_price = item.hppPrice;
    if (item.marginPercent !== undefined) data.margin_percent = item.marginPercent;
    if (item.minStock !== undefined) data.min_stock = item.minStock;
    if (item.trackStock !== undefined) data.track_stock = item.trackStock ? 1 : 0;
    if (item.hasVariants !== undefined) data.has_variants = item.hasVariants ? 1 : 0;
    if (item.categoryId) data.category_id = item.categoryId;

    await apiRequest(`/rest/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return menuApi.getById(id);
  },
  delete: async (id: string): Promise<void> => {
    await apiRequest(`/rest/menu/${id}`, { method: 'DELETE' });
  },
};

export interface PaginatedTransactions {
  data: Transaction[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    totalAmount: number;
    completedTotal: number; // Total of completed transactions only (for summary card)
  };
}

export const transactionsApi = {
  get: async (cafeId?: number, limit?: number): Promise<Transaction[]> => {
    let url = '/rest/transactions';
    const params = new URLSearchParams();
    if (cafeId) params.set('cafe_id', cafeId.toString());
    if (limit) params.set('limit', limit.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const response = await apiRequest<any>(url);
    const raw = response?.data || (Array.isArray(response) ? response : (response ? [response] : []));

    // Phase 1.2: Items now come nested from server response (No N+1 queries!)
    // Server-side returns: { ...tx, transaction_items: [...] }
    // Phase 1.3: Map nested items from snake_case to camelCase
    return raw.map((tx: any) => ({
      ...tx,
      transactionNumber: tx.transaction_number || tx.id,
      taxAmount: tx.tax_amount || 0,
      serviceCharge: tx.service_charge || 0,
      totalAmount: tx.total_amount || 0,
      paymentMethod: tx.payment_method || 'Tunai',
      paymentAmount: tx.payment_amount || 0,
      changeAmount: tx.change_amount || 0,
      orderNote: tx.order_note || '',
      discountType: tx.discount_type || 'none',
      discountValue: tx.discount_value || 0,
      discountAmount: tx.discount_amount || 0,
      discountName: tx.discount_name || null,
      items: (tx.transaction_items || []).map((item: any) => ({
        id: item.id || '',
        transactionId: item.transaction_id || item.transactionId || '',
        menuId: item.menu_id || item.menuId || '',
        name: item.menu_name || item.menuName || item.name || '',
        price: typeof item.price === 'number' ? item.price : 0,
        qty: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : 0),
        discount: typeof item.discount === 'number' ? item.discount : 0,
        note: item.note,
        lineTotal: ((item.price || 0) * (item.quantity || item.qty || 0)) - (item.discount || 0),
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      })),
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    }));
  },

  getPaginated: async (cafeId?: number, limit = 10, offset = 0, filters?: { from?: string; to?: string; created_by?: string; payment_method?: string; status?: string; search?: string }): Promise<PaginatedTransactions> => {
    let url = '/rest/transactions';
    const params = new URLSearchParams();
    if (cafeId) params.set('cafe_id', cafeId.toString());
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    // Add date filters if provided - convert to local-timezone-aware ISO timestamps
    // so that "2026-06-06" means June 6 in the user's timezone, not UTC midnight
    if (filters?.from) {
      const fromDate = new Date(filters.from + 'T00:00:00');
      params.set('start_date', fromDate.toISOString());
    }
    if (filters?.to) {
      const toDate = new Date(filters.to + 'T00:00:00');
      toDate.setDate(toDate.getDate() + 1);
      params.set('end_date', toDate.toISOString());
    }
    if (filters?.created_by && filters.created_by !== 'Semua') {
      params.set('created_by', filters.created_by);
    }
    if (filters?.payment_method && filters.payment_method !== 'Semua') {
      params.set('payment_method', filters.payment_method);
    }
    if (filters?.status && filters.status !== 'all') {
      params.set('status', filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      params.set('search', filters.search.trim());
    }

    if (params.toString()) url += `?${params.toString()}`;

    const response = await apiRequest<any>(url);
    
    // Response format: { data: Transaction[], meta: { total, limit, offset } }
    const raw = response?.data || [];
    const meta = response?.meta || { total: 0, limit, offset };

    const transactions = raw.map((tx: any) => ({
      ...tx,
      transactionNumber: tx.transaction_number || tx.id,
      taxAmount: tx.tax_amount || 0,
      serviceCharge: tx.service_charge || 0,
      totalAmount: tx.total_amount || 0,
      paymentMethod: tx.payment_method || 'Tunai',
      paymentAmount: tx.payment_amount || 0,
      changeAmount: tx.change_amount || 0,
      orderNote: tx.order_note || '',
      discountType: tx.discount_type || 'none',
      discountValue: tx.discount_value || 0,
      discountAmount: tx.discount_amount || 0,
      discountName: tx.discount_name || null,
      items: (tx.transaction_items || []).map((item: any) => ({
        id: item.id || '',
        transactionId: item.transaction_id || item.transactionId || '',
        menuId: item.menu_id || item.menuId || '',
        name: item.menu_name || item.menuName || item.name || '',
        price: typeof item.price === 'number' ? item.price : 0,
        qty: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : 0),
        discount: typeof item.discount === 'number' ? item.discount : 0,
        note: item.note,
        lineTotal: ((item.price || 0) * (item.quantity || item.qty || 0)) - (item.discount || 0),
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      })),
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    }));

    return {
      data: transactions,
      meta
    };
  },
  getById: async (id: string): Promise<Transaction> => {
    const response = await apiRequest<any>(`/rest/transactions/${id}`);
    const tx = Array.isArray(response) ? response[0] : response;
    if (!tx) throw new Error('Transaction not found');
    return {
      ...tx,
      transactionNumber: tx.transaction_number,
      taxAmount: tx.tax_amount,
      serviceCharge: tx.service_charge,
      totalAmount: tx.total_amount,
      paymentMethod: tx.payment_method,
      paymentAmount: tx.payment_amount,
      changeAmount: tx.change_amount,
      orderNote: tx.order_note,
      discountType: tx.discount_type || 'none',
      discountValue: tx.discount_value || 0,
      discountAmount: tx.discount_amount || 0,
      discountName: tx.discount_name || null,
      items: (tx.transaction_items || tx.items || []).map((item: any) => ({
        id: item.id || '',
        transactionId: item.transaction_id || item.transactionId || '',
        menuId: item.menu_id || item.menuId || '',
        name: item.menu_name || item.menuName || item.name || '',
        price: typeof item.price === 'number' ? item.price : 0,
        qty: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : 0),
        discount: typeof item.discount === 'number' ? item.discount : 0,
        note: item.note,
        lineTotal: ((item.price || 0) * (item.quantity || item.qty || 0)) - (item.discount || 0),
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      })),
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    };
  },
  create: async (tx: any, cafeId?: number, idempotencyKey?: string): Promise<Transaction> => {
    const data: Record<string, unknown> = {
      transaction_number: tx.transactionNumber,
      subtotal: tx.subtotal,
      tax_amount: tx.taxAmount,
      service_charge: tx.serviceCharge,
      total_amount: tx.totalAmount,
      payment_method: tx.paymentMethod,
      payment_amount: tx.paymentAmount,
      change_amount: tx.changeAmount,
      order_note: tx.orderNote,
      created_by: tx.created_by,
      cafe_id: tx.cafe_id || cafeId,
      discount_type: tx.discount_type || 'none',
      discount_value: tx.discount_value || 0,
      discount_amount: tx.discount_amount || 0,
      discount_name: tx.discount_name || null,
      items: tx.items?.map((item: any) => ({
        menu_id: item.menuId,
        menu_name: item.name,
        variant_id: item.variantId,
        variant_name: item.variantName,
        price: item.price,
        quantity: item.qty,
        discount: item.discount,
        note: item.note,
      })),
    };
    if (idempotencyKey) data.idempotency_key = idempotencyKey;
    const response = await apiRequest<any>('/rest/transactions', { method: 'POST', body: JSON.stringify(data) });
    const serverTx = response?.data || response;
    if (!serverTx?.id) {
      throw new Error('Server did not return transaction ID');
    }

    return {
      ...serverTx,
      transactionNumber: serverTx.transaction_number || serverTx.id,
      taxAmount: serverTx.tax_amount || 0,
      serviceCharge: serverTx.service_charge || 0,
      totalAmount: serverTx.total_amount || 0,
      paymentMethod: serverTx.payment_method || 'Tunai',
      paymentAmount: serverTx.payment_amount || 0,
      changeAmount: serverTx.change_amount || 0,
      orderNote: serverTx.order_note || '',
      discountType: serverTx.discount_type || 'none',
      discountValue: serverTx.discount_value || 0,
      discountAmount: serverTx.discount_amount || 0,
      discountName: serverTx.discount_name || null,
      cashier_name: serverTx.cashier_name,
      items: (serverTx.transaction_items || []).map((item: any) => ({
        id: item.id || '',
        transactionId: item.transaction_id || '',
        menuId: item.menu_id || '',
        name: item.menu_name || item.name || '',
        variantId: item.variant_id,
        variantName: item.variant_name,
        price: typeof item.price === 'number' ? item.price : 0,
        qty: typeof item.quantity === 'number' ? item.quantity : 0,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        discount: typeof item.discount === 'number' ? item.discount : 0,
        note: item.note || '',
        lineTotal: ((item.price || 0) * (item.quantity || 0)) - (item.discount || 0),
      })),
      createdAt: serverTx.created_at,
      updatedAt: serverTx.updated_at
    } as Transaction;
  },
  update: async (id: string, tx: Partial<Transaction>): Promise<Transaction> => {
    await apiRequest(`/rest/transactions/${id}`, { method: 'PUT', body: JSON.stringify(tx) });
    return transactionsApi.getById(id);
  },
  delete: async (id: string): Promise<void> => {
    await apiRequest(`/rest/transactions/${id}`, { method: 'DELETE' });
  },
};

export const usersApi = {
  get: async (params?: Record<string, string | number>): Promise<any[]> => {
    let url = '/rest/users';
    if (params) {
        const sp = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
        url += `?${sp.toString()}`;
    }
    const response = await apiRequest<any>(url);
    return Array.isArray(response) ? response : (response ? [response] : []);
  },
  getById: async (id: string): Promise<any> => {
    const response = await apiRequest<any>(`/rest/users/${id}`);
    return Array.isArray(response) ? response[0] : response;
  },
  create: async (user: any): Promise<any> => await apiRequest<any>('/rest/users', { method: 'POST', body: JSON.stringify(user) }),
  update: async (id: string, user: any): Promise<any> => await apiRequest<any>(`/rest/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }),
  delete: async (id: string): Promise<void> => { await apiRequest(`/rest/users/${id}`, { method: 'DELETE' }); },
};