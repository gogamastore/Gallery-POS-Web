
"use client"

import ProductGrid from "@/components/home/product-grid";
import { TrendingUp } from "lucide-react";

// Halaman Produk Trending: daftar produk terlaris (urut berdasarkan soldCount).
// Katalog penuh kini ada di /reseller/catalog.
export default function TrendingPage() {
    return (
        <div className="flex flex-col animate-in fade-in-0 duration-500">
            <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 pt-6">
                <div className="flex items-center gap-3">
                    <TrendingUp className="h-7 w-7 text-primary" />
                    <h1 className="text-xl font-bold md:text-2xl">Produk Trending</h1>
                    <p className="hidden text-sm text-muted-foreground sm:block">
                        Produk terlaris berdasarkan jumlah terjual.
                    </p>
                </div>
            </div>
            <ProductGrid searchTerm="" category="Semua" trending />
        </div>
    );
}
