"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download, FileText, Printer, Loader2, Edit, XCircle, Trash2, Minus, Plus,
  PlusCircle, Search, Calendar as CalendarIcon, DollarSign, MessageSquare,
  MoreHorizontal, Package, User, ExternalLink, FileBox, Truck,
  MapPin, AlertCircle,
} from "lucide-react";
import {
  collection, doc, updateDoc, getDoc, query, orderBy, writeBatch, deleteDoc,
  serverTimestamp, onSnapshot,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { id as dateFnsLocaleId } from "date-fns/locale";
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

// ── Badges ─────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    paid:            { label: "Lunas",       cls: "bg-green-100 text-green-700 border-green-300" },
    settlement:      { label: "Lunas",       cls: "bg-green-100 text-green-700 border-green-300" },
    pending_payment: { label: "Belum Bayar", cls: "bg-orange-100 text-orange-700 border-orange-300" },
    cancelled:       { label: "Dibatalkan",  cls: "bg-red-100 text-red-700 border-red-300" },
    failed:          { label: "Kadaluarsa",  cls: "bg-red-100 text-red-700 border-red-300" },
    unpaid:          { label: "Belum Lunas", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  };
  const cfg = map[s] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-300" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Menunggu",   cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    processing: { label: "Diproses",  cls: "bg-blue-100 text-blue-700 border-blue-300" },
    shipped:    { label: "Dikirim",   cls: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    dikirim:    { label: "Dikirim",   cls: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    delivered:  { label: "Selesai",   cls: "bg-green-100 text-green-700 border-green-300" },
    cancelled:  { label: "Dibatalkan",cls: "bg-red-100 text-red-700 border-red-300" },
  };
  const cfg = map[s] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-300" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Types ──────────────────────────────────────────────────────────

interface OrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  imageUrl?: string;
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
  // Biteship
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
  // Midtrans
  midtransToken?: string;
  midtransRedirectUrl?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  stock: number;
  image: string;
  purchasePrice?: number;
}

// ── Helpers ────────────────────────────────────────────────────────

const formatCurrency = (amount: number | string) => {
  const n = typeof amount === "string" ? parseFloat(String(amount).replace(/[^0-9.]/g, "")) : amount;
  if (isNaN(n)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
};

const toNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  return 0;
};

function isPaid(paymentStatus: string) {
  return ["paid", "settlement", "Paid"].includes(paymentStatus);
}

function fromFirestore(id: string, data: Record<string, any>): Order {
  const status = data.status ?? "pending";
  return {
    id,
    customer: data.customerDetails?.name ?? data.customer ?? "N/A",
    customerDetails: data.customerDetails ?? {},
    status,
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

// ── Cetak Resi (open print window) ────────────────────────────────

interface StoreInfo { name: string; phone: string; address: string; }

function printWaybill(
  order: Order,
  overrides?: { courierTrackingId?: string; waybillId?: string },
  storeInfo?: StoreInfo,
) {
  const w = window.open("", "_blank", "width=520,height=780");
  if (!w) return;

  const waybillId   = overrides?.waybillId       ?? order.waybillId       ?? "";
  const trackingId  = overrides?.courierTrackingId ?? order.biteshipCourierTrackingId ?? "";
  const trackingUrl = trackingId ? `https://track.biteship.com/${trackingId}` : (order.deliveryTrackingUrl ?? "");

  const refId        = order.biteshipOrderId ?? order.id;
  const courierLabel = [order.biteshipCourierName ?? order.biteshipCourierCode, order.biteshipServiceName ?? order.biteshipServiceCode].filter(Boolean).join(" ");
  const serviceName  = order.biteshipServiceName ?? order.biteshipServiceCode ?? "-";
  const routingCode  = order.biteshipCourierRoutingCode ?? "";
  const shippingFee  = order.shippingFee ? new Intl.NumberFormat("id-ID").format(order.shippingFee) : "-";
  const totalQty     = order.products.reduce((s, p) => s + p.quantity, 0);
  const totalWeight  = (order.products.reduce((s, p) => s + p.quantity * 200, 0) / 1000).toFixed(1);
  const itemsList    = order.products.map(p => p.quantity + "x " + p.name).join("<br>");
  const catatan      = order.deliveryNotes || "Order #" + order.id + " dari Gogama Store";
  const logoUrl      = window.location.origin + "/gogamalogo.png";
  const bcWaybill    = waybillId ? "JsBarcode('#bcW','"+waybillId+"',{format:'CODE128',width:2,height:60,displayValue:false,margin:4});" : "";
  const bcRef        = refId    ? "JsBarcode('#bcR','"+refId+"',{format:'CODE128',width:1.2,height:35,displayValue:false,margin:2});" : "";

  const storeName = storeInfo?.name    ?? "Gogama Store";
  const storePhone = storeInfo?.phone  ?? "";
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
#bcW{width:100%;height:65px}
#bcR{width:100%;height:38px}
.resi-lbl{font-size:13px;font-weight:bold;margin-top:3px}
.svc{border:1px solid #000;border-top:none;padding:5px 9px;text-align:center;font-size:10px;line-height:1.5}
.ref-row{border:1px solid #000;border-top:none;display:flex}
.ref-l{flex:1;padding:5px 7px;border-right:1px solid #000}
.ref-r{width:42%;padding:5px 7px}
.lbl{font-weight:bold;font-size:10px;margin-bottom:2px}
.val{font-size:10px;word-break:break-all;margin-top:2px}
.addr-row{border:1px solid #000;border-top:none;display:flex;min-height:75px}
.addr{flex:1;padding:5px 7px}
.addr:first-child{border-right:1px solid #000}
.anm{font-weight:bold;font-size:11px;margin:2px 0}
.aln{font-size:10px;margin-top:1px;line-height:1.35}
.items{border:1px solid #000;border-top:none;padding:5px 7px;font-size:10px;line-height:1.4}
.ir{display:flex;gap:5px;margin-bottom:1px}
.ik{font-weight:bold;min-width:75px;flex-shrink:0}
.ftr{border:1px solid #000;border-top:none;padding:5px;text-align:center;font-size:10px}
.ftr a{color:#0066cc;word-break:break-all;text-decoration:none}
.pbtn{width:100%;padding:8px;font-size:13px;cursor:pointer;margin-top:7px;background:#1a73e8;color:#fff;border:none;border-radius:4px;font-weight:bold}
@media print{.pbtn{display:none}@page{size:A6;margin:3mm}}
</style></head><body>

<div class="hdr">
  <img src="${logoUrl}" class="logo" alt="Gogama" onerror="this.style.display='none'">
  <div class="courier">${courierLabel || "-"}</div>
</div>

<div class="bc">
  <svg id="bcW"></svg>
  <p class="resi-lbl">Nomor Resi - ${waybillId || "-"}</p>
</div>

<div class="svc">
  <p>Ongkos Kirim: Rp. ${shippingFee}</p>
  <p>Jenis Layanan - ${serviceName}${routingCode ? ". Kode Rute - " + routingCode : ""}</p>
</div>

<div class="ref-row">
  <div class="ref-l">
    <p class="lbl">Reference Number</p>
    <svg id="bcR"></svg>
    <p class="val">${refId}</p>
  </div>
  <div class="ref-r">
    <p class="lbl">Quantity: &nbsp;${totalQty} Pcs</p><br>
    <p class="lbl">Weight: &nbsp;&nbsp;${totalWeight} Kg</p>
  </div>
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

<div class="ftr">
  ${trackingUrl ? "<a href=\"" + trackingUrl + "\">" + trackingUrl + "</a>" : "<p>Gogama Store</p>"}
</div>

<button class="pbtn" onclick="window.print()">🖨️ Cetak / Print</button>

<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script>window.addEventListener('load',function(){try{${bcWaybill}${bcRef}}catch(e){}});<\/script>
</body></html>`);
  w.document.close();
}

// ── ProcessShipmentDialog ──────────────────────────────────────────

function ProcessShipmentDialog({
  order,
  onSuccess,
  storeInfo,
}: {
  order: Order;
  onSuccess: () => void;
  storeInfo?: StoreInfo;
}) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    biteshipOrderId: string;
    courierTrackingId?: string;
    waybillId?: string;
    trackingUrl?: string;
    status?: string;
  } | null>(null);
  const { toast } = useToast();

  const instant = isInstantCourier(order.biteshipCourierCode);
  const courierLabel =
    order.biteshipCourierName ??
    order.biteshipCourierCode ??
    order.shippingMethod ??
    "Kurir";

  async function handleProcess() {
    setProcessing(true);
    try {
      const res = await createBiteshipOrderFn({ orderId: order.id });
      setResult(res.data);
      onSuccess();
      toast({ title: instant ? "Driver sedang dicari!" : "Resi berhasil dibuat!" });
      if (!instant && res.data.waybillId) {
        printWaybill(order, { courierTrackingId: res.data.courierTrackingId, waybillId: res.data.waybillId }, storeInfo);
      }
    } catch (err: any) {
      toast({
        title: "Gagal memproses pengiriman",
        description: err?.message ?? "Terjadi kesalahan pada Biteship.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => setResult(null), 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary">
          <Truck className="mr-2 h-4 w-4" />
          Proses Pesanan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result ? (instant ? "Driver Dicari 🚀" : "Resi Pengiriman ✅") : "Konfirmasi Pengiriman"}
          </DialogTitle>
          <DialogDescription>
            {result
              ? instant
                ? "Biteship sedang mencari driver. Status akan diperbarui otomatis."
                : "Resi berhasil dibuat. Cetak dan tempel pada paket Anda."
              : `Proses pengiriman via ${courierLabel} untuk pesanan ini?`}
          </DialogDescription>
        </DialogHeader>

        {/* ─ Tampil konfirmasi ─ */}
        {!result && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
              <p className="font-semibold">{order.customerDetails?.name ?? order.customer}</p>
              <p className="text-muted-foreground">{order.customerDetails?.address ?? "-"}</p>
              <p className="text-muted-foreground">WA: {order.customerDetails?.whatsapp ?? "-"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{courierLabel}</p>
                {order.biteshipServiceName && (
                  <p className="text-xs text-muted-foreground">{order.biteshipServiceName}</p>
                )}
                {instant && (
                  <p className="text-xs text-orange-600">⚡ Pengiriman Instan — driver dicari otomatis</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─ Tampil hasil ─ */}
        {result && (
          <div className="space-y-3 py-2">
            {result.waybillId && (
              <div className="rounded-lg border-2 border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">No. Resi</p>
                <p className="text-2xl font-bold tracking-widest">{result.waybillId}</p>
              </div>
            )}
            {instant && !result.waybillId && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Resi akan tersedia setelah driver menerima pesanan. Cek status di "Lihat Rincian".</span>
              </div>
            )}
            {result.courierTrackingId && (
              <a href={`https://track.biteship.com/${result.courierTrackingId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />Lacak di Biteship
              </a>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button onClick={handleProcess} disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {instant ? "Cari Driver Sekarang" : "Buat Resi & Kirim"}
              </Button>
            </>
          ) : (
            <>
              {result.waybillId && (
                <Button variant="outline" onClick={() => printWaybill(order, { courierTrackingId: result!.courierTrackingId, waybillId: result!.waybillId }, storeInfo)}>
                  <Printer className="mr-2 h-4 w-4" />Cetak Resi
                </Button>
              )}
              <Button onClick={handleClose}>Selesai</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ShipmentDetailDialog ───────────────────────────────────────────

function ShipmentDetailDialog({ order, storeInfo }: { order: Order; storeInfo?: StoreInfo }) {
  const instant = isInstantCourier(order.biteshipCourierCode);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MapPin className="mr-2 h-4 w-4" />
          Lihat Rincian
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rincian Pengiriman</DialogTitle>
          <DialogDescription>Pesanan #{order.id.substring(0, 10)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          {/* Resi */}
          {order.waybillId && (
            <div className="rounded-lg border-2 border-dashed p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">No. Resi</p>
              <p className="text-xl font-bold tracking-widest">{order.waybillId}</p>
            </div>
          )}
          {instant && !order.waybillId && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-orange-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Resi belum tersedia. Driver sedang dicari atau paket belum diambil.</span>
            </div>
          )}

          {/* Info kurir */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Kurir</p>
              <p className="font-medium">{order.biteshipCourierName ?? order.biteshipCourierCode ?? "-"}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Layanan</p>
              <p className="font-medium">{order.biteshipServiceName ?? order.biteshipServiceCode ?? "-"}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Status Kurir</p>
              <p className="font-medium">{order.biteshipStatus ?? "-"}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Biteship Order ID</p>
              <p className="font-medium text-xs truncate">{order.biteshipOrderId ?? "-"}</p>
            </div>
          </div>

          {/* Tujuan */}
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-semibold">{order.customerDetails?.name ?? order.customer}</p>
            <p className="text-muted-foreground">{order.customerDetails?.address ?? "-"}</p>
            <p className="text-muted-foreground">WA: {order.customerDetails?.whatsapp ?? "-"}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {order.waybillId && (
            <Button variant="outline" onClick={() => printWaybill(order, undefined, storeInfo)}>
              <Printer className="mr-2 h-4 w-4" />Cetak Resi
            </Button>
          )}
          {order.biteshipCourierTrackingId && (
            <Button asChild>
              <a href={`https://track.biteship.com/${order.biteshipCourierTrackingId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />Lacak Paket
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AddProductToOrderDialog ────────────────────────────────────────

function AddProductToOrderDialog({
  currentProducts,
  onAddProduct,
}: {
  currentProducts: OrderProduct[];
  onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    import("firebase/firestore").then(({ getDocs, collection: col }) =>
      getDocs(col(db, "products")).then((snap) => {
        setAllProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        setLoading(false);
      })
    );
  }, [isOpen]);

  const filtered = useMemo(() => {
    const ids = new Set(currentProducts.map((p) => p.productId));
    return allProducts
      .filter((p) => !ids.has(p.id))
      .filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [allProducts, currentProducts, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Tambah Produk</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Produk ke Pesanan</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama / SKU..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead><TableHead>Stok</TableHead>
                <TableHead>Harga</TableHead><TableHead className="w-36">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat...</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>{formatCurrency(p.price)}</TableCell>
                  <TableCell>
                    <Input type="number" defaultValue={1} min={1} max={p.stock}
                      onChange={(e) => setQuantity(Number(e.target.value))} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => { onAddProduct(p, quantity); setIsOpen(false); }}>Tambah</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── EditOrderDialog ────────────────────────────────────────────────

function EditOrderDialog({ order, onOrderUpdated }: { order: Order; onOrderUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [editableProducts, setEditableProducts] = useState<OrderProduct[]>([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (order) {
      setEditableProducts((order.products ?? []).map((p) => ({ ...p, sku: String(p.sku ?? "") })));
      setShippingFee(order.shippingFee ?? 0);
    }
  }, [order]);

  const subtotal = useMemo(() => editableProducts.reduce((s, p) => s + p.price * p.quantity, 0), [editableProducts]);
  const newTotal = subtotal + shippingFee;

  const handleSave = async () => {
    setSaving(true);
    const batch = writeBatch(db);
    try {
      const orig = order.products ?? [];
      const adjMap = new Map<string, number>();
      orig.forEach((op) => {
        const np = editableProducts.find((p) => p.productId === op.productId);
        if (np) { if (op.quantity !== np.quantity) adjMap.set(op.productId, (adjMap.get(op.productId) ?? 0) + op.quantity - np.quantity); }
        else adjMap.set(op.productId, (adjMap.get(op.productId) ?? 0) + op.quantity);
      });
      editableProducts.forEach((np) => {
        if (!orig.some((op) => op.productId === np.productId))
          adjMap.set(np.productId, (adjMap.get(np.productId) ?? 0) - np.quantity);
      });
      for (const [pid, adj] of adjMap) {
        const pdoc = await getDoc(doc(db, "products", pid));
        if (pdoc.exists()) batch.update(doc(db, "products", pid), { stock: (pdoc.data().stock ?? 0) + adj });
      }
      batch.update(doc(db, "orders", order.id), {
        products: editableProducts, shippingFee, subtotal, total: newTotal,
      });
      await batch.commit();
      toast({ title: "Pesanan berhasil diperbarui" });
      onOrderUpdated();
      setOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit className="mr-2 h-4 w-4" />Edit Pesanan
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-row justify-between items-center">
          <div>
            <DialogTitle>Edit Pesanan #{order.id.substring(0, 8)}</DialogTitle>
            <DialogDescription>Ubah jumlah, hapus, atau tambah produk.</DialogDescription>
          </div>
          <AddProductToOrderDialog currentProducts={editableProducts}
            onAddProduct={(p, qty) => setEditableProducts((prev) => [...prev, {
              productId: p.id, name: p.name, quantity: qty,
              price: toNum(p.price), imageUrl: p.image, sku: p.sku,
            }])} />
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead><TableHead className="w-36">Jumlah</TableHead>
                <TableHead className="text-right">Harga</TableHead><TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableProducts.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => setEditableProducts((ps) => ps.map((x) => x.productId === p.productId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input type="number" value={p.quantity} className="w-14 h-7 text-center"
                        onChange={(e) => setEditableProducts((ps) => ps.map((x) => x.productId === p.productId ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))} />
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => setEditableProducts((ps) => ps.map((x) => x.productId === p.productId ? { ...x, quantity: x.quantity + 1 } : x))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(p.price * p.quantity)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon"
                      onClick={() => setEditableProducts((ps) => ps.filter((x) => x.productId !== p.productId))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="space-y-2">
              <Label>Biaya Pengiriman</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} className="pl-8" />
              </div>
            </div>
            <div className="text-right pt-6 space-y-1">
              <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="font-bold text-base">Total Baru: {formatCurrency(newTotal)}</p>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || editableProducts.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ name: "Gogama Store", phone: "", address: "" });
  const { toast } = useToast();

  // ── Load store info ──────────────────────────────────────────────

  useEffect(() => {
    getDoc(doc(db, "settings", "store")).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setStoreInfo({
        name: d.storeName || "Gogama Store",
        phone: d.storePhone || "",
        address: [d.address, d.city, d.province, d.postalCode].filter(Boolean).join(", "),
      });
    }).catch(() => {});
  }, []);

  // ── Real-time orders ─────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const orders = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, any>));

      // Auto-complete: Shipped > 4 days → Delivered
      const fourDaysAgo = subDays(new Date(), 4);
      const batch = writeBatch(db);
      let changed = false;
      orders.forEach((o) => {
        if (
          ["shipped", "Shipped", "dikirim", "Dikirim"].includes(o.status) &&
          o.shippedAt?.toDate?.() < fourDaysAgo
        ) {
          batch.update(doc(db, "orders", o.id), { status: "Delivered" });
          changed = true;
        }
      });
      if (changed) await batch.commit();

      setAllOrders(orders);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── PDF helpers ──────────────────────────────────────────────────

  const generatePdf = useCallback(async (orderId: string, type: "invoice" | "packingSlip") => {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) { toast({ variant: "destructive", title: "Pesanan tidak ditemukan" }); return; }
    const order = fromFirestore(snap.id, snap.data() as Record<string, any>);

    const pdf = new jsPDF();
    pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
    pdf.text(type === "invoice" ? "FAKTUR PENJUALAN" : "SLIP PENGEPAKAN", 105, 20, { align: "center" });
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    pdf.text(`No. Pesanan: ${order.id}`, 14, 30);
    if (order.date?.toDate)
      pdf.text(`Tanggal: ${format(order.date.toDate(), "dd MMMM yyyy, HH:mm", { locale: dateFnsLocaleId })}`, 14, 35);
    pdf.text(`Status: ${order.status} | Bayar: ${order.paymentStatus}`, 14, 40);
    pdf.text(`Kepada: ${order.customerDetails?.name ?? order.customer}`, 14, 50);
    const addrLines = pdf.splitTextToSize(order.customerDetails?.address ?? "-", 90);
    pdf.text(addrLines, 14, 55);
    const afterAddr = 55 + addrLines.length * 5;
    pdf.text(`WA: ${order.customerDetails?.whatsapp ?? "-"}`, 14, afterAddr);

    const cols = type === "invoice"
      ? ["Produk", "Qty", "Harga", "Subtotal"]
      : ["No.", "SKU", "Produk", "Qty"];
    const rows = type === "invoice"
      ? order.products.map((p) => [p.name, p.quantity, formatCurrency(p.price), formatCurrency(p.price * p.quantity)])
      : order.products.map((p, i) => [i + 1, p.sku ?? "N/A", p.name, p.quantity]);

    pdf.autoTable({ head: [cols], body: rows, startY: afterAddr + 10, theme: "grid" });
    const fY = (pdf as any).lastAutoTable.finalY;
    if (type === "invoice") {
      pdf.setFontSize(10);
      pdf.text("Subtotal:", 140, fY + 10); pdf.text(formatCurrency(order.subtotal), 200, fY + 10, { align: "right" });
      pdf.text("Ongkir:", 140, fY + 15); pdf.text(formatCurrency(order.shippingFee), 200, fY + 15, { align: "right" });
      pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL:", 140, fY + 22); pdf.text(formatCurrency(order.total), 200, fY + 22, { align: "right" });
    }
    pdf.save(`${type === "invoice" ? "Faktur" : "Packing"}-${order.id.substring(0, 8)}.pdf`);
  }, [toast]);

  const generateBulkDocuments = useCallback(async (type: "invoice" | "packingSlip") => {
    const pdf = new jsPDF();
    let first = true;
    for (const orderId of selectedOrders) {
      const snap = await getDoc(doc(db, "orders", orderId));
      if (!snap.exists()) continue;
      if (!first) pdf.addPage();
      const order = fromFirestore(snap.id, snap.data() as Record<string, any>);
      pdf.setFontSize(16); pdf.setFont("helvetica", "bold");
      pdf.text(type === "invoice" ? "FAKTUR PENJUALAN" : "SLIP PENGEPAKAN", 105, 20, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`No. Pesanan: ${order.id}`, 14, 30);
      pdf.text(`Kepada: ${order.customerDetails?.name ?? order.customer}`, 14, 36);
      const addrLines = pdf.splitTextToSize(order.customerDetails?.address ?? "-", 90);
      pdf.text(addrLines, 14, 41);
      const afterAddr = 41 + addrLines.length * 5;
      const cols = type === "invoice"
        ? ["Produk", "Qty", "Harga", "Subtotal"]
        : ["No.", "SKU", "Produk", "Qty"];
      const rows = type === "invoice"
        ? order.products.map((p) => [p.name, p.quantity, formatCurrency(p.price), formatCurrency(p.price * p.quantity)])
        : order.products.map((p, i) => [i + 1, p.sku ?? "N/A", p.name, p.quantity]);
      pdf.autoTable({ head: [cols], body: rows, startY: afterAddr + 6 });
      first = false;
    }
    pdf.save(`dokumen-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [selectedOrders]);

  // ── Order actions ─────────────────────────────────────────────────

  const updateOrderStatus = useCallback(async (orderId: string, updates: Record<string, unknown>) => {
    setIsProcessing(orderId);
    try {
      if (updates.status === "Shipped") updates.shippedAt = serverTimestamp();
      await updateDoc(doc(db, "orders", orderId), updates as any);
      toast({ title: "Status pesanan diperbarui" });
    } catch {
      toast({ title: "Gagal memperbarui", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  }, [toast]);

  const handleCancelOrder = useCallback(async (order: Order) => {
    setIsProcessing(order.id);
    const batch = writeBatch(db);
    try {
      batch.update(doc(db, "orders", order.id), { status: "Cancelled", paymentStatus: "cancelled" });
      for (const item of order.products ?? []) {
        const pdoc = await getDoc(doc(db, "products", item.productId));
        if (pdoc.exists())
          batch.update(doc(db, "products", item.productId), { stock: (pdoc.data().stock ?? 0) + item.quantity });
      }
      await batch.commit();
      toast({ title: "Pesanan dibatalkan & stok dikembalikan" });
    } catch {
      toast({ title: "Gagal membatalkan", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  }, [toast]);

  const deleteOrder = useCallback(async (orderId: string) => {
    setIsProcessing(orderId);
    try {
      await deleteDoc(doc(db, "orders", orderId));
      toast({ title: "Pesanan dihapus" });
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  }, [toast]);

  // ── Filtering ─────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    let base = allOrders;

    if (dateRange?.from || dateRange?.to) {
      base = base.filter((o) => {
        if (!o.date?.toDate) return false;
        const d = o.date.toDate();
        if (dateRange.from && d < startOfDay(dateRange.from)) return false;
        if (dateRange.to && d > endOfDay(dateRange.to)) return false;
        return true;
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      base = base.filter(
        (o) =>
          (o.customerDetails?.name ?? o.customer ?? "").toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
      );
    }

    const statusLower = (s: string) => s.toLowerCase();

    // "Belum Bayar" = pending_payment (menunggu pembayaran Midtrans)
    const toProcess = base.filter((o) => o.paymentStatus === "pending_payment");

    // "Perlu Dikirim" = LUNAS + PROCESSING (siap kirim)
    const toShip = base.filter(
      (o) =>
        isPaid(o.paymentStatus) &&
        ["processing", "Processing"].includes(o.status)
    );

    // "Dikirim" = status shipped/dikirim (kurir sudah pickup)
    const shipped = base.filter(
      (o) =>
        ["shipped", "Shipped", "dikirim", "Dikirim"].includes(o.status) &&
        !["cancelled", "failed"].includes(o.paymentStatus.toLowerCase())
    );

    // "Selesai" — "Selesai" untuk data lama sebelum normalisasi status
    const delivered = base.filter((o) =>
      ["delivered", "Delivered", "Selesai", "selesai"].includes(statusLower(o.status))
    );

    // "Dibatalkan" — "Dibatalkan" untuk data lama sebelum normalisasi status
    const cancelled = base.filter(
      (o) =>
        ["cancelled", "failed"].includes(o.paymentStatus.toLowerCase()) ||
        ["cancelled", "Cancelled", "Dibatalkan", "dibatalkan"].includes(o.status)
    );

    return { toProcess, toShip, shipped, delivered, cancelled };
  }, [allOrders, dateRange, searchTerm]);

  // ── Select helpers ────────────────────────────────────────────────

  const handleSelectOrder = (orderId: string, checked: boolean) =>
    setSelectedOrders((p) => checked ? [...p, orderId] : p.filter((id) => id !== orderId));

  const handleSelectAll = (orders: Order[], checked: boolean) => {
    const ids = orders.map((o) => o.id);
    setSelectedOrders((p) => checked ? [...new Set([...p, ...ids])] : p.filter((id) => !ids.includes(id)));
  };

  // ── Main action button per tab ────────────────────────────────────

  function renderMainAction(order: Order, tabName: string) {
    if (isProcessing === order.id) return <Loader2 className="h-4 w-4 animate-spin" />;

    switch (tabName) {
      case "toProcess":
        return null;

      case "toShip":
        // Sudah diproses ke Biteship → Lihat Rincian
        if (order.biteshipOrderId) {
          return <ShipmentDetailDialog order={order} storeInfo={storeInfo} />;
        }
        // Pickup / COD tanpa Biteship
        if (!order.biteshipCourierCode && order.shippingMethod?.toLowerCase() === "pickup") {
          return (
            <Button size="sm" onClick={() => updateOrderStatus(order.id, { status: "Shipped", shippedAt: serverTimestamp() })}>
              <Truck className="mr-2 h-4 w-4" />Tandai Diambil
            </Button>
          );
        }
        // Proses via Biteship
        return (
          <ProcessShipmentDialog
            order={order}
            onSuccess={() => { /* onSnapshot otomatis refresh */ }}
            storeInfo={storeInfo}
          />
        );

      case "shipped":
        return <ShipmentDetailDialog order={order} storeInfo={storeInfo} />;

      case "delivered":
        return (
          <Button size="sm" variant="outline" onClick={() => generatePdf(order.id, "invoice")}>
            <FileText className="mr-2 h-4 w-4" />Download Faktur
          </Button>
        );

      case "cancelled":
        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />Hapus
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus pesanan ini?</AlertDialogTitle>
                <AlertDialogDescription>Data pesanan akan dihapus permanen.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive hover:bg-destructive/90">
                  Ya, Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );

      default:
        return null;
    }
  }

  // ── Render order list ─────────────────────────────────────────────

  function renderOrderList(orders: Order[], tabName: string) {
    if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const selCount = orders.filter((o) => selectedOrders.includes(o.id)).length;
    const allSel = orders.length > 0 && selCount === orders.length;

    return (
      <div className="space-y-4">
        {/* Select all bar */}
        <div className="flex items-center gap-3 px-2 py-2 bg-muted/50 rounded-md">
          <Checkbox id={`sa-${tabName}`} checked={allSel}
            onCheckedChange={(c) => handleSelectAll(orders, !!c)} />
          <Label htmlFor={`sa-${tabName}`} className="text-sm font-medium cursor-pointer">
            Pilih Semua ({selCount}/{orders.length})
          </Label>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Tidak ada pesanan di kategori ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                {/* Clickable area: header + content → detail page */}
                <div
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                >
                {/* Header: checkbox + order ID + tanggal */}
                <CardHeader className="p-4 pb-3 flex-row items-center justify-between border-b gap-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(c) => handleSelectOrder(order.id, !!c)}
                    />
                    <span className="text-sm font-bold">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  {order.date?.toDate && (
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {format(order.date.toDate(), "dd MMM yyyy, HH:mm", { locale: dateFnsLocaleId })}
                    </span>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Nama customer + WA */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">
                      {order.customerDetails?.name ?? order.customer}
                    </span>
                    <a
                      href={`https://wa.me/${order.customerDetails?.whatsapp ?? ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare className="h-4 w-4 text-green-600 hover:text-green-700" />
                    </a>
                  </div>

                  {/* Produk (maks 2) */}
                  <div className="space-y-1.5">
                    {order.products.slice(0, 2).map((p) => (
                      <div key={p.productId} className="flex items-center gap-3">
                        <Image
                          src={p.imageUrl || p.image || "https://placehold.co/40x40.png"}
                          alt={p.name} width={36} height={36}
                          className="rounded border object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground">×{p.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {order.products.length > 2 && (
                      <p className="text-xs text-muted-foreground pl-1">
                        +{order.products.length - 2} produk lainnya
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Badges + total */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PaymentBadge status={order.paymentStatus} />
                      <StatusBadge status={order.status} />
                      {(order.biteshipCourierName || order.shippingMethod) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {order.biteshipCourierName ?? order.shippingMethod}
                          {order.biteshipServiceName ? ` · ${order.biteshipServiceName}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm">{formatCurrency(order.total)}</p>
                  </div>

                  {/* No. resi (jika ada) */}
                  {order.waybillId && (
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded inline-flex items-center gap-1">
                      <Package className="h-3 w-3" />{order.waybillId}
                    </p>
                  )}
                  {order.biteshipOrderId && !order.waybillId && isInstantCourier(order.biteshipCourierCode) && (
                    <span className="text-xs text-orange-600 border border-orange-300 bg-orange-50 px-2 py-0.5 rounded">
                      Mencari driver...
                    </span>
                  )}
                </CardContent>
                </div>{/* end clickable area */}

                {/* Footer actions */}
                <CardFooter className="p-4 bg-muted/20 flex flex-wrap gap-2 justify-end border-t">
                  {isProcessing === order.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {/* Dropdown: aksi lainnya */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi Lainnya</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => generatePdf(order.id, "invoice")}>
                            <Printer className="mr-2 h-4 w-4" />Download Faktur
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generatePdf(order.id, "packingSlip")}>
                            <FileBox className="mr-2 h-4 w-4" />Dokumen Pesanan
                          </DropdownMenuItem>
                          <EditOrderDialog order={order} onOrderUpdated={() => {}} />
                          {!["cancelled", "Cancelled"].includes(order.status) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive focus:bg-accent w-full">
                                  <XCircle className="mr-2 h-4 w-4" />Batalkan Pesanan
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Batalkan pesanan ini?</AlertDialogTitle>
                                  <AlertDialogDescription>Stok produk akan dikembalikan.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelOrder(order)} className="bg-destructive hover:bg-destructive/90">
                                    Ya, Batalkan
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Bukti bayar */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileText className="mr-2 h-4 w-4" />Bukti Bayar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Bukti Pembayaran</DialogTitle>
                            <DialogDescription>{order.customerDetails?.name ?? order.customer}</DialogDescription>
                          </DialogHeader>
                          {order.paymentProofUrl ? (
                            <Link href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                              <Image src={order.paymentProofUrl} alt="Bukti bayar" width={400} height={400} className="rounded border object-contain w-full" />
                            </Link>
                          ) : (
                            <p className="text-center text-muted-foreground py-8">Belum ada bukti pembayaran.</p>
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* Tombol aksi utama */}
                      {renderMainAction(order, tabName)}
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle>Pesanan</CardTitle>
            <CardDescription>Kelola semua pesanan pelanggan secara real-time</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari No. Pesanan / Nama..." className="pl-8 w-full"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {/* Date range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-64 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "dd/MM/yy")} – ${format(dateRange.to, "dd/MM/yy")}`
                      : format(dateRange.from, "dd/MM/yy")
                    : "Pilih rentang tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" defaultMonth={dateRange?.from}
                  selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
            {/* Bulk download */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={selectedOrders.length === 0} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />Download ({selectedOrders.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Pilih Tipe Dokumen</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => generateBulkDocuments("invoice")}>
                  <Printer className="mr-2 h-4 w-4" />Faktur Penjualan
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => generateBulkDocuments("packingSlip")}>
                  <FileBox className="mr-2 h-4 w-4" />Dokumen Pesanan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="toShip">
          <TabsList className="h-auto p-1.5 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
            <TabsTrigger value="toProcess">
              Belum Bayar <Badge className="ml-1.5">{filteredOrders.toProcess.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="toShip">
              Perlu Dikirim <Badge className="ml-1.5">{filteredOrders.toShip.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="shipped">
              Dikirim <Badge className="ml-1.5">{filteredOrders.shipped.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered">
              Selesai <Badge className="ml-1.5">{filteredOrders.delivered.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Dibatalkan <Badge className="ml-1.5">{filteredOrders.cancelled.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="toProcess" className="mt-4">
            {renderOrderList(filteredOrders.toProcess, "toProcess")}
          </TabsContent>
          <TabsContent value="toShip" className="mt-4">
            {renderOrderList(filteredOrders.toShip, "toShip")}
          </TabsContent>
          <TabsContent value="shipped" className="mt-4">
            {renderOrderList(filteredOrders.shipped, "shipped")}
          </TabsContent>
          <TabsContent value="delivered" className="mt-4">
            {renderOrderList(filteredOrders.delivered, "delivered")}
          </TabsContent>
          <TabsContent value="cancelled" className="mt-4">
            {renderOrderList(filteredOrders.cancelled, "cancelled")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
