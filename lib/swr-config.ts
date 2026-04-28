import { SWRConfiguration } from 'swr';
import { toast } from 'sonner';

// Global fetcher function with error handling
export const apiFetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.message || `API Error: ${res.status}`;
    throw new Error(errorMessage);
  }
  
  return res.json();
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher: apiFetcher,
  onError: (error, key) => {
    console.error('SWR Error:', error, 'Key:', key);
    
    // Show toast for user-facing errors
    if (error.message && !error.message.includes('401')) {
      toast.error(error.message);
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
