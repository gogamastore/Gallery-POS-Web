"use client";

import { useEffect, useState } from "react";
import {
  collection,
  documentId,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parsePrice } from "@/lib/price";
import type { ProductBlockConfig } from "./schema";

/** Data nyata dari Firestore untuk preview App Builder. */

export interface PreviewProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
}

export interface PreviewBanner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

export interface PreviewBrand {
  id: string;
  name: string;
  logoUrl: string;
}

export interface PreviewParent {
  id: string;
  name: string;
  imageUrl: string;
  children: string[];
}

export interface PreviewData {
  loading: boolean;
  banners: PreviewBanner[];
  brands: PreviewBrand[];
  categories: string[];
  parents: PreviewParent[];
  /** productId → harga promo aktif. */
  promos: Record<string, number>;
}

const toProduct = (id: string, d: DocumentData): PreviewProduct => ({
  id,
  name: d.name ?? "",
  price: parsePrice(d.price),
  image: d.image ?? "",
  category: d.category ?? "",
  stock: Number(d.stock ?? 0) || 0,
});

const toMillis = (v: unknown): number => {
  if (v && typeof v === "object" && "toMillis" in v) return (v as { toMillis: () => number }).toMillis();
  if (v instanceof Date) return v.getTime();
  return NaN;
};

async function fetchByIds(ids: string[]): Promise<PreviewProduct[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, "products"), where(documentId(), "in", chunk))),
    ),
  );
  const map = new Map<string, PreviewProduct>();
  results.forEach((snap) => snap.docs.forEach((d) => map.set(d.id, toProduct(d.id, d.data()))));
  // Pertahankan urutan id asal (urutan trending/promo).
  return unique.map((id) => map.get(id)).filter((p): p is PreviewProduct => !!p);
}

async function fetchActivePromos(): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, "promotions"));
  const now = Date.now();
  const promos: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const start = toMillis(data.startDate);
    const end = toMillis(data.endDate);
    if (!(start <= now && now <= end) || !data.productId) return;
    promos[data.productId] = parsePrice(data.discountPrice);
  });
  return promos;
}

// Cache per sesi halaman supaya mengganti tampilan kartu tidak memicu query ulang.
const sourceCache = new Map<string, Promise<PreviewProduct[]>>();
let promoCache: Promise<Record<string, number>> | null = null;

function fetchSource(cfg: ProductBlockConfig): Promise<PreviewProduct[]> {
  const fetchLimit = cfg.hideOutOfStock ? cfg.limit * 3 : cfg.limit;
  const key = `${cfg.source}|${cfg.category}|${cfg.brandId}|${fetchLimit}`;
  const cached = sourceCache.get(key);
  if (cached) return cached;

  const run = async (): Promise<PreviewProduct[]> => {
    const products = collection(db, "products");
    switch (cfg.source) {
      case "trending": {
        const snap = await getDocs(collection(db, "trending_products"));
        return fetchByIds(snap.docs.map((d) => d.data().productId as string));
      }
      case "promo": {
        promoCache ??= fetchActivePromos();
        return fetchByIds(Object.keys(await promoCache));
      }
      case "category": {
        if (!cfg.category) return [];
        const snap = await getDocs(query(products, where("category", "==", cfg.category), fsLimit(fetchLimit)));
        return snap.docs.map((d) => toProduct(d.id, d.data()));
      }
      case "brand": {
        if (!cfg.brandId) return [];
        const snap = await getDocs(query(products, where("brandId", "==", cfg.brandId), fsLimit(fetchLimit)));
        return snap.docs.map((d) => toProduct(d.id, d.data()));
      }
      default: {
        const snap = await getDocs(query(products, orderBy("purchaseAt", "desc"), fsLimit(fetchLimit)));
        return snap.docs.map((d) => toProduct(d.id, d.data()));
      }
    }
  };

  const promise = run().catch((e) => {
    console.error("Gagal memuat produk preview", e);
    sourceCache.delete(key);
    return [] as PreviewProduct[];
  });
  sourceCache.set(key, promise);
  return promise;
}

/** Sama dengan `prepareProducts` di Flutter. */
export function prepareProducts(items: PreviewProduct[], cfg: ProductBlockConfig): PreviewProduct[] {
  const list = cfg.hideOutOfStock ? items.filter((p) => p.stock > 0) : [...items];
  switch (cfg.sort) {
    case "priceAsc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "priceDesc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "nameAsc":
      list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      break;
    case "stockDesc":
      list.sort((a, b) => b.stock - a.stock);
      break;
  }
  return list.slice(0, cfg.limit);
}

export function useSourceProducts(cfg: ProductBlockConfig) {
  const [state, setState] = useState<{ key: string; products: PreviewProduct[] } | null>(null);
  const key = `${cfg.source}|${cfg.category}|${cfg.brandId}|${cfg.limit}|${cfg.hideOutOfStock}`;

  useEffect(() => {
    let active = true;
    fetchSource(cfg).then((products) => {
      if (active) setState({ key, products });
    });
    return () => {
      active = false;
    };
    // cfg dibaca lewat key; objek cfg berubah setiap edit tampilan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = state?.key === key;
  return { loading: !ready, products: ready ? state.products : [] };
}

export function usePreviewData(): PreviewData {
  const [data, setData] = useState<PreviewData>({
    loading: true,
    banners: [],
    brands: [],
    categories: [],
    parents: [],
    promos: {},
  });

  useEffect(() => {
    let active = true;
    (async () => {
      promoCache ??= fetchActivePromos();
      // allSettled: satu koleksi gagal dimuat tidak mengosongkan preview lain.
      const [bannerRes, brandRes, categoryRes, parentRes, promoRes] = await Promise.allSettled([
        getDocs(query(collection(db, "banners"), orderBy("order", "asc"))),
        getDocs(query(collection(db, "brands"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "product_categories"), orderBy("name", "asc"))),
        getDocs(query(collection(db, "category_parents"), orderBy("name", "asc"))),
        promoCache,
      ]);
      if (!active) return;
      [bannerRes, brandRes, categoryRes, parentRes, promoRes].forEach((r) => {
        if (r.status === "rejected") console.error("Gagal memuat data preview", r.reason);
      });
      const docsOf = (r: PromiseSettledResult<{ docs: QueryDocumentSnapshot[] }>) =>
        r.status === "fulfilled" ? r.value.docs : [];
      setData({
        loading: false,
        banners: docsOf(bannerRes)
          .filter((d) => d.data().isActive !== false)
          .map((d) => ({
            id: d.id,
            imageUrl: d.data().imageUrl ?? "",
            title: d.data().title ?? "",
            description: d.data().description ?? "",
          })),
        brands: docsOf(brandRes).map((d) => ({
          id: d.id,
          name: d.data().name ?? "",
          logoUrl: d.data().logoUrl ?? "",
        })),
        categories: docsOf(categoryRes)
          .map((d) => String(d.data().name ?? "").trim())
          .filter(Boolean),
        parents: docsOf(parentRes)
          .map((d) => ({
            id: d.id,
            name: String(d.data().name ?? "").trim(),
            imageUrl: String(d.data().imageUrl ?? ""),
            children: Array.isArray(d.data().children) ? (d.data().children as string[]) : [],
          }))
          .filter((p) => p.name),
        promos: promoRes.status === "fulfilled" ? promoRes.value : {},
      });
    })().catch((e) => {
      console.error("Gagal memuat data preview", e);
      if (active) setData((d) => ({ ...d, loading: false }));
    });
    return () => {
      active = false;
    };
  }, []);

  return data;
}
