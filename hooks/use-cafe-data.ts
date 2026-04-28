import useSWR from 'swr';
import { cafeSettingsApi, menuApi, transactionsApi } from '../lib/api';
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

  return {
    transactions: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}
