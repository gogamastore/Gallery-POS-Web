
"use client"

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, getDocs, query, where, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import ProductCard from "@/components/product-card";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface Brand {
    id: string;
    name: string;
    logoUrl: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
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


export default function BrandProductsPage() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const brandId = params.brandId as string;

  const fetchBrandProducts = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);

    try {
        const brandDocRef = doc(db, 'brands', brandId);
        const brandDoc = await getDoc(brandDocRef);
        if (!brandDoc.exists()) {
            toast({ variant: 'destructive', title: 'Brand tidak ditemukan.' });
            router.push('/reseller');
            return;
        }
        setBrand({ id: brandDoc.id, ...brandDoc.data() } as Brand);
        
        const productsQuery = query(collection(db, 'products'), where('brandId', '==', brandId));
        const productsSnapshot = await getDocs(productsQuery);
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

        setProducts(finalProducts);

    } catch (error) {
      console.error("Failed to fetch brand products:", error);
      toast({ variant: "destructive", title: "Gagal memuat produk." });
    } finally {
      setLoading(false);
    }
  }, [brandId, router, toast]);

  useEffect(() => {
    fetchBrandProducts();
  }, [fetchBrandProducts]);

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
             <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali</span>
            </Button>
            {brand && (
                <div className="flex items-center gap-3">
                    <Image src={brand.logoUrl} alt={brand.name} width={40} height={40} className="rounded-md object-contain bg-muted p-1" />
                    <h1 className="text-3xl font-bold font-headline">{brand.name}</h1>
                </div>
            )}
        </div>

        {loading ? (
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
        ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                {products.map((product) => (
                   <ProductCard key={product.id} product={product} />
                ))}
            </div>
        ) : (
            <div className="text-center py-10 text-muted-foreground">
                <p>Belum ada produk untuk brand ini.</p>
            </div>
        )}
    </div>
  )
}
