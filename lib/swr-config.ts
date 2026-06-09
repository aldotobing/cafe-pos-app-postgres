import { SWRConfiguration } from 'swr';
import { toast } from 'sonner';
import { fetchWithError, FetchError, getUserMessage } from './fetch-client';

export const apiFetcher = async <T>(url: string): Promise<T> => {
  const { data } = await fetchWithError<T>(url);
  return data;
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher: apiFetcher,
  onError: (error, key) => {
    const msg = error instanceof FetchError ? error.message : (error?.message || '');

    if (!msg || msg.includes('401') || msg === 'Unauthorized') return;

    if (error instanceof FetchError && error.isNetworkError) {
      toast.error(msg, {
        id: 'swr-network-error',
        duration: 8000,
        action: { label: 'Coba Lagi', onClick: () => window.location.reload() },
      });
    } else if (msg) {
      toast.error(msg);
    }
  },
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // Don't retry on 404 or 401 errors
    if (error.message.includes('404') || error.message.includes('401')) {
      return;
    }
    
    // Retry up to 3 times
    if (retryCount >= 3) return;
    
    // Exponential backoff
    setTimeout(() => revalidate(), Math.min(1000 * 2 ** retryCount, 30000));
  },
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1 minute
  refreshInterval: 0, // Disable auto refresh
  suspense: false,
  keepPreviousData: true,
};

// Specialized configurations for different use cases
export const swrConfigWithRefresh = {
  ...swrConfig,
  refreshInterval: 30000, // 30 seconds for real-time data
};

export const swrConfigForTransactions = {
  ...swrConfig,
  dedupingInterval: 30000, // 30 seconds for transaction data
  refreshInterval: 15000, // 15 seconds for real-time transactions
};

export const swrConfigForStaticData = {
  ...swrConfig,
  dedupingInterval: 300000, // 5 minutes for static data like menu, categories
  revalidateOnFocus: true,
};
