"use client";

// Halaman "Pesanan POS" (riwayat transaksi kasir). Mirip halaman Pesanan
// Marketplace, tetapi sesuai dokumen pesanan POS (source == 'pos'):
// kasir, metode bayar (Tunai/Transfer/Midtrans), uang dibayar & kembalian.
// Data realtime (onSnapshot). Transaksi kasir TIDAK punya pengiriman/biteship.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Calendar as CalendarIcon, Loader2, Package, Printer, Store, User,
  Edit, Plus, Minus, Trash2, History,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import Image from "next/image";
import {
  collection, onSnapshot, orderBy, query, getDocs, doc, runTransaction,
  increment, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF { autoTable: (options: any) => jsPDF; }
}

interface PosOrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  image?: string;
}

interface EditChange { productId: string; name: string; quantity: number; }
interface EditEntry {
  editedAt?: any;
  editedBy?: string;
  added: EditChange[];
  removed: EditChange[];
}

interface PosOrder {
  id: string;
  date: any;
  kasir: string;
  customer?: string;
  products: PosOrderProduct[];
  subtotal: number;
  total: number;
  totalDiscount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  amountPaid?: number;
  changeAmount?: number;
  editHistory: EditEntry[];
}

// Produk katalog (untuk menambah produk saat edit pesanan).
interface ProductLite {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  sku?: string | number;
}

// Baris produk yang sedang diedit.
interface EditItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sku?: string | number;
}

const formatCurrency = (amount: number | string | undefined | null) => {
  const num =
    typeof amount === "string"
      ? parseFloat(amount.replace(/[^0-9.-]/g, ""))
      : typeof amount === "number"
      ? amount
      : 0;
  if (!Number.isFinite(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};

const toNum = (v: any): number => {
  const n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.-]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Metode pembayaran POS → label Indonesia.
const paymentLabel = (m: string) =>
  ({
    cash: "Tunai",
    bank_transfer: "Transfer Bank",
    transfer: "Transfer Bank",
    midtrans: "Midtrans (QRIS)",
    qris: "QRIS",
  } as Record<string, string>)[(m || "").toLowerCase()] ?? (m || "-");

// Status pesanan POS → {label, kelas warna badge}.
const statusInfo = (s: string): { label: string; cls: string; bucket: string } => {
  const k = (s || "").toLowerCase();
  if (k === "success" || k === "delivered" || k === "selesai")
    return { label: "Berhasil", cls: "text-green-600 border-green-600", bucket: "berhasil" };
  if (k === "pending" || k === "processing" || k === "menunggu")
    return { label: "Menunggu Bayar", cls: "text-yellow-600 border-yellow-600", bucket: "menunggu" };
  if (k === "cancelled" || k === "canceled" || k === "dibatalkan")
    return { label: "Dibatalkan", cls: "text-red-600 border-red-600", bucket: "dibatalkan" };
  return { label: s || "-", cls: "text-gray-600 border-gray-600", bucket: "lain" };
};

function generatePosFaktur(order: PosOrder) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Faktur Penjualan POS", 14, 20);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`No. Pesanan: ${order.id}`, 14, 30);
  if (order.date?.toDate) {
    pdf.text(
      `Tanggal: ${format(order.date.toDate(), "dd MMM yyyy, HH:mm", { locale: dateFnsLocaleId })}`,
      14,
      35,
    );
  }
  pdf.text(`Kasir: ${order.kasir || "-"}`, 14, 40);
  pdf.text(`Metode: ${paymentLabel(order.paymentMethod)} | Status: ${statusInfo(order.status).label}`, 14, 45);
  if (order.customer) pdf.text(`Pelanggan: ${order.customer}`, 14, 50);

  const startY = order.customer ? 56 : 51;
  pdf.autoTable({
    head: [["Produk", "Jumlah", "Harga", "Subtotal"]],
    body: order.products.map((p) => [
      p.name,
      p.quantity,
      formatCurrency(p.price),
      formatCurrency(p.price * p.quantity),
    ]),
    startY,
    theme: "grid",
  });

  const fY = (pdf as any).lastAutoTable.finalY + 8;
  const right = (label: string, value: string, y: number, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.text(label, 140, y);
    pdf.text(value, 200, y, { align: "right" });
  };
  right("Subtotal:", formatCurrency(order.subtotal || order.total + order.totalDiscount), fY);
  right("Diskon:", `- ${formatCurrency(order.totalDiscount)}`, fY + 6);
  pdf.setFontSize(12);
  right("TOTAL:", formatCurrency(order.total), fY + 13, true);
  pdf.setFontSize(10);
  if ((order.paymentMethod || "").toLowerCase() === "cash" && order.amountPaid != null) {
    right("Uang Dibayar:", formatCurrency(order.amountPaid), fY + 21);
    right("Kembalian:", formatCurrency(order.changeAmount ?? 0), fY + 27);
  }
  pdf.output("dataurlnewwindow");
}

export default function PosOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Default: HANYA hari ini (transaksi kasir biasanya dicek harian).
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [kasirFilter, setKasirFilter] = useState<string>("all");
  const [detail, setDetail] = useState<PosOrder | null>(null);
  // Edit pesanan
  const { user } = useAuth();
  const [editOrder, setEditOrder] = useState<PosOrder | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [catalog, setCatalog] = useState<ProductLite[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  // Daftar kasir unik dari SEMUA pesanan POS (stabil, tak ikut filter tanggal).
  const kasirOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      const k = (o.kasir || "").trim();
      if (k) set.add(k);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: PosOrder[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if ((data.source ?? "") !== "pos") return; // hanya transaksi kasir POS
          rows.push({
            id: d.id,
            date: data.date,
            kasir: data.kasir ?? "-",
            customer: data.customer ?? undefined,
            products: Array.isArray(data.products)
              ? data.products.map((p: any) => ({
                  productId: (p.productId ?? "").toString(),
                  name: (p.name ?? "").toString(),
                  quantity: toNum(p.quantity),
                  price: toNum(p.price),
                  imageUrl: (p.imageUrl ?? p.image)?.toString(),
                }))
              : [],
            subtotal: toNum(data.subtotal),
            total: toNum(data.total),
            totalDiscount: toNum(data.totalDiscount),
            paymentMethod: data.paymentMethod ?? "-",
            paymentStatus: data.paymentStatus ?? "-",
            status: data.status ?? "-",
            amountPaid: data.amountPaid != null ? toNum(data.amountPaid) : undefined,
            changeAmount: data.changeAmount != null ? toNum(data.changeAmount) : undefined,
            editHistory: Array.isArray(data.editHistory)
              ? data.editHistory.map((h: any) => ({
                  editedAt: h.editedAt,
                  editedBy: (h.editedBy ?? "").toString(),
                  added: Array.isArray(h.added)
                    ? h.added.map((a: any) => ({
                        productId: (a.productId ?? "").toString(),
                        name: (a.name ?? "").toString(),
                        quantity: toNum(a.quantity),
                      }))
                    : [],
                  removed: Array.isArray(h.removed)
                    ? h.removed.map((a: any) => ({
                        productId: (a.productId ?? "").toString(),
                        name: (a.name ?? "").toString(),
                        quantity: toNum(a.quantity),
                      }))
                    : [],
                }))
              : [],
          });
        });
        setOrders(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Gagal memuat pesanan POS:", err);
        toast({ variant: "destructive", title: "Gagal memuat pesanan POS" });
        setLoading(false);
      },
    );
    return unsub;
  }, [toast]);

  const filtered = useMemo(() => {
    let list = orders;
    if (dateRange?.from || dateRange?.to) {
      list = list.filter((o) => {
        if (!o.date?.toDate) return true;
        const d = o.date.toDate();
        if (dateRange.from && d < startOfDay(dateRange.from)) return false;
        if (dateRange.to && d > endOfDay(dateRange.to)) return false;
        return true;
      });
    }
    if (kasirFilter !== "all") {
      list = list.filter((o) => (o.kasir || "").trim() === kasirFilter);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(t) ||
          (o.kasir || "").toLowerCase().includes(t) ||
          (o.customer || "").toLowerCase().includes(t) ||
          o.products.some((p) => p.name.toLowerCase().includes(t)),
      );
    }
    return list;
  }, [orders, dateRange, searchTerm, kasirFilter]);

  const buckets = useMemo(() => {
    const by = (b: string) => filtered.filter((o) => statusInfo(o.status).bucket === b);
    return {
      semua: filtered,
      berhasil: by("berhasil"),
      menunggu: by("menunggu"),
      dibatalkan: by("dibatalkan"),
    };
  }, [filtered]);

  // Muat katalog produk sekali (untuk menambah produk saat edit).
  const ensureCatalog = useCallback(async () => {
    if (catalogLoaded || loadingCatalog) return;
    setLoadingCatalog(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      setCatalog(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: (data.name ?? "").toString(),
            price: toNum(data.price),
            stock: toNum(data.stock),
            image: (data.image ?? data.imageUrl)?.toString(),
            sku: data.sku,
          } as ProductLite;
        }),
      );
      setCatalogLoaded(true);
    } catch {
      toast({ variant: "destructive", title: "Gagal memuat katalog produk" });
    } finally {
      setLoadingCatalog(false);
    }
  }, [catalogLoaded, loadingCatalog, toast]);

  const openEdit = (order: PosOrder) => {
    setDetail(null);
    setEditOrder(order);
    setEditItems(
      order.products.map((p) => ({
        productId: p.productId,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        imageUrl: p.imageUrl || p.image,
      })),
    );
    setAddSearch("");
    ensureCatalog();
  };

  const editSubtotal = useMemo(
    () => editItems.reduce((s, it) => s + it.price * it.quantity, 0),
    [editItems],
  );

  const changeQty = (productId: string, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((it) =>
          it.productId === productId
            ? { ...it, quantity: Math.max(0, it.quantity + delta) }
            : it,
        )
        .filter((it) => it.quantity > 0),
    );
  };

  const addProductToEdit = (p: ProductLite) => {
    setEditItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === p.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, price: p.price, quantity: 1, imageUrl: p.image, sku: p.sku },
      ];
    });
  };

  const saveEdit = async () => {
    if (!editOrder || savingEdit) return;
    if (editItems.length === 0) {
      toast({ variant: "destructive", title: "Pesanan tidak boleh kosong." });
      return;
    }
    setSavingEdit(true);
    try {
      const orderRef = doc(db, "orders", editOrder.id);
      const editedBy = user?.displayName || user?.email || "Admin";
      const curItems = editItems;
      await runTransaction(db, async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Pesanan tidak ditemukan.");
        const data = orderSnap.data() as any;
        const oldProducts: any[] = Array.isArray(data.products) ? data.products : [];

        const oldQ = new Map<string, number>();
        oldProducts.forEach((p) => oldQ.set((p.productId ?? "").toString(), toNum(p.quantity)));
        const newQ = new Map<string, number>();
        curItems.forEach((it) => newQ.set(it.productId, it.quantity));
        const ids = new Set<string>([...oldQ.keys(), ...newQ.keys()]);
        const deltas = new Map<string, number>();
        ids.forEach((id) => {
          const d = (newQ.get(id) ?? 0) - (oldQ.get(id) ?? 0);
          if (d !== 0) deltas.set(id, d);
        });

        const nameOf = (id: string) =>
          curItems.find((i) => i.productId === id)?.name ??
          oldProducts.find((p) => (p.productId ?? "").toString() === id)?.name ??
          id;

        // Semua READ sebelum WRITE (aturan transaksi Firestore).
        const prodData = new Map<string, any>();
        for (const [id, d] of deltas) {
          if (d > 0 && !id.startsWith("temp_")) {
            const ps = await tx.get(doc(db, "products", id));
            if (!ps.exists()) throw new Error(`Produk "${nameOf(id)}" tidak ditemukan.`);
            prodData.set(id, ps.data());
          }
        }
        for (const [id, d] of deltas) {
          if (d > 0 && !id.startsWith("temp_")) {
            const cur = toNum(prodData.get(id)?.stock);
            if (cur < d) throw new Error(`Stok tidak cukup: ${nameOf(id)} (sisa ${cur}).`);
          }
        }

        const oldById = new Map<string, any>();
        oldProducts.forEach((p) => oldById.set((p.productId ?? "").toString(), p));
        const newProducts = curItems.map((it) => {
          const old = oldById.get(it.productId);
          const obj: any = {
            productId: it.productId,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            imageUrl: it.imageUrl || "",
          };
          if (it.sku != null) obj.sku = it.sku;
          if (old && old.purchasePrice != null) obj.purchasePrice = old.purchasePrice;
          return obj;
        });
        const subtotal = curItems.reduce((s, it) => s + it.price * it.quantity, 0);

        const added: EditChange[] = [];
        const removed: EditChange[] = [];
        deltas.forEach((d, id) => {
          const e = { productId: id, name: nameOf(id), quantity: Math.abs(d) };
          if (d > 0) added.push(e);
          else removed.push(e);
        });
        const rawHist = Array.isArray(data.editHistory) ? data.editHistory : [];
        const history = [...rawHist];
        if (added.length || removed.length) {
          history.push({ editedAt: Timestamp.now(), editedBy, added, removed });
        }

        for (const [id, d] of deltas) {
          if (!id.startsWith("temp_")) {
            tx.update(doc(db, "products", id), { stock: increment(-d) });
          }
        }
        tx.update(orderRef, {
          products: newProducts,
          productIds: curItems.map((i) => i.productId),
          subtotal,
          total: subtotal,
          updated_at: serverTimestamp(),
          ...(added.length || removed.length ? { editHistory: history } : {}),
        });
      });

      toast({ title: "Pesanan berhasil diperbarui." });
      setEditOrder(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: e?.message ?? String(e) });
    } finally {
      setSavingEdit(false);
    }
  };

  // Hasil pencarian produk utk ditambahkan (maks 20) — produk yg belum ada
  // di keranjang edit tampil dulu.
  const addResults = useMemo(() => {
    const t = addSearch.trim().toLowerCase();
    if (!t) return [];
    const inCart = new Set(editItems.map((i) => i.productId));
    return catalog
      .filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          (p.sku != null && String(p.sku).toLowerCase().includes(t)),
      )
      .sort((a, b) => Number(inCart.has(a.id)) - Number(inCart.has(b.id)))
      .slice(0, 20);
  }, [addSearch, catalog, editItems]);

  const renderList = (list: PosOrder[]) => {
    if (loading) {
      return (
        <div className="text-center p-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="text-center p-10 border rounded-lg">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Tidak ada transaksi POS pada rentang ini.</p>
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((order) => {
          const st = statusInfo(order.status);
          return (
            <Card
              key={order.id}
              className="overflow-hidden cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setDetail(order)}
            >
              <CardHeader className="p-4 bg-card flex-row items-center justify-between border-b space-y-0">
                <div className="text-sm text-muted-foreground">
                  No. <span className="font-medium text-foreground">{order.id.substring(0, 10)}…</span>
                </div>
                {order.date?.toDate && (
                  <p className="text-xs text-muted-foreground">
                    {format(order.date.toDate(), "dd/MM/yy HH:mm")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <User className="h-3.5 w-3.5" /> {order.kasir}
                  {order.customer ? ` · ${order.customer}` : ""}
                </div>
                {order.products.slice(0, 2).map((p, i) => (
                  <div key={`${order.id}-${p.productId}-${i}`} className="flex items-center gap-3 mb-2">
                    <Image
                      src={p.imageUrl || p.image || "https://placehold.co/64x64.png"}
                      alt={p.name}
                      width={36}
                      height={36}
                      className="rounded-md border"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                      <p className="text-xs text-muted-foreground">x{p.quantity}</p>
                    </div>
                  </div>
                ))}
                {order.products.length > 2 && (
                  <p className="text-xs text-muted-foreground pl-1 mt-1">
                    + {order.products.length - 2} produk lainnya
                  </p>
                )}
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 bg-muted/30 justify-between gap-2">
                <Badge variant="secondary">{paymentLabel(order.paymentMethod)}</Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); openEdit(order); }}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); generatePosFaktur(order); }}
                  >
                    <Printer className="mr-2 h-4 w-4" /> Faktur
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center gap-3 mb-6">
        <Store className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline">Pesanan POS</h1>
          <p className="text-sm text-muted-foreground">Riwayat transaksi kasir (POS).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
          <CardDescription>Semua penjualan dari aplikasi kasir POS.</CardDescription>
          <div className="flex flex-col gap-2 pt-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari No. Pesanan / Kasir / Pelanggan / Produk..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={kasirFilter} onValueChange={setKasirFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Semua Kasir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kasir</SelectItem>
                {kasirOptions.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal sm:w-[280px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
                      : format(dateRange.from, "dd MMM yyyy")
                    : "Pilih rentang tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="semua">
            <TabsList className="h-auto p-1.5 w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <TabsTrigger value="semua">Semua <Badge className="ml-2">{buckets.semua.length}</Badge></TabsTrigger>
              <TabsTrigger value="berhasil">Berhasil <Badge className="ml-2">{buckets.berhasil.length}</Badge></TabsTrigger>
              <TabsTrigger value="menunggu">Menunggu <Badge className="ml-2">{buckets.menunggu.length}</Badge></TabsTrigger>
              <TabsTrigger value="dibatalkan">Dibatalkan <Badge className="ml-2">{buckets.dibatalkan.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="semua" className="mt-4">{renderList(buckets.semua)}</TabsContent>
            <TabsContent value="berhasil" className="mt-4">{renderList(buckets.berhasil)}</TabsContent>
            <TabsContent value="menunggu" className="mt-4">{renderList(buckets.menunggu)}</TabsContent>
            <TabsContent value="dibatalkan" className="mt-4">{renderList(buckets.dibatalkan)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail transaksi POS */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Detail Transaksi #{detail.id.substring(0, 10)}…</DialogTitle>
                <DialogDescription>
                  {detail.date?.toDate
                    ? format(detail.date.toDate(), "dd MMMM yyyy, HH:mm", { locale: dateFnsLocaleId })
                    : ""}
                  {" · Kasir: "}{detail.kasir}
                  {detail.customer ? ` · ${detail.customer}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className={statusInfo(detail.status).cls}>
                    {statusInfo(detail.status).label}
                  </Badge>
                  <Badge variant="secondary">{paymentLabel(detail.paymentMethod)}</Badge>
                </div>
                <div className="relative w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.products.map((p, i) => (
                        <TableRow key={`${p.productId}-${i}`}>
                          <TableCell className="flex items-center gap-2">
                            <Image
                              src={p.imageUrl || p.image || "https://placehold.co/64x64.png"}
                              alt={p.name}
                              width={32}
                              height={32}
                              className="rounded"
                            />
                            {p.name}
                          </TableCell>
                          <TableCell>{p.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.price * p.quantity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-1.5 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(detail.subtotal || detail.total + detail.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="text-red-600">- {formatCurrency(detail.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(detail.total)}</span>
                  </div>
                  {(detail.paymentMethod || "").toLowerCase() === "cash" && detail.amountPaid != null && (
                    <>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uang Dibayar</span>
                        <span>{formatCurrency(detail.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kembalian</span>
                        <span>{formatCurrency(detail.changeAmount ?? 0)}</span>
                      </div>
                    </>
                  )}
                </div>
                {detail.editHistory.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <History className="h-4 w-4 text-muted-foreground" /> Riwayat Perubahan
                    </div>
                    <div className="space-y-2">
                      {[...detail.editHistory].reverse().map((h, i) => (
                        <div key={i} className="rounded-md border bg-muted/30 p-2.5 text-xs">
                          <div className="mb-1 flex items-center gap-1 text-muted-foreground">
                            {h.editedAt?.toDate
                              ? format(h.editedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: dateFnsLocaleId })
                              : "-"}
                            {h.editedBy ? ` · ${h.editedBy}` : ""}
                          </div>
                          {h.added.map((a, j) => (
                            <div key={`a${j}`} className="text-green-700">+ {a.name} (x{a.quantity})</div>
                          ))}
                          {h.removed.map((r, j) => (
                            <div key={`r${j}`} className="text-red-700">− {r.name} (x{r.quantity})</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => openEdit(detail)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Pesanan
                </Button>
                <Button variant="secondary" onClick={() => generatePosFaktur(detail)}>
                  <Printer className="mr-2 h-4 w-4" /> Cetak Faktur
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog EDIT pesanan POS: tambah/hapus produk → stok otomatis disesuaikan,
          perubahan dicatat ke Riwayat Perubahan. */}
      <Dialog open={!!editOrder} onOpenChange={(o) => { if (!o) setEditOrder(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {editOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Pesanan #{editOrder.id.substring(0, 10)}…</DialogTitle>
                <DialogDescription>
                  Menambah produk mengurangi stok; menghapus/mengurangi mengembalikan stok. Setiap perubahan dicatat di Riwayat.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {editItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Belum ada produk. Tambahkan di bawah.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editItems.map((it) => (
                      <div key={it.productId} className="flex items-center gap-3 rounded-md border p-2">
                        <Image
                          src={it.imageUrl || "https://placehold.co/64x64.png"}
                          alt={it.name}
                          width={40}
                          height={40}
                          className="rounded border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium line-clamp-1">{it.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(it.price)}</p>
                        </div>
                        <div className="flex items-center rounded-md border">
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeQty(it.productId, -1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeQty(it.productId, 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => changeQty(it.productId, -it.quantity)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Plus className="h-4 w-4" /> Tambah Produk
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari produk / SKU..."
                      className="pl-8"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  {loadingCatalog && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat katalog…
                    </p>
                  )}
                  {addSearch.trim() && (
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                      {addResults.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-muted-foreground">Tidak ada produk cocok.</p>
                      ) : (
                        addResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addProductToEdit(p)}
                            className="flex w-full items-center gap-3 rounded-md border p-2 text-left hover:bg-muted/50"
                          >
                            <Image src={p.image || "https://placehold.co/64x64.png"} alt={p.name} width={32} height={32} className="rounded border" />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(p.price)} · Stok {p.stock}</p>
                            </div>
                            <Plus className="h-4 w-4 text-primary" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between border-t pt-3 font-bold">
                  <span>Total Baru</span>
                  <span className="text-green-600">{formatCurrency(editSubtotal)}</span>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEditOrder(null)} disabled={savingEdit}>Batal</Button>
                <Button onClick={saveEdit} disabled={savingEdit || editItems.length === 0}>
                  {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
