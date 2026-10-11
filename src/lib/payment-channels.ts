/**
 * Katalog channel pembayaran Midtrans + konfigurasi (aktif/nonaktif per channel
 * & biaya layanan per kategori). Dipakai bersama oleh halaman Pengaturan
 * Pembayaran (admin), halaman Checkout, dan logika Midtrans.
 *
 * `code` = nilai `enabled_payments` Midtrans Snap. Sumber: docs.midtrans.com
 * (Request Body JSON Parameter). OVO tidak punya channel Snap khusus di
 * Midtrans (biasanya dibayar lewat QRIS) — disertakan tapi lihat catatan.
 */

export type PaymentCategory = "bank" | "ewallet" | "qris";

export interface PaymentChannel {
  id: string;
  category: PaymentCategory;
  name: string;
  /** Kode Midtrans untuk `enabled_payments`. */
  code: string;
  /** Default aktif bila belum ada konfigurasi tersimpan. */
  defaultEnabled: boolean;
}

/** Semua channel Midtrans yang ditawarkan di halaman pengaturan. */
export const PAYMENT_CHANNELS: PaymentChannel[] = [
  // ── Transfer Bank (Virtual Account / Bill) ──
  { id: "bca_va", category: "bank", name: "BCA", code: "bca_va", defaultEnabled: false },
  { id: "bni_va", category: "bank", name: "BNI", code: "bni_va", defaultEnabled: true },
  { id: "bri_va", category: "bank", name: "BRI", code: "bri_va", defaultEnabled: true },
  { id: "mandiri", category: "bank", name: "Bank Mandiri", code: "echannel", defaultEnabled: true },
  { id: "permata_va", category: "bank", name: "PermataBank", code: "permata_va", defaultEnabled: true },
  { id: "cimb_va", category: "bank", name: "CIMB Niaga", code: "cimb_va", defaultEnabled: true },
  { id: "bsi_va", category: "bank", name: "BSI", code: "bsi_va", defaultEnabled: true },
  { id: "other_va", category: "bank", name: "Bank Lainnya", code: "other_va", defaultEnabled: false },
  // ── E-wallet ──
  { id: "gopay", category: "ewallet", name: "GoPay", code: "gopay", defaultEnabled: true },
  { id: "shopeepay", category: "ewallet", name: "ShopeePay", code: "shopeepay", defaultEnabled: true },
  // OVO: Midtrans tidak punya channel Snap khusus OVO → diarahkan ke QRIS.
  { id: "ovo", category: "ewallet", name: "OVO", code: "other_qris", defaultEnabled: true },
  // ── QRIS ──
  { id: "qris", category: "qris", name: "QRIS", code: "other_qris", defaultEnabled: true },
];

export const PAYMENT_CATEGORIES: { id: PaymentCategory; label: string; hint: string }[] = [
  { id: "bank", label: "Transfer Bank", hint: "Virtual Account / Bill bank" },
  { id: "ewallet", label: "E-wallet", hint: "GoPay, ShopeePay, OVO" },
  { id: "qris", label: "QRIS", hint: "Scan QR semua aplikasi" },
];

export interface PaymentMethodsConfig {
  /** channelId → aktif. */
  enabled: Record<string, boolean>;
  /** kategori → biaya layanan (IDR). */
  fees: Record<PaymentCategory, number>;
}

export const DEFAULT_PAYMENT_FEES: Record<PaymentCategory, number> = {
  bank: 0,
  ewallet: 0,
  qris: 0,
};

/** Apakah channel aktif (default mengikuti `defaultEnabled` bila belum diatur). */
export function isChannelEnabled(
  cfg: PaymentMethodsConfig | null | undefined,
  ch: PaymentChannel,
): boolean {
  const v = cfg?.enabled?.[ch.id];
  return v === undefined ? ch.defaultEnabled : v === true;
}

/** Biaya layanan sebuah kategori (0 bila tak diatur / negatif). */
export function categoryFee(
  cfg: PaymentMethodsConfig | null | undefined,
  cat: PaymentCategory,
): number {
  const v = cfg?.fees?.[cat];
  return typeof v === "number" && v > 0 ? Math.round(v) : 0;
}

/** Normalisasi dokumen Firestore `settings/payment_methods` → config valid. */
export function normalizePaymentConfig(raw: unknown): PaymentMethodsConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const enabledRaw = (obj.enabled && typeof obj.enabled === "object" ? obj.enabled : {}) as Record<string, unknown>;
  const feesRaw = (obj.fees && typeof obj.fees === "object" ? obj.fees : {}) as Record<string, unknown>;
  const enabled: Record<string, boolean> = {};
  for (const ch of PAYMENT_CHANNELS) {
    const v = enabledRaw[ch.id];
    enabled[ch.id] = v === undefined ? ch.defaultEnabled : v === true;
  }
  const fee = (k: PaymentCategory) => {
    const v = feesRaw[k];
    return typeof v === "number" && v > 0 ? Math.round(v) : 0;
  };
  return { enabled, fees: { bank: fee("bank"), ewallet: fee("ewallet"), qris: fee("qris") } };
}
