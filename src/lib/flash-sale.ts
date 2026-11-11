// Util & tipe bersama untuk fitur Flash Sale (koleksi `flash_sales`).
// Dipakai oleh halaman admin, beranda reseller, dan logika keranjang.

export interface FlashSaleProduct {
  productId: string;
  flashPrice: number;
}

export interface FlashSale {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  // Teaser muncul di beranda sejak (startAt - cooldownMinutes).
  cooldownMinutes: number;
  products: FlashSaleProduct[];
  // Batas qty per produk (null = tak dibatasi khusus).
  maxQtyPerBuyer: number | null;
  // true = pembeli hanya boleh checkout 1 produk & 1 pcs dari seluruh event ini.
  oneItemPerEvent: boolean;
  createdAt?: Date;
}

export type FlashSaleStatus = "upcoming" | "teaser" | "active" | "ended";

export function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

export function flashSaleFromDoc(id: string, data: Record<string, unknown>): FlashSale {
  const start = toDateSafe(data.startAt) ?? new Date();
  const end = toDateSafe(data.endAt) ?? new Date();
  const rawProducts = Array.isArray(data.products) ? data.products : [];
  const products: FlashSaleProduct[] = rawProducts
    .map((p): FlashSaleProduct => ({
      productId: String((p as Record<string, unknown>)?.productId ?? ""),
      flashPrice: Number((p as Record<string, unknown>)?.flashPrice) || 0,
    }))
    .filter((p) => p.productId);
  return {
    id,
    title: String(data.title ?? "Flash Sale"),
    startAt: start,
    endAt: end,
    cooldownMinutes: Number(data.cooldownMinutes) || 0,
    products,
    maxQtyPerBuyer:
      data.maxQtyPerBuyer == null ? null : Number(data.maxQtyPerBuyer) || null,
    oneItemPerEvent: data.oneItemPerEvent === true,
    createdAt: toDateSafe(data.createdAt) ?? undefined,
  };
}

export function teaserStart(fs: { startAt: Date; cooldownMinutes: number }): Date {
  return new Date(fs.startAt.getTime() - fs.cooldownMinutes * 60_000);
}

export function flashSaleStatus(
  fs: { startAt: Date; endAt: Date; cooldownMinutes: number },
  now: Date = new Date()
): FlashSaleStatus {
  const t = now.getTime();
  if (t >= fs.endAt.getTime()) return "ended";
  if (t >= fs.startAt.getTime()) return "active";
  if (t >= teaserStart(fs).getTime()) return "teaser";
  return "upcoming";
}

export const STATUS_LABEL: Record<FlashSaleStatus, string> = {
  active: "Berlangsung",
  teaser: "Segera",
  upcoming: "Akan Datang",
  ended: "Berakhir",
};

// Urutan tampilan: Berlangsung → Segera → Akan Datang → Berakhir.
export const STATUS_ORDER: Record<FlashSaleStatus, number> = {
  active: 0,
  teaser: 1,
  upcoming: 2,
  ended: 3,
};

// Sensor harga untuk kartu teaser: hanya angka PERTAMA yang terlihat.
// Contoh: 15000 → "Rp 1•••••".
export function censorPrice(price: number): string {
  const digits = Math.round(Math.max(0, price)).toString();
  if (digits === "0") return "Rp ?";
  const first = digits[0];
  const masked = "•".repeat(Math.max(0, digits.length - 1));
  return `Rp ${first}${masked}`;
}

// Window AKTIF [startAt, endAt) tidak boleh tumpang tindih antar event.
export function activeOverlaps(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date }
): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

// Gabungkan input tanggal (yyyy-MM-dd) + jam (HH:mm) → Date (waktu lokal).
export function combineDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return isNaN(d.getTime()) ? null : d;
}
