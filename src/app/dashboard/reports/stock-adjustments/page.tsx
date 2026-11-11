"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  Package,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ArrowLeft,
  User,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, subDays } from "date-fns";
import { id as dateFnsLocaleId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import Link from "next/link";

// ─── Tipe & util ────────────────────────────────────────────────────
interface RawAdjustment {
  id: string;
  date: Date;
  productName: string;
  sku: string;
  type: "in" | "out";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  adjustedBy: string;
}

interface DailyAdjustment {
  key: string; // yyyy-MM-dd
  date: Date;
  count: number;
  totalIn: number; // jumlah stok masuk hari itu
  totalOut: number; // jumlah stok keluar hari itu
  items: RawAdjustment[];
}

function parseNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
  return 0;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

type QuickFilter = "today" | "yesterday" | "last7days" | "thisMonth" | "custom";

export default function StockAdjustmentsReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("thisMonth");
  const [rawAdjustments, setRawAdjustments] = useState<RawAdjustment[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyAdjustment | null>(null);

  const applyQuickFilter = (filter: QuickFilter) => {
    const now = new Date();
    switch (filter) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "yesterday": {
        const y = subDays(now, 1);
        setDateRange({ from: startOfDay(y), to: endOfDay(y) });
        break;
      }
      case "last7days":
        setDateRange({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfDay(now) });
        break;
      default:
        break;
    }
    setActiveFilter(filter);
  };

  const fetchData = useCallback(async () => {
    const { from, to } = dateRange || {};
    if (!from || !to) return;
    setLoading(true);
    try {
      // Penyesuaian stok manual dicatat ke koleksi `stock_adjustments` oleh
      // halaman Manajemen Stok. Rentang cukup pada `createdAt` (single-field
      // range → tak butuh indeks gabungan).
      const adjQuery = query(
        collection(db, "stock_adjustments"),
        where("createdAt", ">=", from),
        where("createdAt", "<=", to)
      );

      const snapshot = await getDocs(adjQuery);

      // Catatan lama (versi awal aplikasi Flutter) tak menyimpan productName/sku
      // — hanya productId. Ambil nama/SKU dari koleksi `products` agar daftar
      // tetap menampilkan nama produk (bukan "Produk").
      const docsData = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
      const missingIds = Array.from(
        new Set(
          docsData
            .filter((x) => !(x.data.productName ?? "").toString().trim() && x.data.productId)
            .map((x) => x.data.productId.toString())
        )
      );
      const productInfo = new Map<string, { name: string; sku: string }>();
      await Promise.all(
        missingIds.map(async (pid) => {
          try {
            const pd = await getDoc(doc(db, "products", pid));
            if (pd.exists()) {
              const pdata = pd.data();
              productInfo.set(pid, {
                name: (pdata.name ?? "").toString(),
                sku: (pdata.sku ?? "").toString(),
              });
            }
          } catch {
            /* abaikan produk yang gagal dibaca */
          }
        })
      );

      const rows: RawAdjustment[] = [];
      docsData.forEach(({ id, data }) => {
        const d = toDate(data.createdAt);
        if (!d) return;
        const pid = (data.productId ?? "").toString();
        const fallback = productInfo.get(pid);
        const name =
          (data.productName ?? "").toString().trim() || fallback?.name || "Produk";
        const sku = (data.sku ?? "").toString().trim() || fallback?.sku || "";
        rows.push({
          id,
          date: d,
          productName: name,
          sku,
          type: data.type === "out" ? "out" : "in",
          quantity: parseNum(data.quantity),
          previousStock: parseNum(data.previousStock),
          newStock: parseNum(data.newStock),
          reason: (data.reason ?? "").toString(),
          adjustedBy: (data.adjustedBy ?? "").toString(),
        });
      });

      setRawAdjustments(rows);
    } catch (error) {
      console.error("Error fetching stock-adjustments report:", error);
      setRawAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { daily, totalCount, totalIn, totalOut } = useMemo(() => {
    const map = new Map<string, DailyAdjustment>();
    let count = 0;
    let tin = 0;
    let tout = 0;

    rawAdjustments.forEach((a) => {
      count += 1;
      if (a.type === "in") tin += a.quantity;
      else tout += a.quantity;

      const key = format(a.date, "yyyy-MM-dd");
      const entry =
        map.get(key) ||
        ({
          key,
          date: startOfDay(a.date),
          count: 0,
          totalIn: 0,
          totalOut: 0,
          items: [],
        } as DailyAdjustment);
      entry.count += 1;
      if (a.type === "in") entry.totalIn += a.quantity;
      else entry.totalOut += a.quantity;
      entry.items.push(a);
      map.set(key, entry);
    });

    const list = Array.from(map.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    // Urutkan rincian tiap hari dari yang terbaru.
    list.forEach((d) => d.items.sort((x, y) => y.date.getTime() - x.date.getTime()));

    return { daily: list, totalCount: count, totalIn: tin, totalOut: tout };
  }, [rawAdjustments]);

  const quickFilters: { value: QuickFilter; label: string }[] = [
    { value: "today", label: "Hari Ini" },
    { value: "yesterday", label: "Kemarin" },
    { value: "last7days", label: "7 Hari Terakhir" },
    { value: "thisMonth", label: "Bulan Ini" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Laporan Penyesuaian Stok</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat penyesuaian stok manual (kasir/admin) beserta alasannya, per hari.
          </p>
        </div>
      </div>

      {/* Filter periode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <Button
                key={f.value}
                variant={activeFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilter === "custom" ? "default" : "outline"}
                className="w-full justify-start text-left font-normal sm:w-auto"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM yyyy", { locale: dateFnsLocaleId })} -{" "}
                      {format(dateRange.to, "dd MMM yyyy", { locale: dateFnsLocaleId })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy", { locale: dateFnsLocaleId })
                  )
                ) : (
                  <span>Pilih tanggal</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setActiveFilter("custom");
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Ringkasan total */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Penyesuaian"
          value={loading ? null : `${formatNumber(totalCount)} transaksi`}
          icon={Package}
          accent="text-violet-600"
        />
        <SummaryCard
          title="Total Stok Masuk"
          value={loading ? null : `+${formatNumber(totalIn)}`}
          icon={ArrowUp}
          accent="text-green-600"
        />
        <SummaryCard
          title="Total Stok Keluar"
          value={loading ? null : `-${formatNumber(totalOut)}`}
          icon={ArrowDown}
          accent="text-red-600"
        />
      </div>

      {/* Daftar harian */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rincian Harian</CardTitle>
          <CardDescription>Klik satu hari untuk melihat rincian penyesuaian & alasannya.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : daily.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Tidak ada penyesuaian stok pada periode ini.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {daily.map((day) => (
                <button
                  key={day.key}
                  onClick={() => setSelectedDay(day)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {format(day.date, "EEEE, dd MMM yyyy", { locale: dateFnsLocaleId })}
                      </p>
                      <p className="text-sm text-muted-foreground">{day.count} penyesuaian</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <span className="mr-2 text-sm font-semibold text-green-600">
                        +{formatNumber(day.totalIn)}
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        -{formatNumber(day.totalOut)}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog detail per hari */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(selectedDay.date, "EEEE, dd MMMM yyyy", { locale: dateFnsLocaleId })}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-950/20">
                    <p className="text-xs text-muted-foreground">Penyesuaian</p>
                    <p className="mt-1 text-lg font-bold text-violet-600">{selectedDay.count}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                    <p className="text-xs text-muted-foreground">Stok Masuk</p>
                    <p className="mt-1 text-lg font-bold text-green-600">
                      +{formatNumber(selectedDay.totalIn)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
                    <p className="text-xs text-muted-foreground">Stok Keluar</p>
                    <p className="mt-1 text-lg font-bold text-red-600">
                      -{formatNumber(selectedDay.totalOut)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {selectedDay.items.map((item) => {
                    const isIn = item.type === "in";
                    return (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{item.productName}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                            )}
                          </div>
                          <Badge
                            className={
                              isIn
                                ? "shrink-0 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950/40"
                                : "shrink-0 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40"
                            }
                          >
                            {isIn ? (
                              <ArrowUp className="mr-1 h-3 w-3" />
                            ) : (
                              <ArrowDown className="mr-1 h-3 w-3" />
                            )}
                            {isIn ? "Masuk" : "Keluar"}
                          </Badge>
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-sm">
                          <span className={isIn ? "font-bold text-green-600" : "font-bold text-red-600"}>
                            {isIn ? "+" : "-"}
                            {formatNumber(item.quantity)}
                          </span>
                          {!(item.previousStock === 0 && item.newStock === 0) && (
                            <span className="text-xs text-muted-foreground">
                              {formatNumber(item.previousStock)} → {formatNumber(item.newStock)}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
                          <span className="text-muted-foreground">Alasan: </span>
                          {item.reason || "—"}
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{item.adjustedBy || "—"}</span>
                          <span>·</span>
                          <span>{format(item.date, "HH:mm", { locale: dateFnsLocaleId })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${accent}`} />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
