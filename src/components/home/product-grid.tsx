
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "../product-card";
import ProductListItem from "../product-list-item";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Render bertahap: jumlah awal & penambahan per "scroll".
const INITIAL_VISIBLE = 24;
const LOAD_BATCH = 24;

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  image: string;
  'data-ai-hint'?: string;
  stock: number;
  description?: string;
  isPromo?: boolean;
  discountPrice?: string;
}

interface Promotion {
    productId: string;
    discountPrice: number;
    startDate: Timestamp;
    endDate: Timestamp;
}

const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : value;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(num);
}

export default function ProductGrid({ searchTerm, category, viewMode = "grid" }: { searchTerm: string, category: string, viewMode?: "grid" | "list" }) {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const productsSnapshot = await getDocs(collection(db, "products"));
                const productsData = productsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    stock: doc.data().stock || 0,
                    description: doc.data().description || ''
                } as Product));

                // Check for active promotions
                const now = new Date();
                const promoQuery = query(collection(db, "promotions"), where("endDate", ">", now));
                const promoSnapshot = await getDocs(promoQuery);
                const activePromos = new Map<string, { discountPrice: number }>();
                promoSnapshot.forEach(doc => {
                    const data = doc.data() as Promotion;
                    if (data.startDate.toDate() <= now) {
                        activePromos.set(data.productId, { discountPrice: data.discountPrice });
                    }
                });

                const finalProducts = productsData.map(product => {
                    if (activePromos.has(product.id)) {
                        product.isPromo = true;
                        product.discountPrice = formatCurrency(activePromos.get(product.id)!.discountPrice);
                    }
                    return product;
                });
                
                setAllProducts(finalProducts);

            } catch (error) {
                console.error("Failed to fetch products:", error);
                toast({
                    variant: "destructive",
                    title: "Gagal memuat produk",
                });
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const filteredProducts = useMemo(() => {
        let filtered = allProducts;
        if (category !== "Semua") {
            filtered = filtered.filter(p => p.category === category);
        }
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.sku && String(p.sku).toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Sorting: by stock status first, then by name
        filtered.sort((a, b) => {
            if (a.stock > 0 && b.stock === 0) {
                return -1;
            }
            if (a.stock === 0 && b.stock > 0) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        return filtered;
    }, [allProducts, category, searchTerm]);

    // ── Render bertahap saat scroll (virtualisasi sederhana) ──────────
    // Data penuh tetap di memori (filteredProducts), jadi PENCARIAN tetap
    // bekerja menyeluruh — hanya jumlah yang DIRENDER ke DOM yang dibatasi
    // dan bertambah saat sentinel mendekati viewport.
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Reset ke awal setiap kali hasil filter berubah (pencarian/kategori baru).
    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE);
    }, [searchTerm, category, viewMode]);

    const visibleProducts = useMemo(
        () => filteredProducts.slice(0, visibleCount),
        [filteredProducts, visibleCount]
    );
    const hasMore = visibleCount < filteredProducts.length;

    useEffect(() => {
        if (!hasMore) return;
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setVisibleCount((c) =>
                        Math.min(c + LOAD_BATCH, filteredProducts.length)
                    );
                }
            },
            { rootMargin: "600px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, filteredProducts.length, visibleCount]);

    return (
        <section className="w-full py-6 md:py-10">
            <div className="container max-w-screen-2xl">
                <h2 className="text-2xl font-bold font-headline mb-6 text-center">Semua Produk</h2>
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                        {[...Array(10)].map((_, i) => (
                            <Card key={i} className="overflow-hidden group">
                                <div className="bg-muted aspect-square w-full animate-pulse"></div>
                                <div className="p-4 space-y-2">
                                    <div className="h-6 w-3/4 bg-muted rounded animate-pulse"></div>
                                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                                    <div className="h-10 w-full bg-muted rounded animate-pulse mt-4"></div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <>
                        {viewMode === "list" ? (
                            <div className="flex flex-col divide-y rounded-lg border bg-card overflow-hidden">
                                {visibleProducts.map((product) => (
                                    <ProductListItem key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                                {visibleProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>Tidak ada produk yang cocok dengan kriteria Anda.</p>
                    </div>
                )}
            </div>
        </section>
    )
}
