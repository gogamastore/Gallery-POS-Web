
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
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import {
  Loader2,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Scale,
  Boxes,
  Tag,
  Star,
  RotateCcw,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  'data-ai-hint'?: string;
  stock: number;
  description?: string;
  category?: string;
  sku?: string;
  weightGram?: number;
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
  const numericPrice = Number(String(product.price).replace(/[^0-9]/g, ""));
  const numericDiscount = product.discountPrice
    ? Number(String(product.discountPrice).replace(/[^0-9]/g, ""))
    : 0;
  const discountPercent =
    product.isPromo && numericDiscount > 0 && numericPrice > 0
      ? Math.round(((numericPrice - numericDiscount) / numericPrice) * 100)
      : 0;

  return (
    <div className="pb-28 md:pb-12">
        <div className="container mx-auto px-4 py-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-3 text-muted-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Kembali
            </Button>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Gallery */}
                <div className="md:sticky md:top-24 self-start">
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted shadow-sm">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            priority
                        />
                        {product.isPromo && discountPercent > 0 && (
                            <div className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-sm font-bold text-destructive-foreground shadow">
                                -{discountPercent}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        {product.category && (
                            <Badge variant="secondary" className="rounded-full">{product.category}</Badge>
                        )}
                        <h1 className="text-2xl sm:text-3xl font-bold font-headline leading-tight">{product.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 text-amber-500">
                                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                            </span>
                            <span>·</span>
                            <span>Terjual banyak</span>
                            {product.sku && (
                                <>
                                    <span>·</span>
                                    <span className="hidden sm:inline">SKU {product.sku}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Price block */}
                    <div className="rounded-2xl bg-muted/50 p-5">
                        {product.isPromo && product.discountPrice ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(product.discountPrice)}</p>
                                    {discountPercent > 0 && (
                                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-sm font-semibold text-destructive">
                                            -{discountPercent}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-base text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                            </div>
                        ) : (
                            <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(product.price)}</p>
                        )}
                    </div>

                    {/* Highlight chips */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Boxes className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Stok</p>
                                <p className="text-sm font-semibold">{stockAvailable ? `${product.stock} tersedia` : 'Habis'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Scale className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Berat</p>
                                <p className="text-sm font-semibold">{product.weightGram ? `${product.weightGram} gram` : '200 gram'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Truck className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Dikirim dari</p>
                                <p className="text-sm font-semibold">Makassar</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <Tag className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Kategori</p>
                                <p className="text-sm font-semibold truncate">{product.category || 'Umum'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-500" /> Produk Original</span>
                        <span className="flex items-center gap-1.5"><RotateCcw className="h-4 w-4 text-blue-500" /> Garansi Toko</span>
                    </div>

                    {/* Desktop quantity + add to cart */}
                    <div className="hidden md:block">
                        <Separator className="my-2" />
                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="quantity-desktop" className="text-sm text-muted-foreground">Jumlah</Label>
                                <div className="flex items-center rounded-lg border">
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-r-none" onClick={() => handleQuantityChange(quantity - 1)} disabled={!stockAvailable || quantity <= 1}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        id="quantity-desktop"
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                                        className="w-14 h-11 border-0 text-center text-lg font-bold focus-visible:ring-0"
                                        min={1}
                                        max={product.stock}
                                        disabled={!stockAvailable}
                                    />
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-l-none" onClick={() => handleQuantityChange(quantity + 1)} disabled={!stockAvailable || quantity >= product.stock}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <Button onClick={handleAddToCart} size="lg" className="flex-1 font-headline text-base h-12" disabled={!stockAvailable || isAddingToCart}>
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
            </div>

            {/* Details */}
            <div className="mt-10 lg:mt-14 max-w-3xl">
                <Accordion type="multiple" defaultValue={["description", "specifications"]} className="w-full">
                    <AccordionItem value="description">
                        <AccordionTrigger className="text-lg font-headline">Deskripsi Produk</AccordionTrigger>
                        <AccordionContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/80 leading-relaxed">
                            {product.description || "Tidak ada deskripsi untuk produk ini."}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="specifications">
                        <AccordionTrigger className="text-lg font-headline">Spesifikasi</AccordionTrigger>
                        <AccordionContent>
                            <dl className="divide-y text-sm">
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-muted-foreground">Kategori</dt>
                                    <dd className="font-medium">{product.category || '-'}</dd>
                                </div>
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-muted-foreground">Berat</dt>
                                    <dd className="font-medium">{product.weightGram ? `${product.weightGram} gram` : '200 gram'}</dd>
                                </div>
                                {product.sku && (
                                    <div className="flex justify-between py-2.5">
                                        <dt className="text-muted-foreground">SKU</dt>
                                        <dd className="font-medium">{product.sku}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-muted-foreground">Stok</dt>
                                    <dd className="font-medium">{stockAvailable ? `${product.stock} tersedia` : 'Habis'}</dd>
                                </div>
                            </dl>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>

        {/* Sticky Add to Cart for Mobile */}
        <div className="md:hidden fixed bottom-16 left-0 z-40 w-full bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="container h-20 mx-auto px-4 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-lg border">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-r-none" onClick={() => handleQuantityChange(quantity - 1)} disabled={!stockAvailable || quantity <= 1}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        id="quantity-mobile"
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                        className="w-12 h-10 border-0 text-center font-bold focus-visible:ring-0"
                        min={1}
                        max={product.stock}
                        disabled={!stockAvailable}
                    />
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-l-none" onClick={() => handleQuantityChange(quantity + 1)} disabled={!stockAvailable || quantity >= product.stock}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <Button onClick={handleAddToCart} size="lg" className="flex-1 font-headline h-12" disabled={!stockAvailable || isAddingToCart}>
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
