
"use client"

import { useState } from "react";
import ProductFilters from "../components/product-filters";
import ProductGrid from "@/components/home/product-grid";

export default function CatalogPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [category, setCategory] = useState("Semua");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    return (
        <div className="flex flex-col gap-2 animate-in fade-in-0 duration-500">
            <ProductFilters
                onSearchChange={setSearchTerm}
                onCategoryChange={setCategory}
                initialSearchTerm={searchTerm}
                initialCategory={category}
                viewMode={viewMode}
                onViewChange={setViewMode}
            />
            <ProductGrid searchTerm={searchTerm} category={category} viewMode={viewMode} />
        </div>
    );
}
