import { useState } from 'react';
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
    cafeId ? `/api/rest/transactions?cafe_id=${cafeId}${limit ? `&limit=${limit}` : ''}${offset ? `&offset=${offset}` : ''}` : null,
    () => transactionsApi.get(cafeId)
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
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isError: any;
  mutate: () => void;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
}

export function useTransactionsPaginated(
  cafeId?: number, 
  limit = 10, 
  dateFilters?: { from?: string; to?: string }
): UsePaginatedTransactionsReturn {
  const [offset, setOffset] = useState(0);
  
  const { data, error, mutate } = useSWR<PaginatedTransactions>(
    cafeId ? ['paginated-transactions', cafeId, limit, offset, dateFilters?.from, dateFilters?.to] : null,
    () => transactionsApi.getPaginated(cafeId, limit, offset, dateFilters),
    {
      // Keep previous data while loading new page for smoother UX
      keepPreviousData: true
    }
  );

  const transactions = Array.isArray(data?.data) ? data.data : [];
  const totalCount = data?.meta?.total || 0;
  const totalAmount = data?.meta?.totalAmount || 0; // From API: total of ALL filtered transactions
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
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading: !error && !data,
    isError: error,
    mutate,
    goToPage,
    goToNextPage,
    goToPrevPage
  };
}
