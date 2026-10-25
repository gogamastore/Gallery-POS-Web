"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, functions } from "@/lib/firebase";
import {
  doc, onSnapshot, updateDoc, deleteDoc, getDoc,
  writeBatch, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, CheckCircle2, ExternalLink, Clock,
  Truck, PackageCheck, XCircle, RefreshCw, AlertCircle, Printer,
  FileText, FileBox, Trash2, Headset, MessageSquare, Phone, Undo2,
} from "lucide-react";
import Image from "next/image";
import ShippingTracking from "@/components/orders/shipping-tracking";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF { autoTable: (options: any) => jsPDF; }
}

// ── Firebase Functions ─────────────────────────────────────────────

const createBiteshipOrderFn = httpsCallable<
  { orderId: string },
  { success: boolean; biteshipOrderId: string; courierTrackingId?: string; waybillId?: string; trackingUrl?: string; status?: string }
>(functions, "createBiteshipOrder");

// ── Constants ──────────────────────────────────────────────────────

const INSTANT_COURIER_CODES = [
  "gojek", "grab", "grab_express", "gosend", "paxel", "lalamove", "borzo",
];
function isInstantCourier(code?: string) {
  return INSTANT_COURIER_CODES.includes((code ?? "").toLowerCase());
}

// ── Types ──────────────────────────────────────────────────────────

interface OrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  image?: string;
  sku?: string;
}

interface Order {
  id: string;
  customerId?: string; // uid pembeli (untuk chat & lookup WhatsApp profil)
  customer: string;
  customerDetails?: {
    name?: string;
    address?: string;
    whatsapp?: string;
    phone?: string;
    city?: string;
    province?: string;
  };
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentProofUrl?: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  voucherCode?: string | null;
  voucherDiscount?: number;
  adminFee?: number;
  serviceFee?: number;
  paymentFee?: number;
  labelPrinted?: boolean;
  shippingMethod?: string;
  date: any;
  shippedAt?: any;
  products: OrderProduct[];
  biteshipOrderId?: string;
  biteshipCourierTrackingId?: string;
  biteshipCourierRoutingCode?: string;
  biteshipCourierCode?: string;
  biteshipCourierName?: string;
  biteshipServiceCode?: string;
  biteshipServiceName?: string;
  biteshipStatus?: string;
  waybillId?: string;
  deliveryTrackingUrl?: string;
  destinationAreaId?: string;
  deliveryNotes?: string;
  midtransToken?: string;
  midtransRedirectUrl?: string;
  stockRestored?: boolean; // true bila stok sudah dikembalikan (batal/retur)
}


// ── Helpers ────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const toNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  return 0;
};

function fromFirestore(docId: string, data: Record<string, any>): Order {
  return {
    id: docId,
    customerId: data.customerId ?? data.userId ?? "",
    customer: data.customerDetails?.name ?? data.customer ?? "N/A",
    customerDetails: data.customerDetails ?? {},
    status: data.status ?? "pending",
    paymentMethod: data.paymentMethod ?? "N/A",
    paymentStatus: data.paymentStatus ?? "unpaid",
    paymentProofUrl: data.paymentProofUrl,
    total: toNum(data.total),
    subtotal: toNum(data.subtotal),
    shippingFee: toNum(data.shippingFee),
    voucherCode: data.voucherCode ?? null,
    voucherDiscount: toNum(data.voucherDiscount),
    adminFee: toNum(data.adminFee),
    serviceFee: toNum(data.serviceFee),
    paymentFee: toNum(data.paymentFee),
    shippingMethod: data.shippingMethod ?? "",
    date: data.date,
    shippedAt: data.shippedAt,
    products: (data.products ?? []).map((p: any) => ({
      productId: p.productId ?? "",
      name: p.name ?? "",
      quantity: toNum(p.quantity),
      price: toNum(p.price),
      imageUrl: p.imageUrl ?? p.image ?? "",
      image: p.imageUrl ?? p.image ?? "",
      sku: p.sku ?? "",
    })),
    biteshipOrderId: data.biteshipOrderId,
    biteshipCourierCode: data.biteshipCourierCode,
    biteshipCourierName: data.biteshipCourierName,
    biteshipServiceCode: data.biteshipServiceCode,
    biteshipServiceName: data.biteshipServiceName,
    biteshipStatus: data.biteshipStatus,
    waybillId: data.waybillId,
    deliveryTrackingUrl: data.deliveryTrackingUrl,
    destinationAreaId: data.destinationAreaId,
    deliveryNotes: data.deliveryNotes,
    midtransToken: data.midtransToken,
    midtransRedirectUrl: data.midtransRedirectUrl,
    stockRestored: data.stockRestored === true,
  };
}

function getStatusInfo(status: string, biteshipStatus?: string) {
  const s = (status ?? "").toLowerCase();
  // Pengembalian (retur) dari kurir — tampilkan terpisah dari "Dibatalkan".
  if ((biteshipStatus ?? "").toLowerCase().includes("return")) {
    return { title: "Pesanan Dikembalikan (Retur)", icon: Undo2, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  }
  if (s === "pending")    return { title: "Menunggu Pembayaran", icon: Clock,        color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  if (s === "processing") return { title: "Perlu Dikirim",       icon: RefreshCw,    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" };
  if (s === "shipped" || s === "dikirim")
                          return { title: "Dalam Pengiriman",    icon: Truck,        color: "text-cyan-600",   bg: "bg-cyan-50 border-cyan-200" };
  if (s === "delivered" || s === "selesai")
                          return { title: "Pesanan Selesai",     icon: PackageCheck, color: "text-green-600",  bg: "bg-green-50 border-green-200" };
  if (s === "cancelled" || s === "dibatalkan")
                          return { title: "Pesanan Dibatalkan",  icon: XCircle,      color: "text-red-600",    bg: "bg-red-50 border-red-200" };
  return { title: `Status: ${status}`, icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
}

function isPaid(ps: string) {
  return ["paid", "settlement", "Paid"].includes(ps);
}

function paymentLabel(ps: string) {
  const s = (ps ?? "").toLowerCase();
  if (s === "paid" || s === "settlement") return "Lunas";
  if (s === "pending_payment") return "Menunggu Pembayaran";
  if (s === "cancelled") return "Dibatalkan";
  if (s === "failed") return "Kadaluarsa";
  return ps;
}

function paymentColor(ps: string) {
  const s = (ps ?? "").toLowerCase();
  if (s === "paid" || s === "settlement") return "text-green-600";
  if (s === "pending_payment") return "text-orange-600";
  if (s === "cancelled" || s === "failed") return "text-red-600";
  return "text-muted-foreground";
}

// ── UI Helpers ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <div className="px-4 py-4 space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
      <span className={`text-sm font-medium flex-1 break-words ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

// ── Cetak Resi ─────────────────────────────────────────────────────

interface StoreInfo { name: string; phone: string; address: string; }

function printWaybill(order: Order, storeInfo?: StoreInfo) {
  const w = window.open("", "_blank", "width=520,height=780");
  if (!w) return;

  const waybillId   = order.waybillId ?? "";
  const trackingId  = order.biteshipCourierTrackingId ?? "";
  const trackingUrl = trackingId ? `https://track.biteship.com/${trackingId}` : (order.deliveryTrackingUrl ?? "");
  const refId        = order.biteshipOrderId ?? order.id;
  const courierLabel = [order.biteshipCourierName ?? order.biteshipCourierCode, order.biteshipServiceName ?? order.biteshipServiceCode].filter(Boolean).join(" ");
  const serviceName  = order.biteshipServiceName ?? order.biteshipServiceCode ?? "-";
  const routingCode  = order.biteshipCourierRoutingCode ?? "";
  const shippingFee  = order.shippingFee ? new Intl.NumberFormat("id-ID").format(order.shippingFee) : "-";
  const totalQty     = order.products.reduce((s, p) => s + p.quantity, 0);
  const totalWeight  = (order.products.reduce((s, p) => s + p.quantity * 200, 0) / 1000).toFixed(1);
  const itemsList    = order.products.map(p => p.quantity + "x " + p.name).join("<br>");
  const catatan      = order.deliveryNotes || "Order #" + order.id + " dari Manafidh Store";
  const logoUrl      = window.location.origin + "/gogamalogo.png";
  const bcW = waybillId ? "JsBarcode('#bcW','"+waybillId+"',{format:'CODE128',width:2,height:60,displayValue:false,margin:4});" : "";
  const bcR = refId    ? "JsBarcode('#bcR','"+refId+"',{format:'CODE128',width:1.2,height:35,displayValue:false,margin:2});" : "";

  const storeName  = storeInfo?.name    ?? "Manafidh Store";
  const storePhone = storeInfo?.phone   ?? "";
  const storeAddr  = storeInfo?.address ?? "";

  w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Resi - ${waybillId || order.id}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;width:105mm;padding:3mm}
.hdr{border:2px solid #000;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.logo{height:48px;object-fit:contain;max-width:55mm}
.courier{text-align:right;font-weight:bold;font-size:11px;color:#333;word-break:break-word;max-width:40mm}
.bc{border:1px solid #000;border-top:none;padding:7px 8px;text-align:center}
#bcW{width:100%;height:65px}#bcR{width:100%;height:38px}
.resi-lbl{font-size:13px;font-weight:bold;margin-top:3px}
.svc{border:1px solid #000;border-top:none;padding:5px 9px;text-align:center;font-size:10px;line-height:1.5}
.ref-row{border:1px solid #000;border-top:none;display:flex}
.ref-l{flex:1;padding:5px 7px;border-right:1px solid #000}
.ref-r{width:42%;padding:5px 7px}
.lbl{font-weight:bold;font-size:10px;margin-bottom:2px}
.val{font-size:10px;word-break:break-all;margin-top:2px}
.addr-row{border:1px solid #000;border-top:none;display:flex;min-height:75px}
.addr{flex:1;padding:5px 7px}.addr:first-child{border-right:1px solid #000}
.anm{font-weight:bold;font-size:11px;margin:2px 0}
.aln{font-size:10px;margin-top:1px;line-height:1.35}
.items{border:1px solid #000;border-top:none;padding:5px 7px;font-size:10px;line-height:1.4}
.ir{display:flex;gap:5px;margin-bottom:1px}.ik{font-weight:bold;min-width:75px;flex-shrink:0}
.ftr{border:1px solid #000;border-top:none;padding:5px;text-align:center;font-size:10px}
.ftr a{color:#0066cc;word-break:break-all;text-decoration:none}
.pbtn{width:100%;padding:8px;font-size:13px;cursor:pointer;margin-top:7px;background:#1a73e8;color:#fff;border:none;border-radius:4px;font-weight:bold}
@media print{.pbtn{display:none}@page{size:A6;margin:3mm}}
</style></head><body>

<div class="hdr">
  <img src="${logoUrl}" class="logo" alt="Gogama" onerror="this.style.display='none'">
  <div class="courier">${courierLabel || "-"}</div>
</div>
<div class="bc"><svg id="bcW"></svg><p class="resi-lbl">Nomor Resi - ${waybillId || "-"}</p></div>
<div class="svc">
  <p>Ongkos Kirim: Rp. ${shippingFee}</p>
  <p>Jenis Layanan - ${serviceName}${routingCode ? ". Kode Rute - " + routingCode : ""}</p>
</div>
<div class="ref-row">
  <div class="ref-l"><p class="lbl">Reference Number</p><svg id="bcR"></svg><p class="val">${refId}</p></div>
  <div class="ref-r"><p class="lbl">Quantity: &nbsp;${totalQty} Pcs</p><br><p class="lbl">Weight: &nbsp;&nbsp;${totalWeight} Kg</p></div>
</div>
<div class="addr-row">
  <div class="addr">
    <p class="lbl">Alamat Penerima:</p>
    <p class="anm">${order.customerDetails?.name ?? order.customer}</p>
    <p class="aln">${order.customerDetails?.whatsapp ?? order.customerDetails?.phone ?? "-"}</p>
    <p class="aln">${order.customerDetails?.address ?? "-"}</p>
  </div>
  <div class="addr">
    <p class="lbl">Alamat Pengirim:</p>
    <p class="anm">${storeName}</p>
    <p class="aln">${storePhone}</p>
    <p class="aln">${storeAddr}</p>
  </div>
</div>
<div class="items">
  <div class="ir"><span class="ik">Jenis Barang :</span><span>${itemsList}</span></div>
  <div class="ir"><span class="ik">Catatan :</span><span>${catatan}</span></div>
</div>
<div class="ftr">${trackingUrl ? "<a href=\""+trackingUrl+"\">"+trackingUrl+"</a>" : "<p>Manafidh Store</p>"}</div>
<button class="pbtn" onclick="window.print()">🖨️ Cetak / Print</button>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script>window.addEventListener('load',function(){try{${bcW}${bcR}}catch(e){}});<\/script>
</body></html>`);
  w.document.close();
}

// ── Main Page ──────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ name: "Manafidh Store", phone: "", address: "" });

  useEffect(() => {
    getDoc(doc(db, "settings", "store")).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setStoreInfo({
        name: d.storeName || "Manafidh Store",
        phone: d.storePhone || "",
        address: [d.address, d.city, d.province, d.postalCode].filter(Boolean).join(", "),
      });
    }).catch(() => {});
  }, []);

  // Shipment processing
  const [isProcessingShipment, setIsProcessingShipment] = useState(false);
  const [confirmProcessOpen, setConfirmProcessOpen] = useState(false);


  // Confirm dialogs
  const [confirmDeliveredOpen, setConfirmDeliveredOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmRestockOpen, setConfirmRestockOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hubungi pembeli
  const [contactOpen, setContactOpen] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);

  // ── Real-time listener ─────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      setOrder(fromFirestore(snap.id, snap.data() as Record<string, any>));
      setLoading(false);
    });
    return unsub;
  }, [id]);

  // ── Proses Pengiriman (Biteship) ───────────────────────────────

  async function handleProcessShipment() {
    if (!order) return;
    setIsProcessingShipment(true);
    setConfirmProcessOpen(false);
    try {
      const res = await createBiteshipOrderFn({ orderId: order.id });
      if (res.data.waybillId) {
        toast({ title: `Resi berhasil dibuat: ${res.data.waybillId}` });
        printWaybill(
          { ...order, waybillId: res.data.waybillId, biteshipCourierTrackingId: res.data.courierTrackingId },
          storeInfo,
        );
      } else {
        toast({ title: isInstantCourier(order.biteshipCourierCode)
          ? "Driver sedang dicari oleh Biteship."
          : "Pesanan berhasil dikirim ke Biteship." });
      }
    } catch (err: any) {
      toast({ title: "Gagal memproses pengiriman", description: err?.message, variant: "destructive" });
    } finally {
      setIsProcessingShipment(false);
    }
  }

  // ── Tandai Selesai ─────────────────────────────────────────────

  async function handleMarkDelivered() {
    if (!order) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "Delivered",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Pesanan ditandai selesai." });
      setConfirmDeliveredOpen(false);
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Batalkan Pesanan ───────────────────────────────────────────

  async function handleCancelOrder() {
    if (!order) return;
    setIsSubmitting(true);
    const batch = writeBatch(db);
    try {
      batch.update(doc(db, "orders", order.id), {
        status: "Cancelled",
        paymentStatus: "cancelled",
        stockRestored: true,
        updatedAt: serverTimestamp(),
      });
      for (const item of order.products) {
        const pdoc = await getDoc(doc(db, "products", item.productId));
        if (pdoc.exists())
          batch.update(doc(db, "products", item.productId), {
            stock: (pdoc.data().stock ?? 0) + item.quantity,
          });
      }
      await batch.commit();
      toast({ title: "Pesanan dibatalkan & stok dikembalikan." });
      setConfirmCancelOpen(false);
    } catch (err: any) {
      toast({ title: "Gagal membatalkan", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Barang Retur Diterima → Kembalikan Stok ────────────────────
  // Dipakai saat paket yang DIKEMBALIKAN kurir (retur) sudah diterima kembali
  // oleh toko. Mengembalikan stok sekali saja (dijaga flag stockRestored).

  async function handleRestockReturn() {
    if (!order) return;
    if (order.stockRestored) {
      toast({ title: "Stok sudah dikembalikan sebelumnya." });
      setConfirmRestockOpen(false);
      return;
    }
    setIsSubmitting(true);
    const batch = writeBatch(db);
    try {
      batch.update(doc(db, "orders", order.id), {
        stockRestored: true,
        returnReceivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      for (const item of order.products) {
        const pdoc = await getDoc(doc(db, "products", item.productId));
        if (pdoc.exists())
          batch.update(doc(db, "products", item.productId), {
            stock: (pdoc.data().stock ?? 0) + item.quantity,
          });
      }
      await batch.commit();
      toast({ title: "Barang retur diterima — stok dikembalikan." });
      setConfirmRestockOpen(false);
    } catch (err: any) {
      toast({ title: "Gagal mengembalikan stok", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Hapus Pesanan ──────────────────────────────────────────────

  async function handleDeleteOrder() {
    if (!order) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "orders", order.id));
      toast({ title: "Pesanan dihapus." });
      router.back();
    } catch (err: any) {
      toast({ title: "Gagal menghapus", description: err?.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  }

  // ── Hubungi Pembeli (Obrolan / WhatsApp) ───────────────────────
  // Catatan: WhatsApp diambil dari profil user (user/{customerId}.whatsapp)
  // yang sudah diverifikasi pembeli — BUKAN dari customerDetails pesanan.

  function handleContactBuyerChat() {
    if (!order) return;
    if (!order.customerId || order.customerId === "guest") {
      toast({ title: "Pesanan ini tanpa akun pembeli (guest), tidak bisa dihubungi.", variant: "destructive" });
      return;
    }
    setContactOpen(false);
    router.push(`/dashboard/chat?userId=${order.customerId}`);
  }

  async function handleContactBuyerWhatsapp() {
    if (!order || contactBusy) return;
    if (!order.customerId || order.customerId === "guest") {
      toast({ title: "Pesanan ini tanpa akun pembeli (guest), tidak bisa dihubungi.", variant: "destructive" });
      return;
    }
    setContactBusy(true);
    try {
      const snap = await getDoc(doc(db, "user", order.customerId));
      const wa = snap.exists() ? (snap.data().whatsapp as string | undefined) : undefined;
      if (!wa) {
        toast({
          title: "Pembeli belum memiliki WhatsApp terverifikasi.",
          description: "Minta pembeli memverifikasi nomor WhatsApp di profil mereka.",
          variant: "destructive",
        });
        return;
      }
      const num = wa.replace(/[^0-9]/g, "");
      const shortId = order.id.substring(0, 8).toUpperCase();
      const buyerName = order.customerDetails?.name ?? order.customer;
      const text =
        `Halo ${buyerName}, ini admin Manafidh Store 👋\n\n` +
        `Kami menghubungi Anda terkait pesanan #${shortId}.\n` +
        `Total: ${formatCurrency(order.total)}\n` +
        `Status: ${getStatusInfo(order.status).title}\n\n`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      setContactOpen(false);
    } catch {
      toast({ title: "Gagal memuat nomor WhatsApp pembeli.", variant: "destructive" });
    } finally {
      setContactBusy(false);
    }
  }

  // ── Generate PDF ───────────────────────────────────────────────

  async function generatePdf(type: "invoice" | "packingSlip") {
    if (!order) return;
    const pdf = new jsPDF();
    pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
    pdf.text(type === "invoice" ? "FAKTUR PENJUALAN" : "SLIP PENGEPAKAN", 105, 20, { align: "center" });
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    pdf.text(`No. Pesanan: ${order.id}`, 14, 30);
    if (order.date?.toDate)
      pdf.text(`Tanggal: ${format(order.date.toDate(), "dd MMMM yyyy, HH:mm", { locale: localeId })}`, 14, 35);
    pdf.text(`Kepada: ${order.customerDetails?.name ?? order.customer}`, 14, 45);
    const addrLines = pdf.splitTextToSize(order.customerDetails?.address ?? "-", 90);
    pdf.text(addrLines, 14, 50);
    const afterAddr = 50 + addrLines.length * 5;
    pdf.text(`WA: ${order.customerDetails?.whatsapp ?? "-"}`, 14, afterAddr);
    const cols = type === "invoice"
      ? ["Produk", "Qty", "Harga", "Subtotal"]
      : ["No.", "SKU", "Produk", "Qty"];
    const rows = type === "invoice"
      ? order.products.map((p) => [p.name, p.quantity, formatCurrency(p.price), formatCurrency(p.price * p.quantity)])
      : order.products.map((p, i) => [i + 1, p.sku ?? "N/A", p.name, p.quantity]);
    pdf.autoTable({ head: [cols], body: rows, startY: afterAddr + 10 });
    const fY = (pdf as any).lastAutoTable.finalY;
    if (type === "invoice") {
      pdf.text("Subtotal:", 140, fY + 10);
      pdf.text(formatCurrency(order.subtotal), 200, fY + 10, { align: "right" });
      pdf.text("Ongkir:", 140, fY + 15);
      pdf.text(formatCurrency(order.shippingFee), 200, fY + 15, { align: "right" });
      pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL:", 140, fY + 22);
      pdf.text(formatCurrency(order.total), 200, fY + 22, { align: "right" });
    }
    pdf.save(`${type === "invoice" ? "Faktur" : "Packing"}-${order.id.substring(0, 8)}.pdf`);
  }

  // ── Guards ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Pesanan tidak ditemukan.</p>
        <Button className="mt-4" onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status, order.biteshipStatus);
  const StatusIcon = statusInfo.icon;
  const sLower = (order.status ?? "").toLowerCase();
  const isPendingPayment = order.paymentStatus === "pending_payment";
  const isProcessing = isPaid(order.paymentStatus) && sLower === "processing";
  const isShipped = ["shipped", "dikirim"].includes(sLower);
  const isDelivered = ["delivered", "selesai"].includes(sLower);
  const isCancelled = ["cancelled", "dibatalkan"].includes(sLower) || ["cancelled", "failed"].includes(order.paymentStatus.toLowerCase());
  const isReturned = (order.biteshipStatus ?? "").toLowerCase().includes("return");
  const hasBiteship = !!order.biteshipOrderId;
  const instant = isInstantCourier(order.biteshipCourierCode);
  const subtotal = order.subtotal || order.products.reduce((s, p) => s + p.price * p.quantity, 0);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Detail Pesanan</h1>
          <p className="text-xs text-muted-foreground font-mono">#{order.id}</p>
        </div>
      </div>

      {/* ── Status Banner ── */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusInfo.bg}`}>
        <StatusIcon className={`h-7 w-7 shrink-0 ${statusInfo.color}`} />
        <div>
          <p className={`font-bold ${statusInfo.color}`}>{statusInfo.title}</p>
          {order.date?.toDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(order.date.toDate(), "d MMMM yyyy, HH:mm", { locale: localeId })}
            </p>
          )}
        </div>
      </div>

      {/* ── Action Buttons (per status) ── */}

      {/* Belum Bayar */}
      {isPendingPayment && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Menunggu pembayaran dari pelanggan. Pembayaran akan dikonfirmasi otomatis oleh Midtrans.</span>
        </div>
      )}

      {/* Perlu Dikirim */}
      {isProcessing && (
        <div className="flex flex-wrap gap-2">
          {!hasBiteship ? (
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => setConfirmProcessOpen(true)}
              disabled={isProcessingShipment}
            >
              {isProcessingShipment
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Truck className="mr-2 h-4 w-4" />}
              {isProcessingShipment ? "Memproses..." : "Proses Pesanan"}
            </Button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {order.waybillId && (
                <Button variant="outline" onClick={() => printWaybill(order, storeInfo)}>
                  <Printer className="mr-2 h-4 w-4" />Cetak Resi
                </Button>
              )}
              {(order.biteshipCourierTrackingId || order.deliveryTrackingUrl) && (
                <Button variant="outline" asChild>
                  <a href={order.biteshipCourierTrackingId ? `https://track.biteship.com/${order.biteshipCourierTrackingId}` : order.deliveryTrackingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />Tracking
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dikirim */}
      {isShipped && (
        <div className="flex flex-wrap gap-2">
          {order.waybillId && (
            <Button variant="outline" onClick={() => printWaybill(order, storeInfo)}>
              <Printer className="mr-2 h-4 w-4" />Cetak Resi
            </Button>
          )}
          {(order.biteshipCourierTrackingId || order.deliveryTrackingUrl) && (
            <Button variant="outline" asChild>
              <a href={order.biteshipCourierTrackingId ? `https://track.biteship.com/${order.biteshipCourierTrackingId}` : order.deliveryTrackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />Tracking
              </a>
            </Button>
          )}
          <Button onClick={() => setConfirmDeliveredOpen(true)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />Tandai Selesai
          </Button>
        </div>
      )}

      {/* Selesai */}
      {isDelivered && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => generatePdf("invoice")}>
            <FileText className="mr-2 h-4 w-4" />Download Faktur
          </Button>
          <Button variant="outline" onClick={() => generatePdf("packingSlip")}>
            <FileBox className="mr-2 h-4 w-4" />Dokumen Pesanan
          </Button>
          {order.waybillId && (
            <Button variant="outline" onClick={() => printWaybill(order, storeInfo)}>
              <Printer className="mr-2 h-4 w-4" />Cetak Resi
            </Button>
          )}
        </div>
      )}

      {/* Dibatalkan */}
      {isCancelled && (
        <Button
          variant="destructive"
          onClick={() => setConfirmDeleteOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />Hapus Pesanan
        </Button>
      )}

      {/* ── Informasi Pesanan ── */}
      <Section title="Informasi Pesanan">
        <InfoRow label="ID Pesanan" value={`#${order.id}`} />
        {order.date?.toDate && (
          <InfoRow
            label="Tanggal"
            value={format(order.date.toDate(), "d MMMM yyyy, HH:mm", { locale: localeId })}
          />
        )}
        <InfoRow label="Metode Pembayaran" value={order.paymentMethod} />
        <InfoRow
          label="Status Pembayaran"
          value={paymentLabel(order.paymentStatus)}
          valueClass={paymentColor(order.paymentStatus)}
        />
        {order.paymentProofUrl && (
          <div className="flex gap-3">
            <span className="text-sm text-muted-foreground w-40 shrink-0">Bukti Bayar</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-sm text-primary underline font-medium">Lihat Bukti</button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bukti Pembayaran</DialogTitle>
                  <DialogDescription>{order.customerDetails?.name ?? order.customer}</DialogDescription>
                </DialogHeader>
                <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                  <Image src={order.paymentProofUrl} alt="Bukti bayar" width={400} height={400}
                    className="rounded border object-contain w-full" />
                </a>
                <DialogFooter>
                  <Button asChild variant="outline">
                    <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />Buka Full
                    </a>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Section>

      {/* ── Pengiriman ── */}
      <Section title="Pengiriman">
        {order.shippingMethod && <InfoRow label="Metode" value={order.shippingMethod} />}
        <InfoRow label="Biaya Ongkir" value={formatCurrency(order.shippingFee)} />
        {order.biteshipCourierName && (
          <InfoRow label="Kurir" value={`${order.biteshipCourierName}${order.biteshipServiceName ? " — " + order.biteshipServiceName : ""}`} />
        )}
        {order.waybillId ? (
          <div className="flex gap-3">
            <span className="text-sm text-muted-foreground w-40 shrink-0">No. Resi</span>
            <span className="text-sm font-bold font-mono tracking-wider">{order.waybillId}</span>
          </div>
        ) : hasBiteship && instant ? (
          <InfoRow label="No. Resi" value="Belum tersedia (mencari driver...)" />
        ) : null}
        {order.biteshipStatus && <InfoRow label="Status Kurir" value={order.biteshipStatus} />}
        {(order.biteshipCourierTrackingId || order.deliveryTrackingUrl) && (
          <div className="flex gap-3">
            <span className="text-sm text-muted-foreground w-40 shrink-0">Link Tracking</span>
            <a
              href={order.biteshipCourierTrackingId ? `https://track.biteship.com/${order.biteshipCourierTrackingId}` : order.deliveryTrackingUrl}
              target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary underline flex items-center gap-1">
              Buka Tracking <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {order.deliveryNotes && <InfoRow label="Catatan Kurir" value={order.deliveryNotes} />}
      </Section>

      {/* ── Lacak Pengiriman (riwayat otomatis + foto bukti) ── */}
      {hasBiteship && (
        <ShippingTracking orderId={order.id} deliveryTrackingUrl={order.deliveryTrackingUrl} />
      )}

      {/* ── Alamat Pengiriman ── */}
      {order.customerDetails && Object.keys(order.customerDetails).length > 0 && (
        <Section title="Alamat Pengiriman">
          {order.customerDetails.name && <InfoRow label="Nama" value={order.customerDetails.name} />}
          {(order.customerDetails.address) && (
            <InfoRow label="Alamat" value={order.customerDetails.address} />
          )}
          {(order.customerDetails.whatsapp || order.customerDetails.phone) && (
            <div className="flex gap-3">
              <span className="text-sm text-muted-foreground w-40 shrink-0">WhatsApp</span>
              <a
                href={`https://wa.me/${order.customerDetails.whatsapp ?? order.customerDetails.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-green-600 underline"
              >
                {order.customerDetails.whatsapp ?? order.customerDetails.phone}
              </a>
            </div>
          )}
          {order.customerDetails.city && (
            <InfoRow
              label="Kota"
              value={`${order.customerDetails.city}${order.customerDetails.province ? ", " + order.customerDetails.province : ""}`}
            />
          )}
        </Section>
      )}

      {/* ── Produk ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="font-semibold text-sm">Produk ({order.products.length} item)</p>
        </div>
        <div className="divide-y">
          {order.products.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Image
                src={p.imageUrl || p.image || "https://placehold.co/44x44.png"}
                alt={p.name} width={44} height={44}
                className="rounded-lg border shrink-0 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(p.price)} × {p.quantity}
                </p>
              </div>
              <p className="text-sm font-bold shrink-0">{formatCurrency(p.price * p.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ringkasan Pembayaran ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="font-semibold text-sm">Ringkasan Pembayaran</p>
        </div>
        <div className="px-4 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal Produk</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkos Kirim</span>
            <span>{formatCurrency(order.shippingFee)}</span>
          </div>
          {(order.voucherDiscount ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Voucher{order.voucherCode ? ` (${order.voucherCode})` : ""}</span>
              <span>- {formatCurrency(order.voucherDiscount || 0)}</span>
            </div>
          )}
          {(order.adminFee ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Admin</span>
              <span>{formatCurrency(order.adminFee || 0)}</span>
            </div>
          )}
          {(order.serviceFee ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Layanan</span>
              <span>{formatCurrency(order.serviceFee || 0)}</span>
            </div>
          )}
          {(order.paymentFee ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Layanan Pembayaran</span>
              <span>{formatCurrency(order.paymentFee || 0)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Kotak Aksi Admin (Tersedia di Semua Status) ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="font-semibold text-sm">Aksi Admin</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => generatePdf("invoice")}>
              <FileText className="mr-2 h-4 w-4" />Faktur
            </Button>
            <Button variant="outline" size="sm" onClick={() => generatePdf("packingSlip")}>
              <FileBox className="mr-2 h-4 w-4" />Packing Slip
            </Button>
            {order.waybillId && (
              <Button variant="outline" size="sm" onClick={() => printWaybill(order, storeInfo)}>
                <Printer className="mr-2 h-4 w-4" />Cetak Resi
              </Button>
            )}
            {!isCancelled && !isDelivered && !isShipped && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />Batalkan Pesanan
              </Button>
            )}
            {/* Pesanan DIKEMBALIKAN (retur): kembalikan stok saat barang
                sudah diterima kembali oleh toko (sekali saja). */}
            {isReturned && !order.stockRestored && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-700 border-amber-400 hover:bg-amber-50"
                onClick={() => setConfirmRestockOpen(true)}
              >
                <Undo2 className="mr-2 h-4 w-4" />Barang Retur Diterima → Kembalikan Stok
              </Button>
            )}
            {isReturned && order.stockRestored && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />Stok retur sudah dikembalikan
              </span>
            )}
          </div>
          {/* Hubungi pembeli — wajib ada di semua status */}
          <Button variant="default" className="w-full" onClick={() => setContactOpen(true)}>
            <Headset className="mr-2 h-4 w-4" />Hubungi Pembeli
          </Button>
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Hubungi Pembeli: pilih Obrolan atau WhatsApp */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Hubungi Pembeli</DialogTitle>
            <DialogDescription>
              Hubungi {order.customerDetails?.name ?? order.customer} tentang pesanan #{order.id.substring(0, 8).toUpperCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={handleContactBuyerChat}
              disabled={contactBusy}
            >
              <MessageSquare className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium leading-none">Obrolan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Balas chat pembeli di aplikasi</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={handleContactBuyerWhatsapp}
              disabled={contactBusy}
            >
              {contactBusy ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <Phone className="mr-3 h-5 w-5 text-green-600" />
              )}
              <div className="text-left">
                <p className="font-medium leading-none">WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Nomor WhatsApp terverifikasi pembeli</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Proses Pesanan */}
      <AlertDialog open={confirmProcessOpen} onOpenChange={setConfirmProcessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proses Pengiriman?</AlertDialogTitle>
            <AlertDialogDescription>
              {instant
                ? `Biteship akan segera mencari driver ${order.biteshipCourierName ?? order.biteshipCourierCode} untuk mengambil paket ini.`
                : `Biteship akan membuat resi pengiriman via ${order.biteshipCourierName ?? order.biteshipCourierCode}. Pastikan paket sudah siap dikirim.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessShipment} disabled={isProcessingShipment}>
              {isProcessingShipment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {instant ? "Cari Driver" : "Buat Resi & Kirim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi Tandai Selesai */}
      <AlertDialog open={confirmDeliveredOpen} onOpenChange={setConfirmDeliveredOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai Pesanan Selesai?</AlertDialogTitle>
            <AlertDialogDescription>
              Konfirmasi bahwa pesanan ini sudah diterima oleh pelanggan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkDelivered} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Sudah Diterima
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi Batalkan Pesanan */}
      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Pesanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesanan akan dibatalkan dan stok produk akan dikembalikan secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tidak</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi Barang Retur Diterima → Kembalikan Stok */}
      <AlertDialog open={confirmRestockOpen} onOpenChange={setConfirmRestockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Barang retur sudah diterima?</AlertDialogTitle>
            <AlertDialogDescription>
              Lakukan ini hanya jika paket yang dikembalikan sudah benar-benar sampai
              kembali di toko. Stok produk pesanan ini akan ditambahkan kembali, dan
              tindakan ini hanya bisa dilakukan sekali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Belum</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestockReturn}
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Kembalikan Stok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi Hapus Pesanan */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pesanan Permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Data pesanan ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
