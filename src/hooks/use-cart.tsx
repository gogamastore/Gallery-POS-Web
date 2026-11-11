
"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, deleteDoc, onSnapshot, getDoc, query, where, documentId, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from './use-toast';
import { flashSaleFromDoc, type FlashSale } from '@/lib/flash-sale';

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
    // 1 = produk promo dibatasi maksimal 1 pcs per pesanan (online).
    maxQtyPerBuyer?: number;
}

// Ringkasan event flash sale yang SEDANG aktif (hanya 1 event boleh aktif).
interface FlashActive {
    flashPrices: Map<string, number>; // productId → harga flash
    productIds: Set<string>;          // semua produk dalam event aktif
    oneItemPerEvent: boolean;         // hanya 1 produk & 1 pcs se-event
    maxQtyPerBuyer: number | null;    // batas pcs per produk (null = bebas)
}

// Batas qty untuk produk dalam flash sale aktif: 1 bila "1 produk per event",
// selain itu maxQtyPerBuyer, selain itu null (tanpa batas / bukan produk flash).
function flashCapFor(id: string, f: FlashActive): number | null {
    if (!f.flashPrices.has(id)) return null;
    if (f.oneItemPerEvent) return 1;
    return f.maxQtyPerBuyer ?? null;
}


export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Cache produk (per sesi) agar tidak fetch ulang tiap keranjang berubah.
  const productCacheRef = useRef<Map<string, Product>>(new Map());
  // Cache promosi ber-TTL agar tidak query promosi setiap snapshot.
  const promoCacheRef = useRef<{ discounts: Map<string, number>; maxOne: Set<string>; expires: number } | null>(null);
  // Cache flash sale aktif ber-TTL (pendek agar harga cepat kembali normal saat berakhir).
  const flashCacheRef = useRef<{ data: FlashActive; expires: number } | null>(null);
  // Dokumen keranjang terakhir dari snapshot — dipakai untuk menghitung ulang
  // harga secara berkala (flash sale yang berakhir → harga kembali normal).
  const lastDocsRef = useRef<{ id: string; quantity: number }[]>([]);

  // Ambil promosi aktif; hasil di-cache selama 60 detik.
  // `discounts` = productId → harga diskon; `maxOne` = produk promo yang
  // dibatasi maksimal 1 pcs per pesanan (maxQtyPerBuyer==1).
  const getActivePromos = useCallback(async (): Promise<{ discounts: Map<string, number>; maxOne: Set<string> }> => {
    const cached = promoCacheRef.current;
    if (cached && cached.expires > Date.now()) {
      return { discounts: cached.discounts, maxOne: cached.maxOne };
    }

    const now = new Date();
    const promoQuery = query(collection(db, "promotions"), where("endDate", ">", now));
    const promoSnapshot = await getDocs(promoQuery);
    const discounts = new Map<string, number>();
    const maxOne = new Set<string>();
    promoSnapshot.forEach((d) => {
      const data = d.data() as Promotion;
      if (data.startDate.toDate() <= now) {
        discounts.set(data.productId, data.discountPrice);
        if (data.maxQtyPerBuyer === 1) maxOne.add(data.productId);
      }
    });
    promoCacheRef.current = { discounts, maxOne, expires: Date.now() + 60_000 };
    return { discounts, maxOne };
  }, []);

  // Ambil event flash sale yang SEDANG aktif (startAt <= now < endAt). Hanya 1
  // event boleh aktif. Hasil di-cache 15 detik agar harga cepat kembali normal
  // begitu event berakhir. Teaser (cooldown) TIDAK memberi harga flash — teaser
  // hanya tampilan tersensor di beranda, bukan harga beli.
  const getActiveFlashSale = useCallback(async (): Promise<FlashActive> => {
    const cached = flashCacheRef.current;
    if (cached && cached.expires > Date.now()) return cached.data;

    const now = new Date();
    const snap = await getDocs(query(collection(db, "flash_sales"), where("endAt", ">", now)));
    let chosen: FlashSale | null = null;
    snap.forEach((d) => {
      const fs = flashSaleFromDoc(d.id, d.data());
      if (fs.startAt <= now && now < fs.endAt) {
        if (!chosen || fs.startAt > chosen.startAt) chosen = fs;
      }
    });

    const flashPrices = new Map<string, number>();
    const productIds = new Set<string>();
    const active = chosen as FlashSale | null;
    if (active) {
      active.products.forEach((p) => {
        if (p.flashPrice > 0) {
          flashPrices.set(p.productId, p.flashPrice);
          productIds.add(p.productId);
        }
      });
    }
    const data: FlashActive = {
      flashPrices,
      productIds,
      oneItemPerEvent: active?.oneItemPerEvent ?? false,
      maxQtyPerBuyer: active?.maxQtyPerBuyer ?? null,
    };
    flashCacheRef.current = { data, expires: Date.now() + 15_000 };
    return data;
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

  // Bangun daftar keranjang (harga final + batas qty) dari dokumen keranjang.
  // Dipakai oleh listener snapshot DAN timer berkala (agar harga flash kembali
  // normal saat event berakhir walau keranjang tidak berubah).
  const buildCart = useCallback(async (docs: { id: string; quantity: number }[]) => {
    const ids = docs.map((d) => d.id);
    const [promos, flash] = await Promise.all([
      getActivePromos(),
      getActiveFlashSale(),
    ]);
    await fetchMissingProducts(ids);

    const cache = productCacheRef.current;
    const cartItems = docs
      .map((cd) => {
        const productData = cache.get(cd.id);
        if (!productData) return null;

        // Presedensi harga: flash sale aktif > promo > harga normal.
        // Di luar jendela aktif, flash.flashPrices kosong → harga normal lagi.
        let finalPrice = parseCurrency(productData.price);
        if (promos.discounts.has(cd.id)) finalPrice = promos.discounts.get(cd.id)!;
        if (flash.flashPrices.has(cd.id)) finalPrice = flash.flashPrices.get(cd.id)!;

        // Batas tampil qty: promo 1 pcs, lalu batas flash sale (1 / maxQty).
        let qty = Number(cd.quantity) || 0;
        if (promos.maxOne.has(cd.id) && qty > 1) qty = 1;
        const fcap = flashCapFor(cd.id, flash);
        if (fcap != null && qty > fcap) qty = fcap;

        return {
          ...productData,
          id: cd.id,
          quantity: qty,
          finalPrice,
          price: productData.price,
        } as CartItem;
      })
      .filter((item): item is CartItem => item !== null);

    setCart(cartItems);
  }, [getActivePromos, getActiveFlashSale, fetchMissingProducts]);

  // Subscribe to cart changes in Firestore
  useEffect(() => {
    if (user) {
      setLoading(true);
      const cartRef = collection(db, 'user', user.uid, 'cart');

      const unsubscribe = onSnapshot(cartRef, async (snapshot) => {
        try {
            const docs = snapshot.docs.map((d) => ({ id: d.id, quantity: Number(d.data().quantity) || 0 }));
            lastDocsRef.current = docs;
            await buildCart(docs);
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
      lastDocsRef.current = [];
      setCart([]);
      setLoading(false);
    }
  }, [user, toast, buildCart]);

  // Hitung ulang harga tiap 20 detik agar harga flash sale kembali normal
  // otomatis begitu event berakhir, meski isi keranjang tidak berubah.
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => {
      if (lastDocsRef.current.length > 0) buildCart(lastDocsRef.current).catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [user, buildCart]);

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
        let newQuantity = docSnap.exists() ? docSnap.data().quantity + quantity : quantity;

        // Batas 1 pcs per pesanan untuk produk promo (maxQtyPerBuyer==1).
        const { maxOne } = await getActivePromos();
        if (maxOne.has(product.id) && newQuantity > 1) {
            newQuantity = 1;
            toast({ title: 'Promo maksimal 1 pcs', description: 'Produk promo ini dibatasi 1 pcs per pesanan.' });
        }

        // Aturan flash sale aktif.
        const flash = await getActiveFlashSale();
        if (flash.flashPrices.has(product.id)) {
            // "Hanya 1 produk per event": tolak jika sudah ada produk flash lain.
            if (flash.oneItemPerEvent) {
                const other = cart.find((it) => it.id !== product.id && flash.productIds.has(it.id));
                if (other) {
                    toast({
                        variant: 'destructive',
                        title: 'Hanya 1 produk flash sale',
                        description: `Anda sudah memilih "${other.name}" dari flash sale ini. Hapus dulu untuk memilih produk lain.`,
                    });
                    return;
                }
            }
            const cap = flashCapFor(product.id, flash);
            if (cap != null && newQuantity > cap) {
                newQuantity = cap;
                toast({
                    title: 'Batas flash sale',
                    description: cap === 1
                        ? 'Produk flash sale ini dibatasi maksimal 1 pcs.'
                        : `Produk flash sale ini dibatasi maksimal ${cap} pcs.`,
                });
            }
        }

        if (newQuantity > product.stock) {
            toast({ variant: 'destructive', title: 'Stok tidak mencukupi' });
            return;
        }

        let finalPrice = (product.isPromo && product.discountPrice)
            ? parseCurrency(product.discountPrice)
            : parseCurrency(product.price);
        if (flash.flashPrices.has(product.id)) finalPrice = flash.flashPrices.get(product.id)!;

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
    // Batas 1 pcs per pesanan untuk produk promo (maxQtyPerBuyer==1).
    let targetQty = quantity;
    const { maxOne } = await getActivePromos();
    if (maxOne.has(productId) && targetQty > 1) {
      targetQty = 1;
      toast({ title: 'Promo maksimal 1 pcs', description: 'Produk promo ini dibatasi 1 pcs per pesanan.' });
    }
    // Batas qty produk flash sale aktif (1 / maxQtyPerBuyer).
    const flash = await getActiveFlashSale();
    const fcap = flashCapFor(productId, flash);
    if (fcap != null && targetQty > fcap) {
      targetQty = fcap;
      toast({
        title: 'Batas flash sale',
        description: fcap === 1
          ? 'Produk flash sale ini dibatasi maksimal 1 pcs.'
          : `Produk flash sale ini dibatasi maksimal ${fcap} pcs.`,
      });
    }
    const cartRef = doc(db, 'user', user.uid, 'cart', productId);
    try {
        // Here we need to check the stock limit before updating
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
            const productStock = productSnap.data().stock || 0;
            if (targetQty > productStock) {
                toast({ variant: 'destructive', title: 'Stok tidak mencukupi', description: `Sisa stok: ${productStock}` });
                // Revert to max stock if user tries to exceed
                await setDoc(cartRef, { quantity: productStock, updated_at: serverTimestamp() }, { merge: true });
                return;
            }
        }
        await setDoc(cartRef, { quantity: targetQty, updated_at: serverTimestamp() }, { merge: true });
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
