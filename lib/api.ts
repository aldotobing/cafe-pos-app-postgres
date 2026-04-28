import type { CafeSettings, MenuItem, Transaction, TransactionItem } from "../types";
import { getJakartaNow } from "./format";

const API_BASE_URL = "/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(`API request failed: ${response.statusText}`, response.status);
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (e) {
    if (response.status === 204) {
      return {} as T;
    }
    throw new ApiError("Invalid response format", 500);
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
      enable_push_notifications: settings.enablePushNotifications ? 1 : 0,
      cafe_id: cafeId,
    };
    return apiRequest<CafeSettings>('/cafe_settings', { method: 'POST', body: JSON.stringify(settingsData) });
  },
  update: async (id: number, settings: Partial<CafeSettings>, cafeId?: number): Promise<CafeSettings> => {
    const settingsData: any = { ...settings };
    if (settingsData.logoUrl !== undefined) settingsData.logo_url = settingsData.logoUrl;
    if (settingsData.taxPercent !== undefined) settingsData.tax_percent = settingsData.taxPercent;
    if (settingsData.servicePercent !== undefined) settingsData.service_percent = settingsData.servicePercent;
    if (settingsData.enablePushNotifications !== undefined) settingsData.enable_push_notifications = settingsData.enablePushNotifications ? 1 : 0;
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
    return menuItems.filter((i: { id: any; }) => i.id).map((i: { id: any; name: any; category: any; category_id: any; price: any; available: any; image_url: any; stock_quantity: any; hpp_price: any; margin_percent: any; min_stock: any; track_stock: any; has_variants: any; created_at: any; updated_at: any; }) => {
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
    };
    
    // Only send category_id if it exists (migration may not have been run yet)
    if (item.categoryId) {
      data.category_id = item.categoryId;
    }

    const response = await apiRequest<any>('/rest/menu', { method: 'POST', body: JSON.stringify(data) });

    // Return the server response if available, otherwise fall back to client-generated data
    if (response) {
      const serverItem = Array.isArray(response) ? response[0] : response;
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
        };
      }
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
    };
  },
  update: async (id: string, item: Partial<MenuItem>): Promise<MenuItem> => {
    const data: any = {
      name: item.name,
      category: item.category,
      price: item.price,
      available: item.available ? 1 : 0,
      image_url: item.imageUrl,
      // Stock fields
      stock_quantity: item.stockQuantity,
      hpp_price: item.hppPrice,
      margin_percent: item.marginPercent,
      min_stock: item.minStock,
      track_stock: item.trackStock ? 1 : 0,
      // Variant flag
      has_variants: item.hasVariants ? 1 : 0,
    };
    
    // Only send category_id if it exists (migration may not have been run yet)
    if (item.categoryId) {
      data.category_id = item.categoryId;
    }
    
    await apiRequest(`/rest/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return menuApi.getById(id);
  },
  delete: async (id: string): Promise<void> => {
    await apiRequest(`/rest/menu/${id}`, { method: 'DELETE' });
  },
};

export const transactionsApi = {
  get: async (cafeId?: number): Promise<Transaction[]> => {
    let url = '/rest/transactions';
    const params = new URLSearchParams();
    if (cafeId) params.set('cafe_id', cafeId.toString());
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
  create: async (tx: any, cafeId?: number): Promise<Transaction> => {
    const data = { 
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
      items: tx.items?.map((item: any) => ({
        menu_id: item.menuId,
        menu_name: item.name,
        variant_id: item.variantId,
        variant_name: item.variantName,
        price: item.price,
        quantity: item.qty,
        discount: item.discount,
        note: item.note,
      }))
    };
    const response = await apiRequest<any>('/rest/transactions', { method: 'POST', body: JSON.stringify(data) });
    const serverTx = response?.data || response;
    if (!serverTx?.id) {
      throw new Error('Server did not return transaction ID');
    }
    return transactionsApi.getById(serverTx.id);
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