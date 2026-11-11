
"use client"

import ProductGrid from "@/components/home/product-grid";
import CatalogParentBar from "@/components/reseller/catalog-parent-bar";
import { useResellerFilters } from "@/components/providers/reseller-filter-provider";

export default function CatalogPage() {
    // Kata kunci pencarian dan mode tampilan (grid/list) dimiliki bersama dengan
    // kotak pencarian + toggle di app bar (lihat reseller-header), jadi diambil
    // dari context.
    const { searchTerm, category, viewMode } = useResellerFilters();

    return (
        <div className="flex flex-col gap-2 animate-in fade-in-0 duration-500">
            <CatalogParentBar />
            <ProductGrid searchTerm={searchTerm} category={category} viewMode={viewMode} />
        </div>
    );
}
