'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import GlobalLoading from '@/components/global-loading';

export default function RouteChangeHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // This effect runs when the route changes
    // The GlobalLoading component will handle showing the loading state
  }, [pathname, searchParams]);

  return <GlobalLoading />;
}