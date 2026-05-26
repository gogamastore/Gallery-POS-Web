
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: string;
  image: string;
  stock: number;
  purchasePrice: number;
  quantity: number;
}

interface PurchaseCartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, updates: { quantity?: number; purchasePrice?: number }) => void;
  clearCart: () => void;
  totalItems: number;
  totalPurchase: number;
}

export const PurchaseCartContext = createContext<PurchaseCartContextType | undefined>(undefined);

export const usePurchaseCartState = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        const savedCart = window.sessionStorage.getItem('purchase-cart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error("Failed to load purchase cart from sessionStorage", error);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('purchase-cart', JSON.stringify(cart));
      } catch (error) {
        console.error("Failed to save purchase cart to sessionStorage", error);
      }
    }
  }, [cart, isMounted]);

  const addToCart = (newItem: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === newItem.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + newItem.quantity, purchasePrice: newItem.purchasePrice }
            : item
        );
      }
      return [...prevCart, newItem];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  
  const updateCartItem = (productId: string, updates: { quantity?: number; purchasePrice?: number }) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, ...updates } : item
      ).filter(item => (item.quantity ?? 0) > 0) // Remove item if quantity is 0 or less
    );
  };

  const clearCart = useCallback(() => {
    setCart([]);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('purchase-cart');
    }
  }, []);

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPurchase = cart.reduce((total, item) => total + (item.purchasePrice * item.quantity), 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    totalItems,
    totalPurchase
  };
}


export const usePurchaseCart = (): PurchaseCartContextType => {
  const context = useContext(PurchaseCartContext);
  if (context === undefined) {
    throw new Error('usePurchaseCart must be used within a PurchaseCartProvider');
  }
  return context;
};
