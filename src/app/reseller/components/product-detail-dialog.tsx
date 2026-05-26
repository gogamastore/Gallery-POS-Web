"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import Link from "next/link"

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


export function ProductDetailDialog({ product, children }: { product: Product, children: React.ReactNode }) {
    const { addToCart } = useCart();
    
    const handleAddToCart = async () => {
        await addToCart(product, 1);
    }
    
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative aspect-square w-full">
                         <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover rounded-md"
                        />
                         {product.isPromo && (
                            <Badge variant="destructive" className="absolute top-2 left-2">PROMO</Badge>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                             {product.isPromo && product.discountPrice ? (
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-primary">{formatCurrency(product.discountPrice)}</p>
                                    <p className="text-md text-muted-foreground line-through mt-1">{formatCurrency(product.price)}</p>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
                            )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                            {product.description || "Deskripsi produk tidak tersedia."}
                        </p>
                        
                        <div className="text-sm">
                           <span className="font-semibold">Stok:</span> {product.stock > 0 ? `${product.stock} tersedia` : 'Habis'}
                        </div>

                    </div>
                </div>
                 <DialogFooter className="flex-col sm:flex-row sm:justify-between w-full mt-4">
                     <Button asChild variant="outline">
                        <Link href={`/reseller/products/${product.id}`}>Lihat Halaman Produk</Link>
                    </Button>
                    <Button onClick={handleAddToCart} disabled={product.stock === 0}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {product.stock > 0 ? 'Tambah ke Keranjang' : 'Stok Habis'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}