
"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, deleteDoc, onSnapshot, getDoc, query, where, documentId, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from './use-toast';

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  'data-ai-hint'?: string;
  isPromo?: boolean;
  discountPrice?: string;
  stock: number;
  sku: string;
}

interface CartItem extends Product {
  quantity: number;
  finalPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  distinctItems: number;
  totalAmount: number;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    return Number(String(value).replace(/[^0-9]/g, ''));
}

interface Promotion {
    productId: string;
    discountPrice: number;
    startDate: Timestamp;
    endDate: Timestamp;
}


export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Cache produk (per sesi) agar tidak fetch ulang tiap keranjang berubah.
  const productCacheRef = useRef<Map<string, Product>>(new Map());
  // Cache promosi ber-TTL agar tidak query promosi setiap snapshot.
  const promoCacheRef = useRef<{ map: Map<string, number>; expires: number } | null>(null);

  // Ambil promosi aktif; hasil di-cache selama 60 detik.
  const getActivePromos = useCallback(async (): Promise<Map<string, number>> => {
    const cached = promoCacheRef.current;
    if (cached && cached.expires > Date.now()) return cached.map;

    const now = new Date();
    const promoQuery = query(collection(db, "promotions"), where("endDate", ">", now));
    const promoSnapshot = await getDocs(promoQuery);
    const map = new Map<string, number>();
    promoSnapshot.forEach((d) => {
      const data = d.data() as Promotion;
      if (data.startDate.toDate() <= now) {
        map.set(data.productId, data.discountPrice);
      }
    });
    promoCacheRef.current = { map, expires: Date.now() + 60_000 };
    return map;
  }, []);

  // Ambil produk yang BELUM ada di cache, dalam batch `documentId() in`
  // (maks 30 id/query) — jauh lebih sedikit round-trip dibanding per-item.
  const fetchMissingProducts = useCallback(async (ids: string[]) => {
    const cache = productCacheRef.current;
    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) return;

    for (let i = 0; i < missing.length; i += 30) {
      const chunk = missing.slice(i, i + 30);
      const snap = await getDocs(
        query(collection(db, "products"), where(documentId(), "in", chunk))
      );
      snap.forEach((d) => {
        cache.set(d.id, { id: d.id, ...(d.data() as Omit<Product, "id">) });
      });
    }
  }, []);

  // Subscribe to cart changes in Firestore
  useEffect(() => {
    if (user) {
      setLoading(true);
      const cartRef = collection(db, 'user', user.uid, 'cart');

      const unsubscribe = onSnapshot(cartRef, async (snapshot) => {
        try {
            const ids = snapshot.docs.map((d) => d.id);
            const [activePromos] = await Promise.all([
              getActivePromos(),
              fetchMissingProducts(ids),
            ]);

            const cache = productCacheRef.current;
            const cartItems = snapshot.docs
              .map((cartDoc) => {
                const productData = cache.get(cartDoc.id);
                if (!productData) return null;

                let finalPrice = parseCurrency(productData.price);
                if (activePromos.has(cartDoc.id)) {
                  finalPrice = activePromos.get(cartDoc.id)!;
                }

                return {
                  ...productData,
                  id: cartDoc.id,
                  quantity: cartDoc.data().quantity,
                  finalPrice,
                  price: productData.price,
                } as CartItem;
              })
              .filter((item): item is CartItem => item !== null);

            setCart(cartItems);

        } catch (error) {
             console.error("Error processing cart and promotions:", error);
             toast({ variant: "destructive", title: "Gagal memuat keranjang dengan promo" });
        } finally {
            setLoading(false);
        }
      }, (error) => {
        console.error("Error listening to cart changes:", error);
        toast({ variant: "destructive", title: "Error pada keranjang" });
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // If no user, clear the cart and stop loading
      setCart([]);
      setLoading(false);
    }
  }, [user, toast, getActivePromos, fetchMissingProducts]);

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Harap login terlebih dahulu' });
        return;
    }
    
    // Logic to check if adding a NEW unique product would exceed the 160 limit
    const itemExists = cart.some(item => item.id === product.id);
    if (!itemExists && cart.length >= 160) {
        toast({
            variant: 'destructive',
            title: 'Keranjang Penuh',
            description: 'Maaf, Keranjang Anda Penuh, harap checkout terlebih dahulu pesanan anda, lalu mengisi kembali keranjang anda'
        });
        return;
    }

    const cartRef = doc(db, 'user', user.uid, 'cart', product.id);
    
    try {
        const docSnap = await getDoc(cartRef);
        const newQuantity = docSnap.exists() ? docSnap.data().quantity + quantity : quantity;

        if (newQuantity > product.stock) {
            toast({ variant: 'destructive', title: 'Stok tidak mencukupi' });
            return;
        }

        const finalPrice = (product.isPromo && product.discountPrice)
            ? parseCurrency(product.discountPrice)
            : parseCurrency(product.price);

        const dataToSave = {
            product_id: product.id,
            nama: product.name,
            harga: finalPrice,
            gambar: product.image,
            quantity: newQuantity,
            updated_at: serverTimestamp()
        };

        await setDoc(cartRef, dataToSave, { merge: true });
        toast({ title: 'Produk ditambahkan ke keranjang' });

    } catch (error) {
        console.error("Error adding to cart:", error);
        toast({ variant: 'destructive', title: 'Gagal menambahkan ke keranjang' });
    }
  };

  const removeFromCart = async (productId: string) => {
     if (!user) return;
     const cartRef = doc(db, 'user', user.uid, 'cart', productId);
     try {
         await deleteDoc(cartRef);
     } catch (error) {
         console.error("Error removing from cart:", error);
         toast({ variant: 'destructive', title: 'Gagal menghapus dari keranjang' });
     }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return;
    if (quantity < 1) {
      await removeFromCart(productId);
      return;
    }
    const cartRef = doc(db, 'user', user.uid, 'cart', productId);
    try {
        // Here we need to check the stock limit before updating
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
            const productStock = productSnap.data().stock || 0;
            if (quantity > productStock) {
                toast({ variant: 'destructive', title: 'Stok tidak mencukupi', description: `Sisa stok: ${productStock}` });
                // Revert to max stock if user tries to exceed
                await setDoc(cartRef, { quantity: productStock, updated_at: serverTimestamp() }, { merge: true });
                return;
            }
        }
        await setDoc(cartRef, { quantity: quantity, updated_at: serverTimestamp() }, { merge: true });
    } catch (error) {
        console.error("Error updating quantity:", error);
        toast({ variant: 'destructive', title: 'Gagal memperbarui jumlah' });
    }
  };
  
  const clearCart = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const cartRef = collection(db, 'user', user.uid, 'cart');
        const querySnapshot = await getDocs(cartRef);
        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error clearing cart:", error);
        toast({ variant: 'destructive', title: 'Gagal mengosongkan keranjang' });
    } finally {
        setLoading(false);
    }
  }

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  // Jumlah produk unik (banyaknya productId) di keranjang — dipakai untuk
  // badge ikon keranjang, bukan total kuantitas.
  const distinctItems = cart.length;
  const totalAmount = cart.reduce((total, item) => total + (item.finalPrice * item.quantity), 0);

  const value = {
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      distinctItems,
      totalItems,
      totalAmount,
      loading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
