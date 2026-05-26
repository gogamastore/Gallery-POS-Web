
"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "../product-card";
import { useToast } from "@/hooks/use-toast";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export default function ProductGrid({ searchTerm, category }: { searchTerm: string, category: string }) {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(24);

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

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredProducts.slice(startIndex, endIndex);
    }, [currentPage, itemsPerPage, filteredProducts]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
     useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, category]);

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
                ) : paginatedProducts.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                            {paginatedProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                        <CardFooter className="mt-8">
                             <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                <div className="flex-1">
                                    Menampilkan {paginatedProducts.length} dari {filteredProducts.length} produk.
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <p>Baris per halaman</p>
                                        <Select
                                            value={`${itemsPerPage}`}
                                            onValueChange={(value) => {
                                                setItemsPerPage(Number(value));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px]">
                                                <SelectValue placeholder={itemsPerPage} />
                                            </SelectTrigger>
                                            <SelectContent side="top">
                                                {[24, 48, 96].map((pageSize) => (
                                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                                        {pageSize}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>Halaman {currentPage} dari {totalPages}</div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardFooter>
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
