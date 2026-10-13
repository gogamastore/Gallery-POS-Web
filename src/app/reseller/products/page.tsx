"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductFilters from "../components/product-filters";
import ProductGrid from "@/components/home/product-grid";
import CatalogParentBar from "@/components/reseller/catalog-parent-bar";
import { useResellerFilters } from "@/components/providers/reseller-filter-provider";

/**
 * Daftar produk reseller, difilter oleh query `?category=`. Dipakai oleh link
 * kategori (halaman "Semua Kategori", App Builder, dll.). Sebelumnya folder
 * ini hanya punya `[productId]` sehingga `/reseller/products?category=…` → 404.
 */
function ProductsInner() {
  const params = useSearchParams();
  const categoryParam = params.get("category") || "";
  const { searchTerm, setSearchTerm, category, setCategory } = useResellerFilters();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Ambil kategori dari URL (kategori yang diklik pembeli). Bila tak ada,
  // biarkan "Semua" (katalog penuh).
  useEffect(() => {
    setCategory(categoryParam || "Semua");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  return (
    <div className="flex flex-col gap-2 animate-in fade-in-0 duration-500">
      <CatalogParentBar />
      <ProductFilters
        onSearchChange={setSearchTerm}
        onCategoryChange={setCategory}
        initialSearchTerm={searchTerm}
        initialCategory={category}
        viewMode={viewMode}
        onViewChange={setViewMode}
        showSearch={false}
      />
      <ProductGrid searchTerm={searchTerm} category={category} viewMode={viewMode} />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">Memuat…</div>}>
      <ProductsInner />
    </Suspense>
  );
}
