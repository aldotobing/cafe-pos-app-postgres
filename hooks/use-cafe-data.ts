import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { cafeSettingsApi, menuApi, transactionsApi, type PaginatedTransactions } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import type { CafeSettings, MenuItem, Category, Transaction } from '../types';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('API Error');
  return res.json();
});

export function useCafeSettings(cafeId?: number) {
  const { data, error, mutate } = useSWR<CafeSettings[]>(
    cafeId ? [`/api/cafe_settings`, cafeId] : null,
    ([_, id]) => cafeSettingsApi.get(id as number)
  );

  return {
    settings: data?.[0] || null,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useMenu(cafeId?: number) {
  const { data, error, mutate } = useSWR<MenuItem[]>(
    cafeId ? `/api/rest/menu?cafe_id=${cafeId}` : null,
    () => menuApi.get(cafeId)
  );

  return {
    menu: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useCategories(cafeId?: number) {
  const { data, error, mutate } = useSWR<{ categories: Category[] }>(
    cafeId ? `/api/categories?cafeId=${cafeId}` : null,
    fetcher
  );

  return {
    categories: data?.categories || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useTransactions(cafeId?: number, limit?: number, offset?: number) {
  const { data, error, mutate } = useSWR<Transaction[]>(
    cafeId ? `/api/rest/transactions?cafe_id=${cafeId}&status=completed${limit ? `&limit=${limit}` : ''}${offset ? `&offset=${offset}` : ''}` : null,
    (url: string) => fetch(url).then(r => r.json()).then((j: any) => {
      const raw = j?.data || (Array.isArray(j) ? j : []);
      return raw.map((tx: any) => ({
        ...tx,
        totalAmount: tx.total_amount || 0,
        createdAt: tx.created_at,
        items: (tx.transaction_items || []).map((item: any) => ({
          menuId: item.menu_id || '',
          name: item.menu_name || '',
          qty: item.quantity || 0,
        })),
      }));
    })
  );

  // Ensure transactions is always an array even if SWR data is malformed
  const transactions = Array.isArray(data) ? data : [];

  return {
    transactions,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export interface UsePaginatedTransactionsReturn {
  transactions: Transaction[];
  totalCount: number;
  totalAmount: number; // Total amount of ALL filtered transactions
  completedTotal: number; // Total of completed-only transactions (summary card)
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isValidating: boolean; // True when re-fetching (e.g., switching pages)
  isError: any;
  mutate: () => void;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
}

export function useTransactionsPaginated(
  cafeId?: number,
  limit = 10,
  filters?: { from?: string; to?: string; created_by?: string; payment_method?: string; status?: string; search?: string }
): UsePaginatedTransactionsReturn {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [filters?.from, filters?.to, filters?.created_by, filters?.payment_method, filters?.status, filters?.search]);

  const { data, error, mutate, isValidating } = useSWR<PaginatedTransactions>(
    cafeId ? ['paginated-transactions', cafeId, limit, offset, filters?.from, filters?.to, filters?.created_by, filters?.payment_method, filters?.status, filters?.search] : null,
    () => transactionsApi.getPaginated(cafeId, limit, offset, filters),
    {
      // Keep previous data while loading new page for smoother UX
      keepPreviousData: true
    }
  );

  const transactions = Array.isArray(data?.data) ? data.data : [];
  const totalCount = data?.meta?.total || 0;
  const totalAmount = data?.meta?.totalAmount || 0;
  const completedTotal = data?.meta?.completedTotal || 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = offset + limit < totalCount;
  const hasPrevPage = offset > 0;

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setOffset((page - 1) * limit);
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      setOffset((prev: number) => prev + limit);
    }
  };

  const goToPrevPage = () => {
    if (hasPrevPage) {
      setOffset((prev: number) => Math.max(0, prev - limit));
    }
  };

  return {
    transactions,
    totalCount,
    totalAmount,
    completedTotal,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading: !error && !data,
    isValidating, // True when re-fetching (switching pages)
    isError: error,
    mutate,
    goToPage,
    goToNextPage,
    goToPrevPage
  };
}

// SWR deduplicates concurrent requests by key, revalidates on focus,
// and provides mutate() for programmatic invalidation.
export function usePromotions(cafeId?: number) {
  const { data, error, mutate, isLoading } = useSWR(
    cafeId ? `/api/promotions?cafeId=${cafeId}` : null,
    async (url: string) => {
      const res = await fetch(url);
      const json = await res.json();
      return (json.promotions || []).filter((p: any) => p.isActive);
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000, // dedup within 2s
    }
  );

  return {
    promotions: (data || []) as any[],
    isLoading,
    mutate,
  };
}
