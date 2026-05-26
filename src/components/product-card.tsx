
"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
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
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
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
          <div className="mt-2">
            {product.isPromo && (
                 <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</p>
            )}
            <p className="text-base font-bold text-primary">{formatCurrency(finalPrice)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleAddToCart} disabled={product.stock === 0}>
            <ShoppingCart className="mr-2 h-4 w-4"/>
            {product.stock > 0 ? "Tambah" : "Stok Habis"}
        </Button>
      </CardContent>
    </Card>
  );
}
