"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppLayout } from "@/components/storefront-builder/use-app-layout";
import { orderParents, type HomeBlock, type ParentCategoriesBlockConfig } from "@/components/app-builder/schema";

interface Parent {
  id: string;
  name: string;
  imageUrl: string;
}

/**
 * Bar "Induk Kategori" yang menempel (sticky) di bawah app bar halaman Katalog.
 * Muncul hanya bila admin mengaktifkan blok Induk Kategori + "Tampilkan di
 * halaman Katalog" di App Builder. Ketuk induk → halaman sub-kategorinya.
 */
export default function CatalogParentBar() {
  const { layout, hasConfig } = useAppLayout();
  const [parents, setParents] = useState<Parent[]>([]);

  const block = hasConfig
    ? (layout.blocks.find(
        (b) =>
          b.type === "parentCategories" &&
          b.enabled &&
          (b.config as ParentCategoriesBlockConfig).showInCatalog,
      ) as HomeBlock<"parentCategories"> | undefined)
    : undefined;

  useEffect(() => {
    if (!block) {
      setParents([]);
      return;
    }
    let active = true;
    getDocs(query(collection(db, "category_parents"), orderBy("name", "asc")))
      .then((snap) => {
        if (!active) return;
        setParents(
          snap.docs
            .map((d) => ({
              id: d.id,
              name: String(d.data().name ?? "").trim(),
              imageUrl: String(d.data().imageUrl ?? ""),
            }))
            .filter((p) => p.name),
        );
      })
      .catch(() => active && setParents([]));
    return () => {
      active = false;
    };
  }, [block?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!block || parents.length === 0) return null;
  const cfg = block.config as ParentCategoriesBlockConfig;
  const list = orderParents(parents, cfg.order).slice(0, cfg.limit);
  const chip = cfg.style === "chip";
  const image = cfg.style === "image"; // PNG datar tanpa lingkaran

  return (
    <div className="sticky top-16 z-30 border-b bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {list.map((p) =>
          chip ? (
            <Link
              key={p.id}
              href={`/reseller/categories?parent=${p.id}`}
              className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-primary/40 px-3 text-xs font-medium text-primary"
            >
              {p.name}
            </Link>
          ) : image ? (
            <Link key={p.id} href={`/reseller/categories?parent=${p.id}`} className="flex w-14 shrink-0 flex-col items-center gap-1">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="line-clamp-1 text-center text-[10px] leading-tight">{p.name}</span>
            </Link>
          ) : (
            <Link key={p.id} href={`/reseller/categories?parent=${p.id}`} className="flex w-14 shrink-0 flex-col items-center gap-1">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-bold text-primary">{p.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="line-clamp-1 text-center text-[10px] leading-tight">{p.name}</span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
