
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { Minus, Plus, ShoppingCart, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};


export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, totalAmount, loading } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [invalidStockProducts, setInvalidStockProducts] = useState<string[]>([]);


  const handleProceedToCheckout = async () => {
    setIsCheckingStock(true);
    setInvalidStockProducts([]); // Reset previous errors
    const invalidProducts: { name: string; stock: number }[] = [];

    const cartToCheck = [...cart];

    for (const item of cartToCheck) {
      const productRef = doc(db, "products", item.id);
      try {
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          if (currentStock < item.quantity) {
            invalidProducts.push({ name: item.name, stock: currentStock });
          }
        } else {
          invalidProducts.push({ name: item.name, stock: 0 });
        }
      } catch (error) {
        console.error("Error checking stock for product:", item.id, error);
        toast({
          variant: "destructive",
          title: "Gagal memvalidasi stok",
          description: "Terjadi kesalahan koneksi, silakan coba lagi.",
        });
        setIsCheckingStock(false);
        return;
      }
    }

    if (invalidProducts.length > 0) {
      const invalidProductIds = cartToCheck
        .filter((item) => invalidProducts.some((p) => p.name === item.name))
        .map((item) => item.id);

      setInvalidStockProducts(invalidProductIds);

      const errorMessages = invalidProducts
        .map((p) => `${p.name} (sisa stok: ${p.stock})`)
        .join(", ");

      toast({
        variant: "destructive",
        title: "Stok Produk Tidak Mencukupi",
        description: `Stok untuk: ${errorMessages}. Silakan hapus atau kurangi jumlahnya untuk melanjutkan.`,
        duration: 8000,
      });
    } else {
      router.push("/reseller/checkout");
    }

    setIsCheckingStock(false);
  };


  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col px-4 py-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Kembali</span>
        </Button>
        <h1 className="text-xl font-bold">Keranjang Belanja</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="mt-4">Memuat keranjang...</p>
        </div>
      ) : cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">Keranjang Kosong</h2>
          <p className="mt-1 text-muted-foreground">Belum ada produk di keranjang Anda</p>
          <Button asChild className="mt-6">
            <Link href="/reseller">Mulai Belanja</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* List item */}
          <div className="flex-1 space-y-3">
            {cart.map((item) => {
              const isOutOfStock = invalidStockProducts.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm",
                    isOutOfStock && "border-destructive/40 bg-destructive/5"
                  )}
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-md border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="mt-0.5 text-sm font-medium text-orange-600">
                      {formatCurrency(item.finalPrice)}
                    </p>
                    {isOutOfStock && (
                      <p className="mt-0.5 text-xs font-bold text-destructive">
                        Stok sisa: {item.stock}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                      className="h-7 w-10 border-0 p-0 text-center text-sm focus-visible:ring-0"
                      min={1}
                      max={item.stock}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Total + Checkout */}
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">Total Produk:</span>
              <span className="text-base font-medium text-slate-500">
                {cart.length} Produk
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">Total Harga:</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <Button
              onClick={handleProceedToCheckout}
              className="w-full"
              size="lg"
              disabled={isCheckingStock}
            >
              {isCheckingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
