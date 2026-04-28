'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { SWRErrorBoundary } from './swr-error-boundary';

interface SWRProviderProps {
  children: React.ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRErrorBoundary>
      <SWRConfig value={swrConfig}>
        {children}
      </SWRConfig>
    </SWRErrorBoundary>
  );
}
