
"use client"

import { useState } from "react";
import ProductFilters from "../components/product-filters";
import ProductGrid from "@/components/home/product-grid";
import CatalogParentBar from "@/components/reseller/catalog-parent-bar";
import { useResellerFilters } from "@/components/providers/reseller-filter-provider";

export default function CatalogPage() {
    // Kata kunci pencarian kini dimiliki bersama dengan kotak pencarian di
    // app bar (lihat reseller-header), jadi diambil dari context.
    const { searchTerm, setSearchTerm, category, setCategory } = useResellerFilters();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
