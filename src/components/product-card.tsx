
"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Loader2, Star } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useAppLayout } from "@/components/storefront-builder/use-app-layout";
import Link from "next/link";

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
  ratingAvg?: number;
  ratingCount?: number;
}

const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : value;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(num);
}

export default function ProductCard({ product, showStockProgress = false }: { product: Product, showStockProgress?: boolean }) {
  const { addToCart, loading: cartLoading } = useCart();
  const { toast } = useToast();
  // Rating ditampilkan sesuai toggle "Tampilkan Rating" di App Builder (katalog).
  const { layout } = useAppLayout();
  const showRating = layout.catalog.card.showRating && (product.ratingCount ?? 0) > 0;

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    // Tunggu keranjang selesai dimuat agar batas 160 produk unik akurat.
    if (cartLoading) return;
    try {
      await addToCart(product, 1);
    } catch (error) {
       toast({
          variant: "destructive",
          title: "Gagal menambahkan ke keranjang",
          description: "Terjadi kesalahan, silakan coba lagi.",
        });
    }
  };

  const finalPrice = product.isPromo && product.discountPrice ? product.discountPrice : product.price;

  return (
    <Card className="overflow-hidden group w-full h-full flex flex-col">
      <Link href={`/reseller/products/${product.id}`} className="block cursor-pointer">
        <div className="relative aspect-square w-full">
            <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            />
            {product.isPromo && (
                <Badge variant="destructive" className="absolute top-2 left-2">PROMO</Badge>
            )}
             {product.stock === 0 && (
                <Badge variant="secondary" className="absolute top-2 right-2">Stok Habis</Badge>
            )}
        </div>
      </Link>
      <CardContent className="p-3 flex-1 flex flex-col justify-between">
        <div>
           <Link href={`/reseller/products/${product.id}`}>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 cursor-pointer hover:text-primary">{product.name}</h3>
          </Link>
          {showRating && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{(product.ratingAvg ?? 0).toFixed(1)}</span>
              <span>({product.ratingCount})</span>
            </div>
          )}
          <div className="mt-2">
            {product.isPromo && (
                 <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</p>
            )}
            <p className="text-base font-bold text-primary">{formatCurrency(finalPrice)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleAddToCart} disabled={product.stock === 0 || cartLoading}>
            {cartLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            ) : (
                <ShoppingCart className="mr-2 h-4 w-4"/>
            )}
            {product.stock === 0 ? "Stok Habis" : cartLoading ? "Menyiapkan…" : "Tambah"}
        </Button>
      </CardContent>
    </Card>
  );
}
