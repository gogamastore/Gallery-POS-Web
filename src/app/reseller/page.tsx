
"use client";

import HeroSection from "@/components/home/hero-section";
import ProductGrid from "@/components/home/product-grid";
import QuickAccessMenu from "@/components/home/quick-access-menu";
import FlashSaleSection from "@/components/home/flash-sale";
import ProductFilters from "./components/product-filters";
import { useFilter } from "@/hooks/use-reseller-filter";

export default function Home() {
  const { searchTerm, category, setSearchTerm, setCategory } = useFilter();

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-500">
      <HeroSection />
      <QuickAccessMenu />
      <FlashSaleSection />
      <ProductFilters 
        onSearchChange={setSearchTerm}
        onCategoryChange={setCategory}
        initialSearchTerm={searchTerm}
        initialCategory={category}
      />
      <ProductGrid 
        searchTerm={searchTerm}
        category={category}
      />
    </div>
  );
}
