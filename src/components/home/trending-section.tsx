
"use client";

// This component is no longer used as the trending products now have their own page.
// It is kept in case it's needed in the future but is not rendered on the main page.

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "../product-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { TrendingUp } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Card } from "../ui/card";

interface Product {
  id: string;
  name: string;
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

export default function TrendingSection() {
    const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchTrendingProducts() {
            setLoading(true);
            try {
                const productsSnapshot = await getDocs(collection(db, "products"));
                const productsMap = new Map<string, Product>();
                productsSnapshot.forEach(doc => {
                    productsMap.set(doc.id, { 
                        id: doc.id, 
                        ...doc.data(),
                        stock: doc.data().stock || 0,
                        description: doc.data().description || ''
                    } as Product);
                });

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

                const trendingSnapshot = await getDocs(collection(db, "trending_products"));
                const trendingList = trendingSnapshot.docs.map(doc => {
                    const productId = doc.data().productId;
                    const product = productsMap.get(productId);
                    if (product) {
                        if (activePromos.has(product.id)) {
                            product.isPromo = true;
                            product.discountPrice = formatCurrency(activePromos.get(product.id)!.discountPrice);
                        }
                        return product;
                    }
                    return null;
                }).filter(p => p !== null) as Product[];

                setTrendingProducts(trendingList);

            } catch (error) {
                console.error("Failed to fetch trending products:", error);
                toast({
                    variant: "destructive",
                    title: "Gagal memuat Produk Trending",
                });
            } finally {
                setLoading(false);
            }
        }
        fetchTrendingProducts();
    }, [toast]);

    if (loading) {
        return (
             <section className="w-full py-6 md:py-10">
                <div className="container max-w-screen-2xl">
                    <div className="h-8 w-1/4 bg-muted rounded animate-pulse mb-6"></div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                        {[...Array(5)].map((_, i) => (
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
                </div>
            </section>
        );
    }
    
    if (trendingProducts.length === 0) {
        return null;
    }

    return (
        <section className="w-full py-6 md:py-10">
            <div className="container max-w-screen-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-x-4">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        <h2 className="text-2xl md:text-3xl font-bold font-headline">Produk Trending</h2>
                    </div>
                     <Button asChild variant="link" className="p-0 h-auto font-headline">
                        <Link href="/reseller/trending">Lihat Semua</Link>
                     </Button>
                </div>
                <Carousel
                    opts={{
                        align: "start",
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-2">
                        {trendingProducts.map((product) => (
                            <CarouselItem key={product.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pl-2">
                                <ProductCard product={product} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-[-20px] top-1/2 -translate-y-1/2 hidden md:inline-flex" />
                    <CarouselNext className="absolute right-[-20px] top-1/2 -translate-y-1/2 hidden md:inline-flex" />
                </Carousel>
            </div>
        </section>
    );
}
