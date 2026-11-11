"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  Search,
  PlusCircle,
  Save,
  Zap,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { id as dateFnsId } from "date-fns/locale";
import {
  FlashSale,
  FlashSaleProduct,
  flashSaleFromDoc,
  flashSaleStatus,
  STATUS_LABEL,
  combineDateTime,
  activeOverlaps,
} from "@/lib/flash-sale";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock: number;
  sku: string;
}

function parsePrice(v: string | number): number {
  if (typeof v === "number") return v;
  return parseFloat(String(v || "").replace(/[^0-9]/g, "")) || 0;
}

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(parsePrice(amount));

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function ProductPicker({
  excludeIds,
  onProductSelect,
}: {
  excludeIds: Set<string>;
  onProductSelect: (product: Product) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      setAllProducts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const filtered = useMemo(() => {
    const f = searchTerm.toLowerCase();
    return allProducts.filter((p) => {
      if (excludeIds.has(p.id)) return false;
      const nameMatch = p.name?.toLowerCase().includes(f);
      const skuMatch = String(p.sku || "").toLowerCase().includes(f);
      return nameMatch || skuMatch;
    });
  }, [allProducts, searchTerm, excludeIds]);

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Produk
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pilih Produk untuk Flash Sale</DialogTitle>
          <div className="relative pt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk berdasarkan nama atau SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="w-[100px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Memuat produk...
                  </TableCell>
                </TableRow>
              ) : filtered.length > 0 ? (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Image
                        src={p.image || "https://placehold.co/40x40.png"}
                        alt={p.name}
                        width={40}
                        height={40}
                        className="rounded-md object-cover"
                      />
                      {p.name}
                    </TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleSelect(p)}>
                        Pilih
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-24 text-muted-foreground"
                  >
                    Tidak ada produk.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FlashSaleDetailPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const eventId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form jadwal & aturan
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [cooldownHours, setCooldownHours] = useState("0");
  const [oneItemPerEvent, setOneItemPerEvent] = useState(false);
  const [limitQty, setLimitQty] = useState(false);
  const [maxQty, setMaxQty] = useState("1");

  // Produk event + detail produk
  const [items, setItems] = useState<FlashSaleProduct[]>([]);
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map());
  const [otherEvents, setOtherEvents] = useState<FlashSale[]>([]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [snap, productsSnap, eventsSnap] = await Promise.all([
        getDoc(doc(db, "flash_sales", eventId)),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "flash_sales")),
      ]);

      if (!snap.exists()) {
        setNotFound(true);
        return;
      }

      const map = new Map<string, Product>();
      productsSnap.docs.forEach((d) =>
        map.set(d.id, { id: d.id, ...d.data() } as Product)
      );
      setProductMap(map);

      setOtherEvents(
        eventsSnap.docs
          .filter((d) => d.id !== eventId)
          .map((d) => flashSaleFromDoc(d.id, d.data()))
      );

      const fs = flashSaleFromDoc(snap.id, snap.data());
      setTitle(fs.title);
      setDate(format(fs.startAt, "yyyy-MM-dd"));
      setStartTime(`${pad2(fs.startAt.getHours())}:${pad2(fs.startAt.getMinutes())}`);
      setEndTime(`${pad2(fs.endAt.getHours())}:${pad2(fs.endAt.getMinutes())}`);
      setCooldownHours(String(Math.round(fs.cooldownMinutes / 60)));
      setOneItemPerEvent(fs.oneItemPerEvent);
      setLimitQty(fs.maxQtyPerBuyer != null);
      setMaxQty(fs.maxQtyPerBuyer != null ? String(fs.maxQtyPerBuyer) : "1");
      setItems(fs.products);
    } catch (error) {
      console.error("Error loading flash sale:", error);
      toast({ variant: "destructive", title: "Gagal memuat event" });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const addProduct = (p: Product) => {
    setItems((prev) =>
      prev.some((it) => it.productId === p.id)
        ? prev
        : [...prev, { productId: p.id, flashPrice: parsePrice(p.price) }]
    );
  };

  const removeProduct = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const setFlashPrice = (productId: string, value: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId ? { ...it, flashPrice: value } : it
      )
    );
  };

  const excludeIds = useMemo(
    () => new Set(items.map((it) => it.productId)),
    [items]
  );

  const previewStatus = useMemo(() => {
    const s = combineDateTime(date, startTime);
    const e = combineDateTime(date, endTime);
    if (!s || !e) return null;
    return flashSaleStatus({
      startAt: s,
      endAt: e,
      cooldownMinutes: Math.max(0, Number(cooldownHours) || 0) * 60,
    });
  }, [date, startTime, endTime, cooldownHours]);

  const handleSave = async () => {
    const t = title.trim();
    const startAt = combineDateTime(date, startTime);
    const endAt = combineDateTime(date, endTime);
    if (!t || !startAt || !endAt) {
      toast({ variant: "destructive", title: "Lengkapi judul, tanggal & jam" });
      return;
    }
    if (endAt <= startAt) {
      toast({
        variant: "destructive",
        title: "Jam selesai harus setelah jam mulai",
      });
      return;
    }
    const clash = otherEvents.find((e) => activeOverlaps({ startAt, endAt }, e));
    if (clash) {
      toast({
        variant: "destructive",
        title: "Jadwal bentrok",
        description: `Beririsan dengan "${clash.title}" (${format(
          clash.startAt,
          "d MMM HH:mm",
          { locale: dateFnsId }
        )} - ${format(clash.endAt, "HH:mm")}).`,
      });
      return;
    }
    const invalid = items.find((it) => !it.flashPrice || it.flashPrice <= 0);
    if (invalid) {
      const name = productMap.get(invalid.productId)?.name || "produk";
      toast({
        variant: "destructive",
        title: "Harga flash belum valid",
        description: `Atur harga flash untuk ${name} (harus > 0).`,
      });
      return;
    }
    const parsedMax = Math.max(1, Math.round(Number(maxQty) || 1));
    setSaving(true);
    try {
      await updateDoc(doc(db, "flash_sales", eventId), {
        title: t,
        startAt,
        endAt,
        cooldownMinutes: Math.max(0, Number(cooldownHours) || 0) * 60,
        oneItemPerEvent,
        maxQtyPerBuyer: limitQty ? parsedMax : null,
        products: items.map((it) => ({
          productId: it.productId,
          flashPrice: Math.round(it.flashPrice),
        })),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Flash sale disimpan" });
      router.push("/dashboard/settings/flash-sale");
    } catch (error) {
      console.error("Error saving flash sale:", error);
      toast({ variant: "destructive", title: "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "flash_sales", eventId));
      toast({ title: "Flash sale dihapus" });
      router.push("/dashboard/settings/flash-sale");
    } catch (error) {
      console.error("Error deleting flash sale:", error);
      toast({ variant: "destructive", title: "Gagal menghapus" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/settings/flash-sale")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
          Event flash sale tidak ditemukan.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/settings/flash-sale")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali</span>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">Atur Flash Sale</h1>
            {previewStatus && (
              <Badge variant={previewStatus === "ended" ? "secondary" : "default"}>
                {STATUS_LABEL[previewStatus]}
              </Badge>
            )}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus event ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Event <span className="font-bold">{title}</span> beserta daftar
                produknya akan dihapus permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Jadwal */}
      <Card>
        <CardHeader>
          <CardTitle>Jadwal Event</CardTitle>
          <CardDescription>
            Tentukan kapan flash sale berlangsung. Di luar jam ini, harga kembali
            normal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Judul Event</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cooldown">Cooldown / teaser (jam sebelum mulai)</Label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              step={1}
              value={cooldownHours}
              onChange={(e) => setCooldownHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Jam Mulai</Label>
            <Input
              id="start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Jam Selesai</Label>
            <Input
              id="end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Cooldown &gt; 0: event muncul di beranda reseller dengan harga
            tersensor (hanya angka awal) sejak sekian jam sebelum mulai, lalu
            harga asli tampil otomatis saat event dimulai.
          </p>
        </CardContent>
      </Card>

      {/* Aturan keranjang */}
      <Card>
        <CardHeader>
          <CardTitle>Aturan Keranjang</CardTitle>
          <CardDescription>
            Batasan khusus untuk produk dalam event ini. Produk di luar flash
            sale tidak terpengaruh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="oneItem">Hanya 1 produk per event</Label>
              <p className="text-xs text-muted-foreground">
                Jika aktif, pembeli hanya bisa checkout 1 produk & 1 pcs dari
                seluruh produk flash sale event ini.
              </p>
            </div>
            <Switch
              id="oneItem"
              checked={oneItemPerEvent}
              onCheckedChange={setOneItemPerEvent}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="limitQty">Batasi maksimal pembelian</Label>
              <p className="text-xs text-muted-foreground">
                Batas jumlah pcs per produk flash sale.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {limitQty && (
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={maxQty}
                  onChange={(e) => setMaxQty(e.target.value)}
                  className="w-20"
                  disabled={oneItemPerEvent}
                />
              )}
              <Switch
                id="limitQty"
                checked={limitQty}
                onCheckedChange={setLimitQty}
                disabled={oneItemPerEvent}
              />
            </div>
          </div>
          {oneItemPerEvent && (
            <p className="text-xs text-muted-foreground">
              Saat &quot;Hanya 1 produk per event&quot; aktif, batas sudah 1 pcs
              sehingga pengaturan maksimal pembelian diabaikan.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Produk */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Produk Flash Sale</CardTitle>
            <CardDescription>
              Atur harga flash per produk. Harga ini berlaku hanya selama event.
            </CardDescription>
          </div>
          <ProductPicker excludeIds={excludeIds} onProductSelect={addProduct} />
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((it) => {
                const p = productMap.get(it.productId);
                const normal = p ? parsePrice(p.price) : 0;
                const discountPct =
                  normal > 0 && it.flashPrice > 0
                    ? Math.round((1 - it.flashPrice / normal) * 100)
                    : 0;
                return (
                  <div
                    key={it.productId}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <Image
                        src={p?.image || "https://placehold.co/56x56.png"}
                        alt={p?.name || "Produk"}
                        width={56}
                        height={56}
                        className="rounded-md object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {p?.name || "(Produk tidak ditemukan)"}
                        </p>
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(normal)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Harga Flash (Rp)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={it.flashPrice || ""}
                          onChange={(e) =>
                            setFlashPrice(
                              it.productId,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-36"
                        />
                      </div>
                      {discountPct > 0 && (
                        <Badge variant="secondary" className="shrink-0">
                          -{discountPct}%
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProduct(it.productId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Zap className="mx-auto h-10 w-10" />
              <p className="mt-2">
                Belum ada produk. Klik &quot;Tambah Produk&quot; untuk memasukkan
                produk ke event ini.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/settings/flash-sale")}
        >
          Batal
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Simpan
        </Button>
      </div>
    </div>
  );
}
