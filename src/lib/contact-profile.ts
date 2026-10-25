// Model bersama untuk "Contact Profil" — kontak publik toko yang dikelola admin
// di dashboard, lalu ditampilkan di aplikasi pembeli (Flutter) & web reseller.
// Dokumen Firestore: settings/contact_profile  →  { items: ContactItem[] }

export type ContactType =
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "website"
  | "shopee"
  | "maps"
  | "email"
  | "phone";

export interface ContactItem {
  section: string; // nama grup, mis. "Akun Official Kami"
  type: ContactType; // menentukan ikon
  label: string; // teks yang tampil
  url: string; // tautan saat diklik (wa.me / https / mailto / tel)
}

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website" },
  { value: "shopee", label: "Shopee" },
  { value: "maps", label: "Google Maps" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telepon" },
];

/** Default awal — sama dengan kontak lama di aplikasi pembeli, dipakai untuk
 *  pra-isi form admin & sebagai fallback bila belum dikonfigurasi. */
export const DEFAULT_CONTACT_ITEMS: ContactItem[] = [
  { section: "Akun Official Kami", type: "instagram", label: "manafidh_kosmetik", url: "https://www.instagram.com/manafidh_kosmetik/" },
  { section: "Akun Official Kami", type: "website", label: "www.gogama.store", url: "https://www.gogama.store/" },
  { section: "Akun Official Kami", type: "tiktok", label: "Gallery Makassar", url: "https://www.tiktok.com/@gallery.makassar" },
  { section: "Akun Official Kami", type: "shopee", label: "manafidh_kosmetik", url: "https://shope.ee/6Kbmbbr5pA" },
  { section: "Hubungi Kami Untuk Join Grosir", type: "whatsapp", label: "WA Komplain Shopee", url: "http://wa.me/6289506991107" },
  { section: "Hubungi Kami Untuk Join Grosir", type: "whatsapp", label: "Admin Grosir 1", url: "http://wa.me/6288705707321" },
  { section: "Hubungi Kami Untuk Join Grosir", type: "whatsapp", label: "Admin Grosir 2", url: "http://wa.me/6289503674236" },
  { section: "Hubungi Kami Untuk Join Grosir", type: "whatsapp", label: "WA Lowongan Kerja", url: "http://wa.me/6289636052501" },
  { section: "Offline Store", type: "maps", label: "Maps: Gallery Makassar", url: "https://maps.app.goo.gl/BQmTCJBcVRaeU7wi9" },
];

/** Validasi & bersihkan item dari Firestore (buang yang tidak lengkap). */
export function sanitizeContactItems(raw: unknown): ContactItem[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<ContactType>(CONTACT_TYPES.map((t) => t.value));
  return raw
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const type = String(o.type ?? "website") as ContactType;
      return {
        section: String(o.section ?? "").trim(),
        type: valid.has(type) ? type : ("website" as ContactType),
        label: String(o.label ?? "").trim(),
        url: String(o.url ?? "").trim(),
      };
    })
    .filter((i) => i.label !== "" && i.url !== "");
}

/** Urutkan item menjadi grup per `section` dengan mempertahankan urutan asli. */
export function groupContactItems(items: ContactItem[]): { section: string; items: ContactItem[] }[] {
  const groups: { section: string; items: ContactItem[] }[] = [];
  for (const item of items) {
    const name = item.section || "Kontak";
    let g = groups.find((x) => x.section === name);
    if (!g) {
      g = { section: name, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}
