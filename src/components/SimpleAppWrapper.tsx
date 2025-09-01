'use client';

import { SimpleAuthProvider } from '@/lib/simple-auth';
import { SWRConfig } from 'swr';

interface SimpleAppWrapperProps {
  children: React.ReactNode;
}

export function SimpleAppWrapper({ children }: SimpleAppWrapperProps) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000, // 1 minute
        errorRetryCount: 2,
        errorRetryInterval: 1000,
        onError: (error) => {
          console.error('SWR Error:', error);
        }
      }}
    >
      <SimpleAuthProvider>
        {children}
      </SimpleAuthProvider>
    </SWRConfig>
  );
}