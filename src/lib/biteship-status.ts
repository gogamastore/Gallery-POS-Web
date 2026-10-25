// Pemetaan status pengiriman Biteship → Bahasa Indonesia (mengikuti istilah
// pada halaman tracking Biteship). Dipakai bersama detail pesanan reseller &
// admin.

const has = (s: string, keys: string[]) => keys.some((k) => s.includes(k));
const ON_THE_WAY = ["dropping_off", "in_transit", "on_process", "out_for_delivery", "on_the_way", "delivering"];
const FAILED = ["cancelled", "canceled", "rejected", "failed", "not_found"];

/** Judul status dalam Bahasa Indonesia. */
export function biteshipStatusLabel(status?: string): string {
  const s = (status ?? "").toLowerCase();
  if (!s) return "Memproses…";
  if (s.includes("confirmed")) return "Permintaan Pengiriman Telah Diterima";
  if (has(s, ["allocating", "waiting"])) return "Mencari Kurir";
  if (s.includes("allocated")) return "Permintaan Pengiriman Telah Diterima";
  if (s.includes("picking_up") || s === "pickup") return "Pesanan Sedang Proses Penjemputan";
  if (s.includes("picked")) return "Pesanan Telah Dijemput";
  if (has(s, ON_THE_WAY)) return "Pesanan Sedang Dalam Perjalanan";
  if (s.includes("delivered")) return "Pesanan Telah Sampai Tujuan";
  if (s.includes("hold")) return "Pengiriman Tertunda";
  if (s.includes("return")) return "Paket Dikembalikan";
  if (has(s, FAILED)) return "Pengiriman Gagal / Dibatalkan";
  return status ?? "";
}

/** Keterangan status dalam Bahasa Indonesia (dipakai bila Biteship tak mengirim catatan). */
export function biteshipStatusDesc(status?: string): string {
  const s = (status ?? "").toLowerCase();
  if (s.includes("confirmed")) return "Pesanan kurir dikonfirmasi. Kurir telah diberi tahu untuk menjemput.";
  if (has(s, ["allocating", "waiting"])) return "Sedang mencari kurir terdekat.";
  if (s.includes("allocated")) return "Kurir telah dialokasikan. Menunggu dijemput.";
  if (s.includes("picking_up") || s === "pickup") return "Kurir sedang menuju lokasi penjemputan.";
  if (s.includes("picked")) return "Paket telah dijemput kurir.";
  if (has(s, ON_THE_WAY)) return "Paket sedang menuju alamat tujuan.";
  if (s.includes("delivered")) return "Paket telah sampai di tujuan.";
  if (s.includes("hold")) return "Pengiriman tertunda sementara.";
  if (s.includes("return")) return "Paket dikembalikan ke pengirim.";
  if (has(s, FAILED)) return "Pengiriman dibatalkan atau gagal.";
  return "";
}

/** Format waktu Biteship (ISO) → "d MMM HH:mm" lokal; fallback ke string asli. */
export function formatTrackTime(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
