"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LayoutGrid, Loader2 } from "lucide-react";
import ProductGrid from "@/components/home/product-grid";

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
}

function CategoriesInner() {
  const params = useSearchParams();
  const parentId = params.get("parent") || "";
  const [categories, setCategories] = useState<Category[]>([]);
  // Nama sub-kategori milik induk — dipakai memfilter produk yang tampil
  // langsung di halaman induk (semua produk dari seluruh sub-kategorinya).
  const [childNames, setChildNames] = useState<string[]>([]);
  const [title, setTitle] = useState(parentId ? "Kategori" : "Semua Kategori");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "product_categories"), orderBy("name", "asc")));
        const allCats = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Category))
          .filter((c) => c.name?.trim());

        if (parentId) {
          // Tampilkan sub-kategori dari induk ini + semua produknya.
          const pSnap = await getDoc(doc(db, "category_parents", parentId));
          if (pSnap.exists()) {
            const p = pSnap.data();
            setTitle(p.name || "Kategori");
            const names = Array.isArray(p.children) ? (p.children as string[]).filter(Boolean) : [];
            setChildNames(names);
            const childSet = new Set(names);
            setCategories(allCats.filter((c) => childSet.has(c.name)));
          } else {
            setTitle("Kategori");
            setCategories([]);
            setChildNames([]);
          }
        } else {
          setTitle("Semua Kategori");
          setCategories(allCats);
          setChildNames([]);
        }
      } catch (error) {
        console.error("Gagal memuat kategori:", error);
        toast({ variant: "destructive", title: "Gagal memuat kategori" });
      } finally {
        setLoading(false);
      }
    })();
  }, [parentId, toast]);

  return (
    <div className="w-full py-6 md:py-8">
      <div className="container max-w-screen-2xl px-3 sm:px-4">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali</span>
          </Button>
          <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/reseller/products?category=${encodeURIComponent(cat.name)}`}>
                <Card className="group flex h-full flex-col items-center gap-2 p-3 transition-shadow hover:shadow-md">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-xl font-bold text-primary">{cat.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="line-clamp-2 text-center text-xs font-medium leading-tight">{cat.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed py-16 text-center text-muted-foreground">
            <LayoutGrid className="mx-auto mb-2 h-10 w-10" />
            <p>{parentId ? "Induk ini belum punya sub-kategori." : "Belum ada kategori."}</p>
          </div>
        )}

        {/* Halaman induk: tampilkan juga SEMUA produk dari seluruh sub-kategorinya. */}
        {!loading && parentId && childNames.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold md:text-xl">Produk {title}</h2>
            <ProductGrid searchTerm="" category="Semua" categories={childNames} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AllCategoriesPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Memuat…</div>}>
      <CategoriesInner />
    </Suspense>
  );
}
