"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db, functions } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Order } from "../page";

// ── Firebase Function: tracking ────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

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
    status: (data.status ?? "pending").toLowerCase(),
    paymentMethod: data.paymentMethod ?? "N/A",
    paymentStatus: (data.paymentStatus ?? "unpaid").toLowerCase(),
    paymentProofUrl: data.paymentProofUrl,
    total: toNum(data.total),
    subtotal: toNum(data.subtotal),
    shippingFee: toNum(data.shippingFee),
    shippingMethod: data.shippingMethod ?? "",
    date: data.date,
    products: (data.products ?? []).map((p: any) => ({
      productId: p.productId ?? "",
      name: p.name ?? "",
      quantity: toNum(p.quantity),
      price: toNum(p.price),
      imageUrl: p.imageUrl ?? p.image ?? "",
      image: p.imageUrl ?? p.image ?? "",
    })),
    biteshipOrderId: data.biteshipOrderId,
    biteshipCourierCode: data.biteshipCourierCode,
    biteshipCourierName: data.biteshipCourierName,
    biteshipServiceCode: data.biteshipServiceCode,
    biteshipServiceName: data.biteshipServiceName,
    biteshipStatus: data.biteshipStatus,
    waybillId: data.waybillId,
    deliveryTrackingUrl: data.deliveryTrackingUrl,
    midtransToken: data.midtransToken,
    midtransRedirectUrl: data.midtransRedirectUrl,
  };
}

// ── Status info ────────────────────────────────────────────────────

function getStatusInfo(status: string) {
  const s = status.toLowerCase();
  if (s === "pending")    return { title: "Menunggu Diproses",   icon: Clock,        color: "text-orange-600",  bg: "bg-orange-50 border-orange-200" };
  if (s === "processing") return { title: "Sedang Diproses",     icon: RefreshCw,    color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" };
  if (s === "shipped" || s === "dikirim")
                          return { title: "Dalam Pengiriman",    icon: Truck,        color: "text-cyan-600",    bg: "bg-cyan-50 border-cyan-200" };
  if (s === "delivered" || s === "selesai")
                          return { title: "Pesanan Selesai",     icon: PackageCheck, color: "text-green-600",   bg: "bg-green-50 border-green-200" };
  if (s === "cancelled" || s === "dibatalkan")
                          return { title: "Pesanan Dibatalkan",  icon: XCircle,      color: "text-red-600",     bg: "bg-red-50 border-red-200" };
  return { title: `Status: ${status}`, icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
}

function paymentLabel(ps: string): string {
  switch (ps.toLowerCase()) {
    case "paid":            return "Lunas";
    case "settlement":      return "Lunas";
    case "pending_payment": return "Menunggu Pembayaran";
    case "cancelled":       return "Dibatalkan";
    case "failed":          return "Kadaluarsa";
    case "unpaid":          return "Belum Lunas";
    default:                return ps;
  }
}
function paymentColor(ps: string): string {
  switch (ps.toLowerCase()) {
    case "paid":
    case "settlement":      return "text-green-600";
    case "pending_payment": return "text-orange-600";
    case "cancelled":
    case "failed":          return "text-red-600";
    default:                return "text-muted-foreground";
  }
}

function paymentMethodLabel(pm: string): string {
  switch (pm.toLowerCase()) {
    case "midtrans": return "Online (Midtrans)";
    case "cod":      return "Bayar di Tempat (COD)";
    case "bank_transfer": return "Transfer Bank";
    default:         return pm;
  }
}

// ── Section card helper ────────────────────────────────────────────

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
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className={`text-sm font-medium flex-1 ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

// ── Tracking history ───────────────────────────────────────────────

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

// ── Main Page ──────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);
  const prevPaymentStatus = useRef<string | null>(null);

  // Tracking state
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Confirm delivered state
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // ── Real-time order listener ───────────────────────────────────

  useEffect(() => {
    if (authLoading || !user || !id) return;

    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const updated = fromFirestore(snap.id, snap.data() as Record<string, any>);

      // Detect expired payment
      if (
        prevPaymentStatus.current === "pending_payment" &&
        updated.paymentStatus === "failed"
      ) {
        setExpiredDialogOpen(true);
      }
      prevPaymentStatus.current = updated.paymentStatus;

      setOrder(updated);
      setLoading(false);
    });

    return unsub;
  }, [user, authLoading, id]);

  // ── Pay ────────────────────────────────────────────────────────

  function handlePay() {
    if (!order) return;
    const token = order.midtransToken;
    const url = order.midtransRedirectUrl;

    if (!token && !url) {
      toast({ title: "URL pembayaran tidak tersedia atau sudah kadaluarsa.", variant: "destructive" });
      return;
    }

    if (token && typeof window !== "undefined" && (window as any).snap) {
      (window as any).snap.pay(token, {
        onSuccess: () => toast({ title: "Pembayaran berhasil!" }),
        onPending: () => {},
        onError: () => toast({ title: "Pembayaran gagal", variant: "destructive" }),
        onClose: () => {},
      });
    } else if (url) {
      window.open(url, "_blank");
    } else {
      toast({ title: "Snap belum siap, coba muat ulang.", variant: "destructive" });
    }
  }

  // ── Track ──────────────────────────────────────────────────────

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

  function openTrackingUrl() {
    const url = order?.deliveryTrackingUrl ?? trackingResult?.trackingUrl;
    if (url) window.open(url, "_blank");
  }

  // ── Confirm delivered ──────────────────────────────────────────

  async function handleConfirmDelivered() {
    if (!order) return;
    setIsConfirming(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "delivered",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Pesanan ditandai sudah diterima." });
      setConfirmDialogOpen(false);
    } catch (e: any) {
      toast({ title: `Gagal: ${e.message}`, variant: "destructive" });
    } finally {
      setIsConfirming(false);
    }
  }

  // ── Guards ─────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Pesanan tidak ditemukan.</p>
        <Button className="mt-4" onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const isPendingPayment = order.paymentStatus === "pending_payment";
  const hasBiteship = !!(order.biteshipOrderId);
  const isShipped = ["shipped", "dikirim"].includes(order.status);
  const subtotal = order.subtotal ?? order.products.reduce((s, p) => s + p.price * p.quantity, 0);
  const shippingFee = order.shippingFee ?? (order.total - subtotal);

  return (
    <div className="container max-w-xl mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold font-headline">Detail Pesanan</h1>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusInfo.bg}`}>
        <StatusIcon className={`h-7 w-7 shrink-0 ${statusInfo.color}`} />
        <p className={`font-bold text-base ${statusInfo.color}`}>{statusInfo.title}</p>
      </div>

      {/* ── Action Buttons ── */}

      {/* 1. Bayar — jika pending_payment */}
      {isPendingPayment && (
        <div className="space-y-2">
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg" onClick={handlePay}>
            <CreditCard className="mr-2 h-5 w-5" />
            Bayar Sekarang
          </Button>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Selesaikan pembayaran sebelum batas waktu Midtrans (24 jam sejak pesanan dibuat).</span>
          </div>
        </div>
      )}

      {/* 2. Lacak — jika Biteship */}
      {hasBiteship && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleTrack} disabled={isTracking}>
            {isTracking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            {isTracking ? "Memuat..." : "Lacak Pengiriman"}
          </Button>
          {(order.deliveryTrackingUrl || trackingResult?.trackingUrl) && (
            <Button variant="outline" onClick={openTrackingUrl}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* 3. Konfirmasi Diterima — jika shipped */}
      {isShipped && (
        <Button className="w-full" size="lg" onClick={() => setConfirmDialogOpen(true)}>
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Konfirmasi Pesanan Diterima
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
        <InfoRow label="Metode Bayar" value={paymentMethodLabel(order.paymentMethod)} />
        <InfoRow
          label="Status Bayar"
          value={paymentLabel(order.paymentStatus)}
          valueClass={paymentColor(order.paymentStatus)}
        />
      </Section>

      {/* ── Pengiriman ── */}
      <Section title="Pengiriman">
        {order.shippingMethod && (
          <InfoRow label="Metode" value={order.shippingMethod} />
        )}
        <InfoRow label="Biaya Ongkir" value={formatCurrency(shippingFee)} />
        {order.biteshipCourierName && (
          <InfoRow label="Kurir" value={order.biteshipCourierName} />
        )}
        {order.biteshipServiceName && (
          <InfoRow label="Layanan" value={order.biteshipServiceName} />
        )}
        {order.waybillId && (
          <InfoRow label="No. Resi" value={order.waybillId} />
        )}
        {order.biteshipStatus && (
          <InfoRow label="Status Kurir" value={order.biteshipStatus} />
        )}
      </Section>

      {/* ── Riwayat Tracking ── */}
      {hasBiteship && (
        <div>
          {trackingError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {trackingError}
            </div>
          )}

          {trackingResult?.hasDelivery && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <p className="font-semibold text-sm">Riwayat Tracking</p>
                {trackingResult.status && (
                  <Badge variant="secondary" className="text-xs">
                    {trackingResult.status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <div className="px-4 py-4 space-y-2">
                {trackingResult.courierName && (
                  <p className="text-xs text-muted-foreground">Kurir: {trackingResult.courierName}</p>
                )}
                {trackingResult.driverName && (
                  <p className="text-xs text-muted-foreground">
                    Driver: {trackingResult.driverName}
                    {trackingResult.driverPhone ? ` (${trackingResult.driverPhone})` : ""}
                  </p>
                )}

                {trackingResult.history && trackingResult.history.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-3">
                      {trackingResult.history.slice(0, 6).map((h, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                            {i < Math.min(trackingResult.history!.length, 6) - 1 && (
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
        </div>
      )}

      {/* ── Alamat Pengiriman ── */}
      {order.customerDetails && Object.keys(order.customerDetails).length > 0 && (
        <Section title="Alamat Pengiriman">
          {order.customerDetails.name && (
            <InfoRow label="Nama" value={order.customerDetails.name} />
          )}
          {(order.customerDetails.address || order.customerDetails.fullAddress) && (
            <InfoRow label="Alamat" value={order.customerDetails.address ?? order.customerDetails.fullAddress ?? "-"} />
          )}
          {(order.customerDetails.whatsapp || order.customerDetails.phone) && (
            <InfoRow label="WhatsApp" value={order.customerDetails.whatsapp ?? order.customerDetails.phone ?? "-"} />
          )}
          {order.customerDetails.city && (
            <InfoRow label="Kota" value={`${order.customerDetails.city}${order.customerDetails.province ? ", " + order.customerDetails.province : ""}`} />
          )}
        </Section>
      )}

      {/* ── Produk ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="font-semibold text-sm">Produk</p>
        </div>
        <div className="divide-y">
          {order.products.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Image
                src={p.imageUrl || p.image || "https://placehold.co/44x44.png"}
                alt={p.name}
                width={44}
                height={44}
                className="rounded-lg border shrink-0 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(p.price)} × {p.quantity}
                </p>
              </div>
              <p className="text-sm font-bold shrink-0">
                {formatCurrency(p.price * p.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Total ── */}
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
            <span>{formatCurrency(shippingFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Pembayaran Kadaluarsa */}
      <AlertDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pembayaran Kadaluarsa</AlertDialogTitle>
            <AlertDialogDescription>
              Batas waktu pembayaran telah habis. Pesanan ini telah dibatalkan secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setExpiredDialogOpen(false); router.back(); }}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi Terima */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Terima Pesanan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin pesanan ini sudah diterima? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => { setConfirmDialogOpen(false); }}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              Batal
            </AlertDialogAction>
            <AlertDialogAction onClick={handleConfirmDelivered} disabled={isConfirming}>
              {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Sudah Diterima
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
