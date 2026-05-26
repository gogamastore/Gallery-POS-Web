
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, deleteDoc, onSnapshot, getDoc, query, where, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
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

  // Subscribe to cart changes in Firestore
  useEffect(() => {
    if (user) {
      setLoading(true);
      const cartRef = collection(db, 'user', user.uid, 'cart');
      
      const unsubscribe = onSnapshot(cartRef, async (snapshot) => {
        try {
            // Fetch active promotions once
            const now = new Date();
            const promoQuery = query(collection(db, "promotions"), where("endDate", ">", now));
            const promoSnapshot = await getDocs(promoQuery);
            const activePromos = new Map<string, number>();
            promoSnapshot.forEach(doc => {
                const data = doc.data() as Promotion;
                if (data.startDate.toDate() <= now) {
                    activePromos.set(data.productId, data.discountPrice);
                }
            });

            const productPromises = snapshot.docs.map(async (cartDoc) => {
                const cartData = cartDoc.data();
                const productRef = doc(db, 'products', cartDoc.id);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const productData = productSnap.data() as Omit<Product, 'id'>;
                    
                    let finalPrice = parseCurrency(productData.price);
                    if (activePromos.has(cartDoc.id)) {
                        finalPrice = activePromos.get(cartDoc.id)!;
                    }

                    return {
                    ...productData,
                    id: cartDoc.id,
                    quantity: cartData.quantity,
                    finalPrice: finalPrice,
                    price: productData.price, // Keep original price for reference if needed
                    } as CartItem;
                }
                return null;
            });

            const cartItems = (await Promise.all(productPromises)).filter(item => item !== null) as CartItem[];
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
  }, [user, toast]);

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Harap login terlebih dahulu' });
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
  const totalAmount = cart.reduce((total, item) => total + (item.finalPrice * item.quantity), 0);
  
  const value = {
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
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
