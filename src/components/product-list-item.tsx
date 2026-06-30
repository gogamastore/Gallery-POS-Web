
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

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

const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};

export default function ProductListItem({ product }: { product: Product }) {
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
  const numericPrice = Number(String(product.price).replace(/[^0-9]/g, ""));
  const numericFinal = Number(String(finalPrice).replace(/[^0-9]/g, ""));
  const discountPercent =
    product.isPromo && numericFinal > 0 && numericPrice > numericFinal
      ? Math.round(((numericPrice - numericFinal) / numericPrice) * 100)
      : 0;

  return (
    <div className="flex gap-3 p-3 bg-card">
      <Link
        href={`/reseller/products/${product.id}`}
        className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md border"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="112px"
        />
        {discountPercent > 0 && (
          <span className="absolute top-0 right-0 rounded-bl-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
            -{discountPercent}%
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="text-xs font-bold text-white">Stok Habis</span>
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/reseller/products/${product.id}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-tight hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p
          className={`mt-1 text-xs font-medium ${
            product.stock > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {product.stock > 0 ? `Stok: ${product.stock}` : "Stok habis"}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {product.isPromo && (
              <p className="truncate text-xs text-muted-foreground line-through">
                {formatCurrency(product.price)}
              </p>
            )}
            <p className="text-base font-bold text-primary">{formatCurrency(finalPrice)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>
    </div>
  );
}
