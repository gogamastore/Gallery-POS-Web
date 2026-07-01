
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LayoutGrid, List } from "lucide-react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductCategory {
    id: string;
    name: string;
}

interface ProductFiltersProps {
    onSearchChange: (term: string) => void;
    onCategoryChange: (category: string) => void;
    initialSearchTerm?: string;
    initialCategory?: string;
    viewMode?: "grid" | "list";
    onViewChange?: (mode: "grid" | "list") => void;
}

export default function ProductFilters({ onSearchChange, onCategoryChange, initialSearchTerm = "", initialCategory = "Semua", viewMode = "grid", onViewChange }: ProductFiltersProps) {
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [localSearch, setLocalSearch] = useState(initialSearchTerm);
    const [localCategory, setLocalCategory] = useState(initialCategory);

    // State to prevent hydration mismatch.
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
      if(isMounted) {
        setLocalSearch(initialSearchTerm);
        setLocalCategory(initialCategory);
      }
    }, [initialSearchTerm, initialCategory, isMounted]);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "product_categories"), orderBy("name", "asc"));
                const querySnapshot = await getDocs(q);
                const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
                setCategories(fetchedCategories);
            } catch (error) {
                console.error("Error fetching categories:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);
    
    const handleReset = () => {
        setLocalSearch("");
        setLocalCategory("Semua");
        onSearchChange("");
        onCategoryChange("Semua");
    };
    
    if (!isMounted) {
        return (
            <section className="w-full py-6">
                <div className="container max-w-screen-2xl">
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                         <Skeleton className="h-10 w-full md:max-w-lg" />
                         <div className="w-full md:w-auto flex gap-2">
                             <Skeleton className="h-10 flex-1" />
                             <Skeleton className="h-10 w-[70px]" />
                         </div>
                    </div>
                </div>
            </section>
        );
    }


    return (
        <section className="w-full py-6">
            <div className="container max-w-screen-2xl">
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <div className="flex w-full items-center gap-2 md:max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari produk berdasarkan nama atau SKU..."
                                className="w-full rounded-full pl-9"
                                value={localSearch}
                                onChange={(e) => {
                                    setLocalSearch(e.target.value);
                                    onSearchChange(e.target.value);
                                }}
                            />
                        </div>
                        {onViewChange && (
                            <div className="flex shrink-0 items-center rounded-md border">
                                <Button
                                    type="button"
                                    variant={viewMode === "grid" ? "default" : "ghost"}
                                    size="icon"
                                    className="h-9 w-9 rounded-r-none"
                                    onClick={() => onViewChange("grid")}
                                    aria-label="Tampilan grid"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === "list" ? "default" : "ghost"}
                                    size="icon"
                                    className="h-9 w-9 rounded-l-none"
                                    onClick={() => onViewChange("list")}
                                    aria-label="Tampilan daftar"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-auto flex gap-2">
                        <Select
                            onValueChange={(value) => {
                                setLocalCategory(value);
                                onCategoryChange(value);
                            }}
                            value={localCategory}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Pilih Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Semua">Semua Kategori</SelectItem>
                                {loading ? (
                                    <SelectItem value="loading" disabled>Memuat...</SelectItem>
                                ) : (
                                    categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                         <Button onClick={handleReset} variant="outline">Reset</Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
