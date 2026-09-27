import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Kontak WhatsApp admin (koleksi Firestore: whatsapp_contacts).
export interface AdminContact {
  id: string;
  name: string;
  whatsapp: string;
}

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

/** Ambil kontak WhatsApp admin pertama (urut createdAt) dari whatsapp_contacts. */
export async function fetchAdminContact(): Promise<AdminContact | null> {
  const q = query(
    collection(db, "whatsapp_contacts"),
    orderBy("createdAt", "asc"),
    limit(1)
  );
  const snap = await getDocs(q);
  const d = snap.docs[0];
  if (!d) return null;
  const data = d.data() as { name?: string; whatsapp?: string };
  if (!data.whatsapp) return null;
  return { id: d.id, name: data.name ?? "Admin", whatsapp: data.whatsapp };
}

/** Buka WhatsApp admin dengan pesan yang sudah terisi otomatis. */
export function openAdminWhatsapp(contact: AdminContact, text: string) {
  const num = contact.whatsapp.replace(/[^0-9]/g, "");
  window.open(
    `https://wa.me/${num}?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

export interface OrderChatInfo {
  id: string;
  total: number;
  statusLabel: string;
  products: { name: string; quantity: number }[];
}

const shortOrderId = (id: string) => id.substring(0, 8).toUpperCase();

/** Pesan riwayat pesanan untuk dikirim ke obrolan aplikasi (chat internal). */
export function orderChatMessage(o: OrderChatInfo): string {
  const items = o.products.map((p) => `• ${p.name} ×${p.quantity}`).join("\n");
  return (
    `Halo admin, saya ingin bertanya tentang pesanan berikut:\n\n` +
    `🧾 Pesanan #${shortOrderId(o.id)}\n` +
    `Status: ${o.statusLabel}\n` +
    `Total: ${formatRp(o.total)}\n\n` +
    `Produk:\n${items}`
  );
}

/** Pesan pesanan untuk WhatsApp admin (nomor pesanan + hal yang ditanyakan). */
export function orderWhatsappMessage(o: OrderChatInfo, adminName: string): string {
  return (
    `Halo ${adminName}, saya ingin bertanya tentang pesanan saya.\n\n` +
    `Nomor Pesanan: #${shortOrderId(o.id)}\n` +
    `Total: ${formatRp(o.total)}\n` +
    `Status: ${o.statusLabel}\n\n` +
    `Yang ingin saya tanyakan: `
  );
}

/** Pesan produk (nama + harga + link) untuk dikirim ke obrolan aplikasi. */
export function productChatMessage(p: { name: string; price: number; link: string }): string {
  return (
    `Halo admin, saya ingin bertanya tentang produk ini:\n\n` +
    `🛍️ ${p.name}\n` +
    `💰 ${formatRp(p.price)}\n` +
    `🔗 ${p.link}`
  );
}
