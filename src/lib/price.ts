/**
 * Harga produk disimpan di Firestore sebagai ANGKA — sama seperti
 * `purchasePrice`, `stock`, dan `weightGram` — sehingga dokumen yang sama bisa
 * dibaca apa adanya oleh dashboard web, storefront reseller, dan aplikasi
 * Flutter tanpa parsing tambahan.
 *
 * Dokumen lama masih menyimpan harga sebagai string terformat ("Rp 150.000")
 * atau angka polos dalam string ("150000"), jadi setiap pembacaan harus lewat
 * `parsePrice` sampai seluruh koleksi selesai dinormalisasi.
 */
export function parsePrice(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      // Format Rupiah memakai titik sebagai pemisah RIBUAN (tanpa desimal),
      // jadi semua karakter non-digit aman dibuang.
      const digits = value.replace(/[^0-9]/g, "");
      const num = Number(digits);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  }
  
  /** Tampilkan nilai harga sebagai Rupiah. Menerima angka maupun string lama. */
  export function formatPrice(value: unknown): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(parsePrice(value));
  }
  