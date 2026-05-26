
"use client";

import React from 'react';
import { PurchaseCartContext, usePurchaseCartState } from '@/hooks/use-purchase-cart';

export const PurchaseCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const cartState = usePurchaseCartState();

    return (
        <PurchaseCartContext.Provider value={cartState}>
            {children}
        </PurchaseCartContext.Provider>
    );
}
