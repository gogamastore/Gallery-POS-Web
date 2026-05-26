
"use client"

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { Loader2, ChevronLeft, Minus, Plus, ShoppingCart, ShieldCheck, Truck } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  'data-ai-hint'?: string;
  stock: number;
  description?: string;
  category?: string;
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

export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const productId = params.productId as string;

  const fetchProductDetails = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        toast({ variant: "destructive", title: "Produk tidak ditemukan." });
        router.push("/reseller");
        return;
      }
      
      let productData: Product = { id: productSnap.id, ...productSnap.data() } as Product;

      // Check for active promotions
      const now = new Date();
      const promoQuery = query(
          collection(db, "promotions"), 
          where("productId", "==", productId),
          where("endDate", ">", now)
      );
      const promoSnapshot = await getDocs(promoQuery);
      if (!promoSnapshot.empty) {
          const promoData = promoSnapshot.docs[0].data() as Promotion;
           if (promoData.startDate.toDate() <= now) {
                productData.isPromo = true;
                productData.discountPrice = formatCurrency(promoData.discountPrice);
           }
      }

      setProduct(productData);

    } catch (error) {
      console.error("Error fetching product:", error);
      toast({ variant: "destructive", title: "Gagal memuat detail produk." });
    } finally {
      setLoading(false);
    }
  }, [productId, router, toast]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);
  
  const handleQuantityChange = (newQuantity: number) => {
    if (product && newQuantity >= 1 && newQuantity <= product.stock) {
        setQuantity(newQuantity);
    }
  }

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    try {
        await addToCart(product, quantity);
        // Success toast is handled in the cart hook
    } catch (error) {
        // Error toast is handled in the cart hook
    } finally {
        setIsAddingToCart(false);
    }
  }


  if (loading) {
    return <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[80vh]"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  if (!product) {
    return <div className="container mx-auto px-4 py-8 text-center">Produk tidak ditemukan.</div>;
  }

  const stockAvailable = product.stock > 0;
  const displayPrice = (product.isPromo && product.discountPrice) ? product.discountPrice : product.price;

  return (
    <div className="pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali
            </Button>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="grid gap-4">
                    <div className="aspect-square w-full overflow-hidden rounded-lg border">
                        <Image
                            src={product.image}
                            alt={product.name}
                            width={600}
                            height={600}
                            className="h-full w-full object-cover"
                            priority
                        />
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                        {product.category && <Badge variant="secondary" className="mb-2">{product.category}</Badge>}
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-headline">{product.name}</h1>
                    </div>

                    <div>
                        {product.isPromo && product.discountPrice ? (
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(product.discountPrice)}</p>
                                <p className="text-lg sm:text-xl text-muted-foreground line-through mt-1">{formatCurrency(product.price)}</p>
                            </div>
                        ) : (
                            <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(product.price)}</p>
                        )}
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Truck className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold text-foreground">Info Pengiriman</p>
                                    <p>Dikirim dari <span className="font-medium">Makassar</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                <p>Stok: <span className="font-medium text-foreground">{stockAvailable ? `${product.stock} Tersedia` : 'Habis'}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="quantity-desktop" className="sr-only">Jumlah</Label>
                            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => handleQuantityChange(quantity - 1)} disabled={!stockAvailable || quantity <= 1}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                id="quantity-desktop"
                                type="number"
                                value={quantity}
                                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                                className="w-20 h-11 text-center text-lg font-bold"
                                min={1}
                                max={product.stock}
                                disabled={!stockAvailable}
                            />
                            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => handleQuantityChange(quantity + 1)} disabled={!stockAvailable || quantity >= product.stock}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button onClick={handleAddToCart} size="lg" className="flex-1 font-headline text-base sm:text-lg" disabled={!stockAvailable || isAddingToCart}>
                            {isAddingToCart ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <ShoppingCart className="mr-2 h-5 w-5" />
                            )}
                            {stockAvailable ? 'Tambah ke Keranjang' : 'Stok Habis'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-12 lg:mt-16">
                <Accordion type="single" collapsible defaultValue="description" className="w-full">
                    <AccordionItem value="description">
                        <AccordionTrigger className="text-lg font-headline">Deskripsi Produk</AccordionTrigger>
                        <AccordionContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed">
                            {product.description || "Tidak ada deskripsi untuk produk ini."}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="specifications">
                        <AccordionTrigger className="text-lg font-headline">Spesifikasi</AccordionTrigger>
                        <AccordionContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed">
                            Spesifikasi belum tersedia.
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>

        {/* Sticky Add to Cart for Mobile */}
        <div className="md:hidden fixed bottom-16 left-0 z-40 w-full h-20 bg-background border-t">
            <div className="container h-full mx-auto px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => handleQuantityChange(quantity - 1)} disabled={!stockAvailable || quantity <= 1}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        id="quantity-mobile"
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                        className="w-16 h-10 text-center font-bold"
                        min={1}
                        max={product.stock}
                        disabled={!stockAvailable}
                    />
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => handleQuantityChange(quantity + 1)} disabled={!stockAvailable || quantity >= product.stock}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <Button onClick={handleAddToCart} size="lg" className="flex-1 font-headline" disabled={!stockAvailable || isAddingToCart}>
                    {isAddingToCart ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <ShoppingCart className="mr-2 h-5 w-5" />
                    )}
                    {stockAvailable ? 'Tambah' : 'Stok Habis'}
                </Button>
            </div>
        </div>
    </div>
  );
}
