
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCart } from "@/hooks/use-cart";
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowLeft, Loader2 } from "lucide-react";
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
  const { cart, updateQuantity, removeFromCart, totalAmount, clearCart, loading } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [invalidStockProducts, setInvalidStockProducts] = useState<string[]>([]);


  const handleProceedToCheckout = async () => {
    setIsCheckingStock(true);
    setInvalidStockProducts([]); // Reset previous errors
    const invalidProducts: { name: string; stock: number }[] = [];

    // Create a copy of the cart to iterate over
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
                // Product doesn't exist in the database anymore
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
      const invalidProductIds = cartToCheck.filter(item => 
        invalidProducts.some(p => p.name === item.name)
      ).map(item => item.id);

      setInvalidStockProducts(invalidProductIds);

      const errorMessages = invalidProducts.map(p => 
        `${p.name} (sisa stok: ${p.stock})`
      ).join(', ');

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
    <div className="container mx-auto px-4 py-8 pb-32 md:pb-8">
      <div className="flex items-center gap-4 mb-6">
         <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali</span>
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Keranjang Belanja</h1>
      </div>
      
      {loading ? (
           <div className="text-center py-20">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
                <p className="mt-4">Memuat keranjang...</p>
           </div>
      ) : cart.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-xl font-semibold">Keranjang Anda kosong</h2>
          <p className="mt-2 text-muted-foreground">
            Sepertinya Anda belum menambahkan produk apapun.
          </p>
          <Button asChild className="mt-6">
            <Link href="/reseller">Mulai Belanja</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
             <div className="bg-card rounded-lg border">
                {/* Mobile View */}
                <div className="lg:hidden">
                    <div className="space-y-4 p-2">
                        {cart.map(item => (
                            <div key={item.id} className={cn(
                                "flex items-start gap-3 border-b pb-4 last:border-b-0",
                                invalidStockProducts.includes(item.id) && "bg-destructive/10 rounded-md p-2"
                            )}>
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={72}
                                    height={72}
                                    className="rounded-md object-cover border"
                                />
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold leading-tight">{item.name}</p>
                                    <p className="text-base font-bold text-primary">{formatCurrency(item.finalPrice)}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                                className="w-12 h-7 text-center"
                                                min={1} max={item.stock}
                                            />
                                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    {invalidStockProducts.includes(item.id) && <p className="text-xs text-destructive font-medium">Stok tidak cukup</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desktop View */}
                <div className="hidden lg:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]"></TableHead>
                                <TableHead>Produk</TableHead>
                                <TableHead>Jumlah</TableHead>
                                <TableHead className="text-right">Harga Satuan</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cart.map((item) => (
                                <TableRow key={item.id} className={cn(invalidStockProducts.includes(item.id) && "bg-destructive/10")}>
                                    <TableCell>
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            width={80}
                                            height={80}
                                            className="rounded-md object-cover"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {item.name}
                                        {invalidStockProducts.includes(item.id) && <p className="text-xs text-destructive font-medium">Stok tidak cukup</p>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                                className="w-16 h-8 text-center"
                                                min={1} max={item.stock}
                                            />
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.finalPrice)}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {formatCurrency(item.finalPrice * item.quantity)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                                            <Trash2 className="h-5 w-5 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
             </div>
              <Button variant="outline" className="mt-4" onClick={clearCart}>
                <X className="mr-2 h-4 w-4"/>
                Kosongkan Keranjang
              </Button>
          </div>
          <div className="hidden lg:block space-y-6">
            <div className="bg-card rounded-lg border p-6 sticky top-20">
                <h2 className="text-xl font-semibold mb-4">Ringkasan Pesanan</h2>
                <div className="space-y-2">
                     <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>Diskon</span>
                        <span>- {formatCurrency(0)}</span>
                    </div>
                     <div className="flex justify-between text-lg font-bold pt-4 border-t">
                        <span>Total</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
                 <Button onClick={handleProceedToCheckout} className="w-full mt-6" size="lg" disabled={isCheckingStock}>
                    {isCheckingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Lanjutkan ke Pembayaran
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Footer for Mobile */}
      {cart.length > 0 && (
         <div className="lg:hidden fixed bottom-16 left-0 w-full bg-card border-t p-3 shadow-lg z-40">
            <div className="container mx-auto px-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-lg text-primary">{formatCurrency(totalAmount)}</p>
                </div>
                <Button onClick={handleProceedToCheckout} disabled={isCheckingStock}>
                    {isCheckingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Lanjutkan
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
