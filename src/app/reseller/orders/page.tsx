"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ArrowLeft, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// ── Types ──────────────────────────────────────────────────────────

interface ProductItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  image?: string;
}

export interface Order {
  id: string;
  customer: string;
  customerDetails?: Record<string, string>;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentProofUrl?: string;
  total: number;
  subtotal?: number;
  shippingFee?: number;
  shippingMethod?: string;
  date: any;
  products: ProductItem[];
  // Biteship
  biteshipOrderId?: string;
  biteshipCourierCode?: string;
  biteshipCourierName?: string;
  biteshipServiceCode?: string;
  biteshipServiceName?: string;
  biteshipStatus?: string;
  waybillId?: string;
  deliveryTrackingUrl?: string;
  // Midtrans
  midtransToken?: string;
  midtransRedirectUrl?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
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

// ── Payment badge ──────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    paid:            { label: "Lunas",             cls: "bg-green-100 text-green-700 border-green-300" },
    settlement:      { label: "Lunas",             cls: "bg-green-100 text-green-700 border-green-300" },
    pending_payment: { label: "Belum Bayar",       cls: "bg-orange-100 text-orange-700 border-orange-300" },
    cancelled:       { label: "Dibatalkan",        cls: "bg-red-100 text-red-700 border-red-300" },
    failed:          { label: "Kadaluarsa",        cls: "bg-red-100 text-red-700 border-red-300" },
    unpaid:          { label: "Belum Lunas",       cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  };
  const cfg = map[s] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-300" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Menunggu",    cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    processing: { label: "Diproses",   cls: "bg-blue-100 text-blue-700 border-blue-300" },
    shipped:    { label: "Dikirim",    cls: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    dikirim:    { label: "Dikirim",    cls: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    delivered:  { label: "Selesai",    cls: "bg-green-100 text-green-700 border-green-300" },
    selesai:    { label: "Selesai",    cls: "bg-green-100 text-green-700 border-green-300" },
    cancelled:  { label: "Dibatalkan", cls: "bg-red-100 text-red-700 border-red-300" },
    dibatalkan: { label: "Dibatalkan", cls: "bg-red-100 text-red-700 border-red-300" },
  };
  const cfg = map[s] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-300" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Order Card ─────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const { toast } = useToast();
  const isPendingPayment = order.paymentStatus === "pending_payment";

  function openPayment(e: React.MouseEvent) {
    e.stopPropagation();
    const token = order.midtransToken;
    const url = order.midtransRedirectUrl;

    if (!token && !url) {
      toast({ title: "URL pembayaran tidak tersedia atau sudah kadaluarsa.", variant: "destructive" });
      return;
    }

    if (token && typeof window !== "undefined" && (window as any).snap) {
      (window as any).snap.pay(token, {
        onSuccess: () => router.refresh(),
        onPending: () => {},
        onError: () => toast({ title: "Pembayaran gagal", variant: "destructive" }),
        onClose: () => {},
      });
    } else if (url) {
      window.open(url, "_blank");
    } else {
      toast({ title: "Snap belum siap. Coba muat ulang halaman.", variant: "destructive" });
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={() => router.push(`/reseller/orders/${order.id}`)}
    >
      <CardHeader className="p-4 pb-2 flex-row items-center justify-between border-b gap-2">
        <span className="text-sm font-bold">
          #{order.id.substring(0, 8).toUpperCase()}
        </span>
        {order.date?.toDate && (
          <span className="text-xs text-muted-foreground">
            {format(order.date.toDate(), "dd MMM yyyy, HH:mm", { locale: localeId })}
          </span>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Produk (maks 2) */}
        <div className="space-y-1.5">
          {order.products.slice(0, 2).map((p) => (
            <div key={p.productId} className="flex items-center gap-3">
              <Image
                src={p.imageUrl || p.image || "https://placehold.co/40x40.png"}
                alt={p.name}
                width={36}
                height={36}
                className="rounded border shrink-0 object-cover"
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

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PaymentBadge status={order.paymentStatus} />
            <StatusBadge status={order.status} />
          </div>
          <p className="font-bold text-sm">{formatCurrency(order.total)}</p>
        </div>

        {/* Tombol Bayar Sekarang */}
        {isPendingPayment && (
          <Button
            size="sm"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={openPayment}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Bayar Sekarang
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab list ───────────────────────────────────────────────────────

const TABS = [
  { key: "pending_payment", label: "Belum Bayar" },
  { key: "processing",      label: "Diproses" },
  { key: "shipped",         label: "Dikirim" },
  { key: "delivered",       label: "Selesai" },
  { key: "cancelled",       label: "Dibatalkan" },
  { key: "all",             label: "Semua" },
] as const;

type TabKey = typeof TABS[number]["key"];

function filterOrders(orders: Order[], tabKey: TabKey): Order[] {
  switch (tabKey) {
    case "pending_payment":
      return orders.filter((o) => o.paymentStatus === "pending_payment");
    case "processing":
      return orders.filter((o) => o.status === "processing");
    case "shipped":
      return orders.filter((o) => ["shipped", "dikirim", "Dikirim"].includes(o.status));
    case "delivered":
      return orders.filter((o) => ["delivered", "Selesai", "selesai"].includes(o.status));
    case "cancelled":
      return orders.filter((o) =>
        ["cancelled", "failed"].includes(o.paymentStatus) ||
        ["cancelled", "Dibatalkan", "dibatalkan"].includes(o.status)
      );
    default:
      return orders;
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

const EMPTY_MESSAGES: Record<TabKey, string> = {
  pending_payment: "Tidak ada pesanan yang menunggu pembayaran.",
  processing:      "Tidak ada pesanan yang sedang diproses.",
  shipped:         "Tidak ada pesanan yang sedang dikirim.",
  delivered:       "Belum ada pesanan yang selesai.",
  cancelled:       "Tidak ada pesanan yang dibatalkan.",
  all:             "Anda belum memiliki riwayat pesanan.",
};

// ── Main ───────────────────────────────────────────────────────────

function OrderHistoryContent() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("tab") ?? "pending_payment") as TabKey;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    const q = query(
      collection(db, "orders"),
      where("customerId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(
        snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, any>))
      );
      setLoading(false);
    });

    return unsub;
  }, [user, authLoading]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {} as any;
    for (const t of TABS) counts[t.key] = filterOrders(orders, t.key).length;
    return counts;
  }, [orders]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold font-headline">Riwayat Pesanan</h1>
      </div>

      <Tabs defaultValue={defaultTab}>
        {/* Tab headers — scrollable */}
        <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-1 justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="shrink-0 text-xs px-3 py-1.5">
              {t.label}
              {tabCounts[t.key] > 0 && (
                <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {tabCounts[t.key]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const filtered = filterOrders(orders, t.key);
          return (
            <TabsContent key={t.key} value={t.key} className="mt-4 space-y-3">
              {filtered.length === 0 ? (
                <EmptyState message={EMPTY_MESSAGES[t.key]} />
              ) : (
                filtered.map((o) => <OrderCard key={o.id} order={o} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default function OrderHistoryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <OrderHistoryContent />
    </React.Suspense>
  );
}
