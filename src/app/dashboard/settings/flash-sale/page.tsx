"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  PlusCircle,
  Loader2,
  ArrowLeft,
  CalendarIcon,
  Clock,
  Package,
  ChevronRight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as dateFnsId } from "date-fns/locale";
import {
  FlashSale,
  flashSaleFromDoc,
  flashSaleStatus,
  STATUS_LABEL,
  STATUS_ORDER,
  FlashSaleStatus,
  combineDateTime,
  activeOverlaps,
} from "@/lib/flash-sale";

const STATUS_BADGE: Record<
  FlashSaleStatus,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  teaser: "default",
  upcoming: "outline",
  ended: "secondary",
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

// Nilai awal form "Tambah": hari ini, jam 20:00 - 22:00.
function defaultForm() {
  const now = new Date();
  return {
    title: "",
    date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
      now.getDate()
    )}`,
    startTime: "20:00",
    endTime: "22:00",
    cooldownHours: "0",
  };
}

export default function FlashSaleListPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [events, setEvents] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [filterDate, setFilterDate] = useState("");
  // Penanda waktu agar status (aktif/berakhir) ikut terbarui tanpa refresh.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "flash_sales"), orderBy("startAt", "desc"))
      );
      setEvents(snap.docs.map((d) => flashSaleFromDoc(d.id, d.data())));
    } catch (error) {
      console.error("Error fetching flash sales:", error);
      toast({ variant: "destructive", title: "Gagal memuat flash sale" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Urutkan: Berlangsung → Segera → Akan Datang → Berakhir, lalu per waktu mulai.
  const sortedEvents = useMemo(() => {
    const list = filterDate
      ? events.filter((e) => format(e.startAt, "yyyy-MM-dd") === filterDate)
      : events;
    return [...list].sort((a, b) => {
      const sa = STATUS_ORDER[flashSaleStatus(a, now)];
      const sb = STATUS_ORDER[flashSaleStatus(b, now)];
      if (sa !== sb) return sa - sb;
      // Aktif/akan datang: paling dekat dulu. Berakhir: paling baru dulu.
      return a.startAt.getTime() - b.startAt.getTime();
    });
  }, [events, filterDate, now]);

  const handleCreate = async () => {
    const title = form.title.trim();
    const startAt = combineDateTime(form.date, form.startTime);
    const endAt = combineDateTime(form.date, form.endTime);
    if (!title || !startAt || !endAt) {
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
    // Hanya 1 event boleh aktif pada rentang waktu yang sama.
    const clash = events.find((e) => activeOverlaps({ startAt, endAt }, e));
    if (clash) {
      toast({
        variant: "destructive",
        title: "Jadwal bentrok",
        description: `Beririsan dengan "${clash.title}" (${format(
          clash.startAt,
          "d MMM HH:mm",
          { locale: dateFnsId }
        )} - ${format(clash.endAt, "HH:mm")}). Hanya 1 event boleh aktif pada waktu yang sama.`,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const ref = await addDoc(collection(db, "flash_sales"), {
        title,
        startAt,
        endAt,
        cooldownMinutes: Math.max(0, Number(form.cooldownHours) || 0) * 60,
        products: [],
        maxQtyPerBuyer: null,
        oneItemPerEvent: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Flash sale dibuat" });
      setIsDialogOpen(false);
      setForm(defaultForm());
      router.push(`/dashboard/settings/flash-sale/${ref.id}`);
    } catch (error) {
      console.error("Error creating flash sale:", error);
      toast({ variant: "destructive", title: "Gagal membuat flash sale" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/settings")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali ke Pengaturan</span>
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Flash Sale</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Event Flash Sale</CardTitle>
            <CardDescription>
              Buat event berjadwal (tanggal + jam). Hanya 1 event boleh aktif
              pada waktu yang bersamaan.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Flash Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Event Flash Sale</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="fs-title">Judul Event</Label>
                  <Input
                    id="fs-title"
                    placeholder="Contoh: Flash Sale Gajian"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fs-date">Tanggal</Label>
                  <Input
                    id="fs-date"
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fs-start">Jam Mulai</Label>
                    <Input
                      id="fs-start"
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startTime: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fs-end">Jam Selesai</Label>
                    <Input
                      id="fs-end"
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endTime: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fs-cooldown">
                    Cooldown / teaser (jam sebelum mulai)
                  </Label>
                  <Input
                    id="fs-cooldown"
                    type="number"
                    min={0}
                    step={1}
                    value={form.cooldownHours}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cooldownHours: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = tanpa teaser. Jika diisi, event muncul di beranda dengan
                    harga tersensor sejak sekian jam sebelum mulai.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setForm(defaultForm());
                  }}
                >
                  Batal
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Buat & Atur Produk
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter tanggal */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto"
            />
            {filterDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterDate("")}
              >
                <X className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center p-8 text-muted-foreground">
              Memuat event flash sale...
            </div>
          ) : sortedEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedEvents.map((ev) => {
                const status = flashSaleStatus(ev, now);
                return (
                  <button
                    key={ev.id}
                    onClick={() =>
                      router.push(`/dashboard/settings/flash-sale/${ev.id}`)
                    }
                    className="group text-left"
                  >
                    <Card
                      className={`h-full cursor-pointer transition-colors hover:bg-accent ${
                        status === "active"
                          ? "border-primary/60 bg-primary/5"
                          : status === "teaser"
                          ? "border-amber-400/60 bg-amber-50 dark:bg-amber-950/20"
                          : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="rounded-md bg-primary/15 p-2 text-primary">
                              <Zap className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-base">
                              {ev.title}
                            </CardTitle>
                          </div>
                          <Badge variant={STATUS_BADGE[status]}>
                            {STATUS_LABEL[status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {format(ev.startAt, "EEEE, d MMM yyyy", {
                              locale: dateFnsId,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(ev.startAt, "HH:mm")} -{" "}
                            {format(ev.endAt, "HH:mm")} WIB
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>{ev.products.length} produk</span>
                          </div>
                          <span className="flex items-center text-sm font-medium text-primary group-hover:underline">
                            Atur <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2">
                {filterDate
                  ? "Tidak ada event pada tanggal ini."
                  : "Belum ada event flash sale."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
