'use client';

import { GlobalErrorProvider } from './global-error-handler';
import type { ReactNode } from 'react';

interface ClientErrorProviderProps {
  children: ReactNode;
}

export function ClientErrorProvider({ children }: ClientErrorProviderProps) {
  return <GlobalErrorProvider>{children}</GlobalErrorProvider>;
}