
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "../product-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { Clock } from "lucide-react";
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
  sold?: number; // Added for stock progress
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

export default function FlashSaleSection() {
    const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        async function fetchFlashSale() {
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

                const now = new Date();
                const promoQuery = query(collection(db, "promotions"), where("endDate", ">", now));
                const promoSnapshot = await getDocs(promoQuery);
                const promoList: Product[] = [];

                promoSnapshot.forEach(doc => {
                    const data = doc.data() as Promotion;
                    if (data.startDate.toDate() <= now) {
                        const product = productsMap.get(data.productId);
                        if (product) {
                            promoList.push({
                                ...product,
                                isPromo: true,
                                discountPrice: formatCurrency(data.discountPrice)
                            });
                        }
                    }
                });
                
                setFlashSaleProducts(promoList);

            } catch (error) {
                console.error("Failed to fetch flash sale products:", error);
                toast({
                    variant: "destructive",
                    title: "Gagal memuat Flash Sale",
                });
            } finally {
                setLoading(false);
            }
        }
        fetchFlashSale();
    }, [toast]);

    useEffect(() => {
        if (flashSaleProducts.length === 0) return;
        
        const calculateTimeLeft = () => {
            const now = new Date();
            // This is a dummy timer for UI. A real implementation would fetch the specific promo's end date.
            const endTime = new Date();
            endTime.setHours(now.getHours() + 2);

            const difference = +endTime - +now;
            let timeLeft = { hours: 0, minutes: 0, seconds: 0 };

            if (difference > 0) {
                timeLeft = {
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }
            return timeLeft;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [flashSaleProducts]);

    const formatTime = (time: number) => time.toString().padStart(2, '0');
    
    if (loading) {
        return (
            <section className="w-full py-6 md:py-10 bg-primary/5">
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
    
    if (flashSaleProducts.length === 0) {
        return null; // Don't render the section if there are no active flash sales
    }


    return (
        <section className="w-full py-6 md:py-10 bg-primary/5">
            <div className="container max-w-screen-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <h2 className="text-2xl md:text-3xl font-bold font-headline text-primary">Flash Sale</h2>
                        {timeLeft !== null && (
                            <div className="flex items-center gap-2 text-foreground">
                                <Clock className="h-6 w-6" />
                                <div className="font-mono text-base sm:text-lg font-semibold space-x-1">
                                    <span className="hidden md:inline">Berakhir dalam</span>
                                    <span className="bg-destructive text-destructive-foreground rounded-md px-2 py-1">{formatTime(timeLeft.hours)}</span>
                                    <span>:</span>
                                    <span className="bg-destructive text-destructive-foreground rounded-md px-2 py-1">{formatTime(timeLeft.minutes)}</span>
                                    <span>:</span>
                                    <span className="bg-destructive text-destructive-foreground rounded-md px-2 py-1">{formatTime(timeLeft.seconds)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                     <Button asChild variant="link" className="p-0 h-auto font-headline">
                        <Link href="/reseller/promo">Lihat Semua</Link>
                     </Button>
                </div>
                <Carousel
                    opts={{
                        align: "start",
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-2">
                        {flashSaleProducts.map((product) => (
                            <CarouselItem key={product.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pl-2">
                                <ProductCard product={product} showStockProgress={true} />
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
