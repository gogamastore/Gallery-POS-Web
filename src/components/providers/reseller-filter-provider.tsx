
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  category: string;
  setCategory: (category: string) => void;
}

export const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("Semua");

  const value = {
    searchTerm,
    setSearchTerm,
    category,
    setCategory,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

// Dipakai bersama oleh kotak pencarian di app bar dan halaman Katalog
// Produk, supaya keduanya membaca/menulis state pencarian yang sama.
export const useResellerFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useResellerFilters harus dipakai di dalam <FilterProvider>');
  }
  return context;
};
