
"use client";

import { useContext } from 'react';
import { FilterContext } from '@/components/providers/reseller-filter-provider';

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
