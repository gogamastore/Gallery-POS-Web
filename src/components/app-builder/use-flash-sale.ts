"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  documentId,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parsePrice } from "@/lib/price";
import {
  FlashSale,
  flashSaleFromDoc,
  flashSaleStatus,
  type FlashSaleStatus,
} from "@/lib/flash-sale";
import type { PreviewProduct } from "./preview-data";

/**
 * Hook REALTIME untuk blok Flash Sale di beranda reseller.
 * - Mendengarkan koleksi `flash_sales` (onSnapshot) + timer agar status
 *   (teaser → aktif → berakhir) berubah otomatis tanpa refresh.
 * - Memilih SATU event untuk ditampilkan: yang sedang "aktif" diprioritaskan,
 *   jika tidak ada → event "teaser" (cooldown) yang paling dekat mulai.
 * - Mengambil detail produk event terpilih (nama, gambar, harga normal, stok).
 */

export interface FlashSaleView {
  loading: boolean;
  event: FlashSale | null;
  status: FlashSaleStatus | null;
  products: PreviewProduct[];
  /** productId → harga flash. */
  flashPrices: Record<string, number>;
}

const toProduct = (id: string, d: DocumentData): PreviewProduct => ({
  id,
  name: d.name ?? "",
  price: parsePrice(d.price),
  image: d.image ?? "",
  category: d.category ?? "",
  stock: Number(d.stock ?? 0) || 0,
  ratingAvg: Number(d.ratingAvg ?? 0) || 0,
  ratingCount: Number(d.ratingCount ?? 0) || 0,
  soldCount: Number(d.soldCount ?? 0) || 0,
});

async function fetchByIds(ids: string[]): Promise<PreviewProduct[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, "products"), where(documentId(), "in", chunk)))
    )
  );
  const map = new Map<string, PreviewProduct>();
  results.forEach((snap) =>
    snap.docs.forEach((d) => map.set(d.id, toProduct(d.id, d.data())))
  );
  // Pertahankan urutan id dari event.
  return unique.map((id) => map.get(id)).filter((p): p is PreviewProduct => !!p);
}

/** Pilih event yang tampil: aktif dulu, lalu teaser terdekat. */
function pickEvent(
  events: FlashSale[],
  now: Date
): { event: FlashSale; status: FlashSaleStatus } | null {
  const withStatus = events.map((e) => ({ e, s: flashSaleStatus(e, now) }));
  const active = withStatus
    .filter((x) => x.s === "active")
    .sort((a, b) => a.e.startAt.getTime() - b.e.startAt.getTime());
  if (active.length) return { event: active[0].e, status: "active" };
  const teaser = withStatus
    .filter((x) => x.s === "teaser")
    .sort((a, b) => a.e.startAt.getTime() - b.e.startAt.getTime());
  if (teaser.length) return { event: teaser[0].e, status: "teaser" };
  return null;
}

export function useFlashSale(): FlashSaleView {
  const [events, setEvents] = useState<FlashSale[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [subLoaded, setSubLoaded] = useState(false);
  const [productState, setProductState] = useState<{
    key: string;
    products: PreviewProduct[];
  }>({ key: "", products: [] });

  // Realtime: dengarkan seluruh event flash sale.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "flash_sales"),
      (snap) => {
        setEvents(snap.docs.map((d) => flashSaleFromDoc(d.id, d.data())));
        setSubLoaded(true);
      },
      (err) => {
        console.error("Gagal memuat flash sale", err);
        setSubLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  // Timer: perbarui "now" tiap 5 detik agar transisi waktu terasa realtime.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  const picked = useMemo(() => pickEvent(events, now), [events, now]);

  const productKey = picked
    ? `${picked.event.id}:${picked.event.products.map((p) => p.productId).join(",")}`
    : "";

  // Ambil detail produk saat event/daftar produk berubah.
  useEffect(() => {
    let active = true;
    if (!picked) {
      setProductState({ key: "", products: [] });
      return;
    }
    fetchByIds(picked.event.products.map((p) => p.productId)).then((products) => {
      if (active) setProductState({ key: productKey, products });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productKey]);

  const flashPrices = useMemo(() => {
    const m: Record<string, number> = {};
    picked?.event.products.forEach((p) => (m[p.productId] = p.flashPrice));
    return m;
  }, [picked]);

  const productsReady = picked ? productState.key === productKey : true;

  return {
    loading: !subLoaded || !productsReady,
    event: picked?.event ?? null,
    status: picked?.status ?? null,
    products: productsReady ? productState.products : [],
    flashPrices,
  };
}
