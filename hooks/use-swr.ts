import useSWR, { SWRConfiguration } from 'swr';
import { swrConfig, swrConfigForTransactions, swrConfigForStaticData } from '@/lib/swr-config';

// Generic SWR hook with default config
export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, null, { ...swrConfig, ...config });
}

// Hook for transaction data with real-time updates
export function useTransactions<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, null, { ...swrConfigForTransactions, ...config });
}

// Hook for static data (menu, categories, etc.)
export function useStaticData<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, null, { ...swrConfigForStaticData, ...config });
}

// Hook with custom fetcher for data transformation
export function useApiWithTransform<T, R>(
  url: string | null,
  fetcher: (url: string) => Promise<R>,
  config?: SWRConfiguration
) {
  return useSWR<R>(url, fetcher, { ...swrConfig, ...config });
}

// Hook for paginated data
export function usePaginatedApi<T>(
  url: string | null,
  config?: SWRConfiguration
) {
  return useSWR<{
    data: T[];
    meta: {
      total: number;
      limit: number;
      offset: number;
    };
  }>(url, null, { ...swrConfig, ...config });
}

// Hook for real-time data with refresh
export function useRealtimeApi<T>(
  url: string | null,
  refreshInterval: number = 30000,
  config?: SWRConfiguration
) {
  return useSWR<T>(url, null, {
    ...swrConfig,
    refreshInterval,
    ...config,
  });
}

// Hook for mutations (create, update, delete)
export function useMutation<T = any, V = any>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mutate = async (data?: V) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      return method === 'DELETE' ? true : await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { mutate, isSubmitting, error };
}

// Import React for useState
import React from 'react';
