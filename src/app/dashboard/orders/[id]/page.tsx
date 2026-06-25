"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, functions } from "@/lib/firebase";
import {
  doc, onSnapshot, updateDoc, deleteDoc, getDoc,
  writeBatch, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft, Loader2, MapPin, CheckCircle2, ExternalLink, Clock,
  Truck, PackageCheck, XCircle, RefreshCw, AlertCircle, Printer,
  FileText, FileBox, Trash2, Package,
} from "lucide-react";
import Image from "next/image";
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
  { success: boolean; biteshipOrderId: string; waybillId?: string; trackingUrl?: string; status?: string }
>(functions, "createBiteshipOrder");

const trackBiteshipOrderFn = httpsCallable<
  { orderId: string },
  {
    hasDelivery: boolean;
    biteshipOrderId?: string;
    waybillId?: string;
    status?: string;
    courierName?: string;
    driverName?: string;
    driverPhone?: string;
    trackingUrl?: string;
    history?: Array<{ timestamp: string; status: string; note: string }>;
  }
>(functions, "trackBiteshipOrder");

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
  shippingMethod?: string;
  date: any;
  shippedAt?: any;
  products: OrderProduct[];
  biteshipOrderId?: string;
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
}

interface TrackingResult {
  hasDelivery: boolean;
  status?: string;
  courierName?: string;
  driverName?: string;
  driverPhone?: string;
  trackingUrl?: string;
  waybillId?: string;
  history?: Array<{ timestamp: string; status: string; note: string }>;
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
    customer: data.customerDetails?.name ?? data.customer ?? "N/A",
    customerDetails: data.customerDetails ?? {},
    status: data.status ?? "pending",
    paymentMethod: data.paymentMethod ?? "N/A",
    paymentStatus: data.paymentStatus ?? "unpaid",
    paymentProofUrl: data.paymentProofUrl,
    total: toNum(data.total),
    subtotal: toNum(data.subtotal),
    shippingFee: toNum(data.shippingFee),
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
  };
}

function getStatusInfo(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "pending")    return { title: "Menunggu Pembayaran", icon: Clock,        color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  if (s === "processing") return { title: "Perlu Dikirim",       icon: RefreshCw,    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" };
  if (s === "shipped" || s === "dikirim")
                          return { title: "Dalam Pengiriman",    icon: Truck,        color: "text-cyan-600",   bg: "bg-cyan-50 border-cyan-200" };
  if (s === "delivered")  return { title: "Pesanan Selesai",     icon: PackageCheck, color: "text-green-600",  bg: "bg-green-50 border-green-200" };
  if (s === "cancelled")  return { title: "Pesanan Dibatalkan",  icon: XCircle,      color: "text-red-600",    bg: "bg-red-50 border-red-200" };
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

function printWaybill(order: Order) {
  const w = window.open("", "_blank", "width=420,height=600");
  if (!w) return;
  const rows = order.products
    .map((p) => `<tr><td>${p.name}</td><td style="text-align:center">${p.quantity}</td></tr>`)
    .join("");
  w.document.write(`<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Resi</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:16px}
h2{font-size:15px;margin-bottom:8px;border-bottom:2px solid #000;padding-bottom:4px}
.s{margin-bottom:10px}.lb{font-weight:bold;color:#555;font-size:10px;text-transform:uppercase}
.v{font-size:13px;margin-top:2px}.resi{font-size:22px;font-weight:bold;letter-spacing:2px;border:2px dashed #000;padding:6px 10px;display:inline-block;margin:4px 0}
table{width:100%;border-collapse:collapse;margin-top:4px}td,th{border:1px solid #ddd;padding:4px 6px;font-size:11px}th{background:#f5f5f5;font-weight:bold}
@media print{body{padding:4px}}</style></head>
<body>
<h2>Resi Pengiriman — Gogama Store</h2>
<div class="s"><div class="lb">No. Resi</div><div class="resi">${order.waybillId || "-"}</div></div>
<div class="s"><div class="lb">Kurir</div><div class="v">${order.biteshipCourierName ?? order.biteshipCourierCode ?? "-"}${order.biteshipServiceName ? " — " + order.biteshipServiceName : ""}</div></div>
<div class="s"><div class="lb">Kepada</div><div class="v"><strong>${order.customerDetails?.name ?? order.customer}</strong></div>
<div class="v">${order.customerDetails?.address ?? "-"}</div>
<div class="v">Telp/WA: ${order.customerDetails?.whatsapp ?? order.customerDetails?.phone ?? "-"}</div></div>
<div class="s"><div class="lb">Isi Paket</div>
<table><thead><tr><th>Produk</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="s"><div class="lb">No. Pesanan</div><div class="v">#${order.id}</div></div>
<br><button onclick="window.print()" style="width:100%;padding:8px;font-size:13px;cursor:pointer;">🖨️ Cetak / Print</button>
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

  // Shipment processing
  const [isProcessingShipment, setIsProcessingShipment] = useState(false);
  const [confirmProcessOpen, setConfirmProcessOpen] = useState(false);

  // Tracking
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmDeliveredOpen, setConfirmDeliveredOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ── Lacak Pengiriman ───────────────────────────────────────────

  const handleTrack = useCallback(async () => {
    if (!order) return;
    setIsTracking(true);
    setTrackingError(null);
    try {
      const res = await trackBiteshipOrderFn({ orderId: order.id });
      setTrackingResult(res.data);
    } catch (err: any) {
      setTrackingError(err?.message ?? "Gagal mengambil data tracking.");
    } finally {
      setIsTracking(false);
    }
  }, [order]);

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

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const sLower = (order.status ?? "").toLowerCase();
  const isPendingPayment = order.paymentStatus === "pending_payment";
  const isProcessing = isPaid(order.paymentStatus) && sLower === "processing";
  const isShipped = ["shipped", "dikirim"].includes(sLower);
  const isDelivered = ["delivered"].includes(sLower);
  const isCancelled = ["cancelled"].includes(sLower) || ["cancelled", "failed"].includes(order.paymentStatus.toLowerCase());
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
              <Button variant="outline" onClick={handleTrack} disabled={isTracking}>
                {isTracking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                {isTracking ? "Memuat..." : "Lacak Pengiriman"}
              </Button>
              {order.waybillId && !instant && (
                <Button variant="outline" onClick={() => printWaybill(order)}>
                  <Printer className="mr-2 h-4 w-4" />Cetak Resi
                </Button>
              )}
              {order.deliveryTrackingUrl && (
                <Button variant="outline" asChild>
                  <a href={order.deliveryTrackingUrl} target="_blank" rel="noopener noreferrer">
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
          <Button variant="outline" onClick={handleTrack} disabled={isTracking}>
            {isTracking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            {isTracking ? "Memuat..." : "Lacak Pengiriman"}
          </Button>
          {order.waybillId && (
            <Button variant="outline" onClick={() => printWaybill(order)}>
              <Printer className="mr-2 h-4 w-4" />Cetak Resi
            </Button>
          )}
          {order.deliveryTrackingUrl && (
            <Button variant="outline" asChild>
              <a href={order.deliveryTrackingUrl} target="_blank" rel="noopener noreferrer">
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
            <Button variant="outline" onClick={() => printWaybill(order)}>
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
        {order.deliveryTrackingUrl && (
          <div className="flex gap-3">
            <span className="text-sm text-muted-foreground w-40 shrink-0">Link Tracking</span>
            <a href={order.deliveryTrackingUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary underline flex items-center gap-1">
              Buka Tracking <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {order.deliveryNotes && <InfoRow label="Catatan Kurir" value={order.deliveryNotes} />}
      </Section>

      {/* ── Riwayat Tracking ── */}
      {hasBiteship && (
        <div className="space-y-2">
          {!trackingResult && (
            <Button variant="outline" className="w-full" onClick={handleTrack} disabled={isTracking}>
              {isTracking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
              {isTracking ? "Memuat riwayat..." : "Muat Riwayat Tracking"}
            </Button>
          )}

          {trackingError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />{trackingError}
            </div>
          )}

          {trackingResult?.hasDelivery && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <p className="font-semibold text-sm">Riwayat Tracking</p>
                <div className="flex items-center gap-2">
                  {trackingResult.status && (
                    <Badge variant="secondary" className="text-xs">
                      {trackingResult.status.toUpperCase()}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleTrack} disabled={isTracking}>
                    <RefreshCw className={`h-3 w-3 ${isTracking ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
              <div className="px-4 py-4 space-y-2">
                {(trackingResult.courierName || trackingResult.driverName) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {trackingResult.courierName && <p>Kurir: {trackingResult.courierName}</p>}
                    {trackingResult.driverName && (
                      <p>Driver: {trackingResult.driverName}
                        {trackingResult.driverPhone ? ` (${trackingResult.driverPhone})` : ""}
                      </p>
                    )}
                  </div>
                )}

                {trackingResult.history && trackingResult.history.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-3">
                      {trackingResult.history.map((h, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                            {i < trackingResult.history!.length - 1 && (
                              <div className="w-px flex-1 bg-gray-200 mt-1" />
                            )}
                          </div>
                          <div className="pb-2">
                            <p className="text-sm font-medium">{h.status}</p>
                            {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                            <p className="text-xs text-muted-foreground">{h.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {trackingResult.history?.length === 0 && (
                  <p className="text-xs text-muted-foreground">Belum ada riwayat pergerakan paket.</p>
                )}
              </div>
            </div>
          )}

          {trackingResult && !trackingResult.hasDelivery && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
              <Package className="h-4 w-4 shrink-0" />
              Belum ada data tracking dari Biteship.
            </div>
          )}
        </div>
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
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Tombol Bawah (Tersedia di Semua Status) ── */}
      {!isCancelled && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="font-semibold text-sm">Aksi Admin</p>
          </div>
          <div className="px-4 py-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => generatePdf("invoice")}>
              <FileText className="mr-2 h-4 w-4" />Faktur
            </Button>
            <Button variant="outline" size="sm" onClick={() => generatePdf("packingSlip")}>
              <FileBox className="mr-2 h-4 w-4" />Packing Slip
            </Button>
            {order.waybillId && (
              <Button variant="outline" size="sm" onClick={() => printWaybill(order)}>
                <Printer className="mr-2 h-4 w-4" />Cetak Resi
              </Button>
            )}
            {!isDelivered && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />Batalkan Pesanan
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}

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
